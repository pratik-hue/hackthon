import { readSession } from "@/lib/auth"
import { tx } from "@/lib/db"

async function evaluateAndProgress(conn: any, expenseId: number) {
  const [expenseRows] = await conn.query<any>(`SELECT * FROM expenses WHERE id = ? FOR UPDATE`, [expenseId])
  const expense = (expenseRows as any[])[0]
  if (!expense || expense.status !== "PENDING") return

  const [steps] = await conn.query<any>(
    `SELECT * FROM approval_steps_runtime WHERE expense_id = ? ORDER BY step_order ASC`,
    [expenseId],
  )

  async function finalizeApprove() {
    await conn.query(`UPDATE expenses SET status = 'APPROVED', decided_at = NOW() WHERE id = ?`, [expenseId])
    await conn.query(
      `UPDATE expense_approvals SET status = IF(status='BLOCKED','SKIPPED',status) WHERE expense_id = ?`,
      [expenseId],
    )
  }

  // pull rule + global approval stats (for hybrid conditions)
  let rule: any = null
  let globalStats = { total: 0, approved: 0, pct: 0 }
  if (expense.rule_id) {
    const [ruleRows] = await conn.query<any>(`SELECT * FROM approval_rules WHERE id = ?`, [expense.rule_id])
    rule = (ruleRows as any[])[0] || null
    const [allApprovals] = await conn.query<any>(
      `SELECT status FROM expense_approvals WHERE expense_id = ?`,
      [expenseId],
    )
    const totalA = (allApprovals as any[]).length
    const approvedA = (allApprovals as any[]).filter((a: any) => a.status === "APPROVED").length
    globalStats = { total: totalA, approved: approvedA, pct: totalA ? (approvedA / totalA) * 100 : 0 }
  }

  if (rule?.specific_approver_user_id) {
    const [yes] = await conn.query<any>(
      `
      SELECT 1 FROM expense_approvals 
      WHERE expense_id = ? AND approver_user_id = ? AND status = 'APPROVED' LIMIT 1
    `,
      [expenseId, rule.specific_approver_user_id],
    )
    // OR branch is trivially satisfied if specific approver already approved
    if ((yes as any[]).length && (rule.hybrid_mode === "OR" || rule.hybrid_mode === "NONE")) {
      await finalizeApprove()
      return
    }
  }

  if (rule && rule.hybrid_mode === "OR" && Number(rule.percentage_threshold || 0) > 0) {
    if (globalStats.pct >= Number(rule.percentage_threshold)) {
      await finalizeApprove()
      return
    }
  }

  // Find current step = first step with any PENDING approvals
  const [currentStepRows] = await conn.query<any>(
    `
    SELECT s.* FROM approval_steps_runtime s
    WHERE s.expense_id = ?
    AND EXISTS(SELECT 1 FROM expense_approvals ea WHERE ea.step_runtime_id = s.id AND ea.status = 'PENDING')
    ORDER BY s.step_order ASC
    LIMIT 1
  `,
    [expenseId],
  )
  const currentStep = (currentStepRows as any[])[0]

  if (!currentStep) {
    // No pending step: decide by hybrid rule if present, else approve.
    if (!rule || rule.hybrid_mode === "NONE" || rule.hybrid_mode === "OR") {
      // For NONE or OR, reaching here means all step conditions are satisfied -> approve
      await finalizeApprove()
      return
    }

    if (rule.hybrid_mode === "AND") {
      let ok = true
      // require specific approver if configured
      if (rule.specific_approver_user_id) {
        const [yes] = await conn.query<any>(
          `
          SELECT 1 FROM expense_approvals 
          WHERE expense_id = ? AND approver_user_id = ? AND status = 'APPROVED' LIMIT 1
        `,
          [expenseId, rule.specific_approver_user_id],
        )
        if (!(yes as any[]).length) ok = false
      }
      // require percentage threshold if configured
      if (Number(rule.percentage_threshold || 0) > 0) {
        if (globalStats.pct < Number(rule.percentage_threshold)) ok = false
      }

      if (ok) {
        await finalizeApprove()
      } else {
        // In strict AND, if overall conditions aren't met when steps are done, mark rejected.
        await conn.query(`UPDATE expenses SET status = 'REJECTED', decided_at = NOW() WHERE id = ?`, [expenseId])
      }
    }
    return
  }

  const [approvals] = await conn.query<any>(`SELECT * FROM expense_approvals WHERE step_runtime_id = ?`, [currentStep.id])
  const total = (approvals as any[]).length
  const approved = (approvals as any[]).filter((a: any) => a.status === "APPROVED").length
  const rejected = (approvals as any[]).some((a: any) => a.status === "REJECTED")

  // If any rejection in step -> reject expense immediately
  if (rejected) {
    await conn.query(`UPDATE expenses SET status = 'REJECTED', decided_at = NOW() WHERE id = ?`, [expenseId])
    return
  }

  const mode = currentStep.mode as "ALL" | "PERCENTAGE"
  const threshold = Number(currentStep.threshold || 100)
  const percentageApproved = total ? (approved / total) * 100 : 0
  const stepSatisfied = mode === "ALL" ? approved === total : percentageApproved >= threshold

  if (!stepSatisfied) return // wait for more approvals

  // Move to next step or finish
  const [next] = await conn.query<any>(
    `
    SELECT * FROM approval_steps_runtime WHERE expense_id = ? AND step_order = ? LIMIT 1
  `,
    [expenseId, currentStep.step_order + 1],
  )

  if (!(next as any[]).length) {
    // last step satisfied -> finalize via hybrid logic (handled below in no-currentStep branch)
    // Trigger evaluation again to pass through the "no current step" hybrid finalization:
    const [allPending] = await conn.query<any>(
      `SELECT 1 FROM expense_approvals ea WHERE ea.expense_id = ? AND ea.status = 'PENDING' LIMIT 1`,
      [expenseId],
    )
    if (!(allPending as any[]).length) {
      // Re-run to hit the no-currentStep path for hybrid finalization
      await evaluateAndProgress(conn, expenseId)
    }
    return
  }

  // Unblock next step approvals (set from BLOCKED to PENDING)
  await conn.query(`UPDATE expense_approvals SET status = 'PENDING' WHERE step_runtime_id = ? AND status = 'BLOCKED'`, [
    (next as any[])[0].id,
  ])
}

export async function POST(req: Request, { params }: { params: { expenseId: string } }) {
  const s = await readSession()
  if (!s) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { action, comment } = await req.json()
  if (!["APPROVE", "REJECT"].includes(action)) return Response.json({ error: "Invalid action" }, { status: 400 })

  try {
    await tx(async (conn) => {
      // The approver must have a PENDING row
      const [rowRows] = await conn.query<any>(
        `
        SELECT ea.* FROM expense_approvals ea 
        JOIN expenses e ON e.id = ea.expense_id
        WHERE ea.expense_id = ? AND ea.approver_user_id = ? AND ea.status = 'PENDING'
        LIMIT 1
      `,
        [params.expenseId, s.sub],
      )
      const row = (rowRows as any[])[0]
      if (!row) throw new Error("No pending approval found")

      await conn.query(`UPDATE expense_approvals SET status = ?, comment = ?, decided_at = NOW() WHERE id = ?`, [
        action === "APPROVE" ? "APPROVED" : "REJECTED",
        comment || null,
        row.id,
      ])

      await evaluateAndProgress(conn, Number(params.expenseId))
    })

    return Response.json({ ok: true })
  } catch (e: any) {
    return Response.json({ error: e.message || "Action failed" }, { status: 500 })
  }
}
