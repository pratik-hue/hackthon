import { readSession } from "@/lib/auth"
import { getDb, tx } from "@/lib/db"
import { convertCurrency } from "@/lib/currency"

async function findApplicableRule(db: ReturnType<typeof getDb>, companyId: string, amountCompany: number) {
  const [rules] = await db.query<any>(
    `SELECT * FROM approval_rules WHERE company_id = ? AND active = 1 ORDER BY min_amount ASC`,
    [companyId],
  )
  for (const r of rules as any[]) {
    if (amountCompany >= r.min_amount && (r.max_amount === 0 || amountCompany <= r.max_amount)) return r
  }
  return null
}

async function getCompany(db: ReturnType<typeof getDb>, companyId: string) {
  const [comp] = await db.query<any>(`SELECT * FROM companies WHERE id = ?`, [companyId])
  return (comp as any[])[0]
}

export async function POST(req: Request) {
  const s = await readSession()
  if (!s || s.role === "ADMIN") return Response.json({ error: "Unauthorized" }, { status: 401 })
  const db = getDb()
  try {
    const body = await req.json()
    const { amount, currency, category, description, date, receiptBase64, ocrText } = body || {}
    if (!amount || !currency || !date) return Response.json({ error: "Missing fields" }, { status: 400 })

    const comp = await getCompany(db, s.cid)
    const conv = await convertCurrency(currency, comp.currency_code, amount)

    const result = await tx(async (conn) => {
      const [ex] = await conn.query<any>(
        `
        INSERT INTO expenses (company_id, employee_id, amount, currency_code, company_amount, company_currency_code, exchange_rate, category, description, spend_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        [
          s.cid,
          s.sub,
          amount,
          currency,
          conv.converted,
          comp.currency_code,
          conv.rate,
          category || "General",
          description || "",
          date,
        ],
      )
      const expenseId = ex.insertId
      if (receiptBase64 || ocrText) {
        await conn.query(`INSERT INTO expense_receipts (expense_id, image_base64, ocr_text) VALUES (?, ?, ?)`, [
          expenseId,
          receiptBase64 || null,
          ocrText || null,
        ])
      }

      // Determine rule and seed approvals
      const rule = await findApplicableRule(getDb(), s.cid, conv.converted)
      const ruleId = rule?.id || null

      await conn.query(`UPDATE expenses SET rule_id = ? WHERE id = ?`, [ruleId, expenseId])

      // If manager first approver
      let stepOrder = 0
      if (rule?.manager_is_first_approver || comp.manager_is_first_approver) {
        const [emp] = await conn.query<any>(`SELECT manager_id FROM users WHERE id = ?`, [s.sub])
        const managerId = (emp as any[])[0]?.manager_id || null
        if (managerId) {
          const [step] = await conn.query<any>(
            `INSERT INTO approval_steps_runtime (expense_id, step_order, mode, threshold) VALUES (?, ?, 'ALL', 100)`,
            [expenseId, stepOrder],
          )
          await conn.query(
            `INSERT INTO expense_approvals (expense_id, step_runtime_id, approver_user_id, status) VALUES (?, ?, ?, 'PENDING')`,
            [expenseId, step.insertId, managerId],
          )
          stepOrder++
        }
      }

      if (rule) {
        const [steps] = await conn.query<any>(`SELECT * FROM approval_steps WHERE rule_id = ? ORDER BY step_order ASC`, [
          rule.id,
        ])
        for (const st of steps as any[]) {
          const [srt] = await conn.query<any>(
            `INSERT INTO approval_steps_runtime (expense_id, step_order, mode, threshold) VALUES (?, ?, ?, ?)`,
            [expenseId, stepOrder, st.mode, st.threshold || 100],
          )
          const [approvers] = await conn.query<any>(
            `SELECT approver_user_id FROM approval_step_approvers WHERE step_id = ?`,
            [st.id],
          )
          for (const a of approvers as any[]) {
            // First step becomes PENDING; future steps BLOCKED
            const status = stepOrder === 0 ? "PENDING" : "BLOCKED"
            await conn.query(
              `INSERT INTO expense_approvals (expense_id, step_runtime_id, approver_user_id, status) VALUES (?, ?, ?, ?)`,
              [expenseId, srt.insertId, a.approver_user_id, status],
            )
          }
          stepOrder++
        }
      }

      return { expenseId }
    })

    return Response.json({ ok: true, id: result.expenseId })
  } catch (e: any) {
    return Response.json({ error: e.message || "Failed to submit" }, { status: 500 })
  }
}

export async function GET() {
  const s = await readSession()
  if (!s) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const db = getDb()
  const [items] = await db.query<any>(
    `
    SELECT e.* FROM expenses e WHERE e.company_id = ? ORDER BY e.created_at DESC
  `,
    [s.cid],
  )
  return Response.json({ items })
}
