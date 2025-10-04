import { readSession } from "@/lib/auth"
import { getDb } from "@/lib/db"

export async function GET() {
  const s = await readSession()
  if (!s) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const db = getDb()
  const [rows] = await db.query<any>(
    `
    SELECT 
      ea.expense_id,
      ea.step_runtime_id,
      sr.step_order,
      sr.mode as step_mode,
      e.id, e.category, e.description, e.amount, e.currency_code, e.company_amount, e.company_currency_code,
      u.name as employee_name
    FROM expense_approvals ea
    JOIN approval_steps_runtime sr ON sr.id = ea.step_runtime_id
    JOIN expenses e ON e.id = ea.expense_id
    JOIN users u ON u.id = e.employee_id
    WHERE ea.approver_user_id = ? AND ea.status = 'PENDING'
    ORDER BY e.created_at ASC
  `,
    [s.sub],
  )
  const mapped = (rows as any[]).map((row: any) => ({
    expense: {
      id: row.id,
      category: row.category,
      description: row.description,
      amount: row.amount,
      currency_code: row.currency_code,
      company_amount: row.company_amount,
      company_currency_code: row.company_currency_code,
      employee_name: row.employee_name,
    },
    step_order: row.step_order,
    step_mode: row.step_mode,
    step_runtime_id: row.step_runtime_id,
  }))
  return Response.json({ items: mapped })
}
