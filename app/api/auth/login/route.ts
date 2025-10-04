import { getDb } from "@/lib/db"
import { verifyPassword } from "@/lib/auth"
import { signSession } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body || {}
    if (!email || !password) return Response.json({ error: "Missing fields" }, { status: 400 })
    const emailNorm = String(email).trim().toLowerCase()
    const db = getDb()
    const [rows] = await db.query<any>(
      `
      SELECT u.id, u.name, u.email, u.password_hash, u.role, u.company_id FROM users u WHERE u.email = ? LIMIT 1
    `,
      [emailNorm],
    )
    const u = (rows as any[])[0]
    if (!u) return Response.json({ error: "Invalid credentials" }, { status: 401 })
    const ok = await verifyPassword(password, u.password_hash)
    if (!ok) return Response.json({ error: "Invalid credentials" }, { status: 401 })
    await signSession({ sub: String(u.id), cid: String(u.company_id), role: u.role, name: u.name, email: u.email })
    return Response.json({ ok: true })
  } catch (e: any) {
    return Response.json({ error: e.message || "Login failed" }, { status: 500 })
  }
}
