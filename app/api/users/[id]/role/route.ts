import { readSession } from "@/lib/auth"
import { getDb } from "@/lib/db"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const s = await readSession()
  if (!s || s.role !== "ADMIN") return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { role, manager_id } = await req.json()
  if (!role) return Response.json({ error: "Missing role" }, { status: 400 })
  const db = getDb()
  await db.query(`UPDATE users SET role = ?, manager_id = ? WHERE id = ? AND company_id = ?`, [
    role,
    manager_id || null,
    params.id,
    s.cid,
  ])
  return Response.json({ ok: true })
}
