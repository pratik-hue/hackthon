import { readSession } from "@/lib/auth"
import { getDb } from "@/lib/db"

export async function GET() {
  const s = await readSession()
  if (!s || s.role !== "ADMIN") return Response.json({ error: "Unauthorized" }, { status: 401 })
  const db = getDb()
  const [e] = await db.query<any>(`SELECT COUNT(*) AS c FROM expenses WHERE company_id = ?`, [s.cid])
  const [p] = await db.query<any>(
    `SELECT COUNT(*) AS c FROM expense_approvals ea JOIN expenses ex ON ex.id = ea.expense_id WHERE ex.company_id = ? AND ea.status = 'PENDING'`,
    [s.cid],
  )
  const [u] = await db.query<any>(`SELECT COUNT(*) AS c FROM users WHERE company_id = ?`, [s.cid])
  return Response.json({ totalExpenses: e?.c || 0, pendingApprovals: p?.c || 0, employees: u?.c || 0 })
}
