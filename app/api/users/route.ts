import { readSession, hashPassword } from "@/lib/auth"
import { getDb } from "@/lib/db"

export async function GET() {
  const s = await readSession()
  if (!s || s.role !== "ADMIN") return Response.json({ error: "Unauthorized" }, { status: 401 })
  const db = getDb()
  const [items] = await db.query<any>(
    `
    SELECT u.id, u.name, u.email, u.role, u.manager_id, m.name as manager_name
    FROM users u
    LEFT JOIN users m ON m.id = u.manager_id
    WHERE u.company_id = ?
    ORDER BY u.name
  `,
    [s.cid],
  )
  return Response.json({ items })
}

export async function POST(req: Request) {
  const s = await readSession()
  if (!s || s.role !== "ADMIN") return Response.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { name, email, password, role, manager_id } = body || {}
  if (!name || !email || !password || !role) return Response.json({ error: "Missing fields" }, { status: 400 })
  const db = getDb()
  const emailNorm = String(email).trim().toLowerCase()
  const [exist] = await db.query<any>(`SELECT id FROM users WHERE email = ? AND company_id = ?`, [emailNorm, s.cid])
  if ((exist as any[]).length) return Response.json({ error: "Email already exists" }, { status: 400 })
  const password_hash = await hashPassword(password)
  await db.query(
    `INSERT INTO users (company_id, name, email, password_hash, role, manager_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [s.cid, name, emailNorm, password_hash, role, manager_id || null],
  )
  return Response.json({ ok: true })
}
