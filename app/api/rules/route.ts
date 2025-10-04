import { readSession } from "@/lib/auth"
import { getDb, tx } from "@/lib/db"

export async function GET() {
  const s = await readSession()
  if (!s || s.role !== "ADMIN") return Response.json({ error: "Unauthorized" }, { status: 401 })
  const db = getDb()
  const [users] = await db.query<any>(`SELECT id, name, role FROM users WHERE company_id = ? ORDER BY name`, [s.cid])
  const [rules] = await db.query<any>(
    `
    SELECT r.*, 
      (SELECT COUNT(*) FROM approval_steps st WHERE st.rule_id = r.id) AS steps_count
    FROM approval_rules r WHERE r.company_id = ? ORDER BY r.min_amount ASC
  `,
    [s.cid],
  )

  const detailed = []
  for (const r of rules as any[]) {
    const [steps] = await db.query<any>(`SELECT * FROM approval_steps WHERE rule_id = ? ORDER BY step_order ASC`, [r.id])
    const stepSummary = await Promise.all(
      (steps as any[]).map(async (st: any) => {
        const [approvers] = await db.query<any>(
          `SELECT a.approver_user_id, u.name FROM approval_step_approvers a JOIN users u ON u.id = a.approver_user_id WHERE a.step_id = ?`,
          [st.id],
        )
        return `#${st.step_order + 1}:${st.mode}${st.mode === "PERCENTAGE" ? `(${st.threshold}%)` : ""} [${(approvers as any[])
          .map((a: any) => a.name)
          .join(", ")}]`
      }),
    )
    detailed.push({ ...r, step_summary: stepSummary.join(" → ") })
  }

  return Response.json({ rules: detailed, users })
}

export async function POST(req: Request) {
  const s = await readSession()
  if (!s || s.role !== "ADMIN") return Response.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const {
    name,
    min_amount,
    max_amount,
    percentage_threshold,
    specific_approver_user_id,
    hybrid_mode,
    manager_is_first_approver,
    steps,
  } = body || {}

  if (!name || min_amount == null || max_amount == null || !Array.isArray(steps)) {
    return Response.json({ error: "Invalid input" }, { status: 400 })
  }

  try {
    await tx(async (conn) => {
      const [r] = await conn.query<any>(
        `
        INSERT INTO approval_rules (company_id, name, min_amount, max_amount, percentage_threshold, specific_approver_user_id, hybrid_mode, manager_is_first_approver, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `,
        [
          s.cid,
          name,
          min_amount,
          max_amount,
          percentage_threshold || 0,
          specific_approver_user_id || null,
          hybrid_mode || "NONE",
          manager_is_first_approver ? 1 : 0,
        ],
      )
      const ruleId = r.insertId

      for (let i = 0; i < (steps as any[]).length; i++) {
        const st = (steps as any[])[i]
        const [step] = await conn.query<any>(
          `INSERT INTO approval_steps (rule_id, step_order, mode, threshold) VALUES (?, ?, ?, ?)`,
          [ruleId, i, st.mode || "ALL", st.threshold || 100],
        )
        for (const uid of (st.approvers || []) as any[]) {
          await conn.query(`INSERT INTO approval_step_approvers (step_id, approver_user_id) VALUES (?, ?)`, [
            step.insertId,
            uid,
          ])
        }
      }
    })
    return Response.json({ ok: true })
  } catch (e: any) {
    return Response.json({ error: e.message || "Failed to save rule" }, { status: 500 })
  }
}
