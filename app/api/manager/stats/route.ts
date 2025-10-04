import { readSession } from "@/lib/auth"
import { getDb } from "@/lib/db"

export async function GET() {
  const s = await readSession()
  if (!s || (s.role !== "MANAGER" && s.role !== "ADMIN"))
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  const db = getDb()
  const [pending] = await db.query<any>(
    `SELECT COUNT(*) AS c FROM expense_approvals ea WHERE ea.approver_user_id = ? AND ea.status = 'PENDING'`,
    [s.sub],
  )
  const [teamMonth] = await db.query<any>(
    `
    SELECT COUNT(*) AS c FROM expenses e 
    JOIN users u ON u.id = e.employee_id 
    WHERE u.manager_id = ? AND MONTH(e.created_at)=MONTH(CURRENT_DATE()) AND YEAR(e.created_at)=YEAR(CURRENT_DATE())
  `,
    [s.sub],
  )
  return Response.json({ pending: pending?.c || 0, teamMonth: teamMonth?.c || 0 })
}
