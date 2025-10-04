import { readSession } from "@/lib/auth"
import { getDb } from "@/lib/db"

export async function GET() {
  const s = await readSession()
  if (!s) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const db = getDb()
  const items = await db.query<any>(
    `
    SELECT id, spend_date, category, amount, currency_code, company_amount, company_currency_code, status, description 
    FROM expenses WHERE employee_id = ? ORDER BY created_at DESC
  `,
    [s.sub],
  )
  return Response.json({ items })
}
