import { getDb, tx } from "@/lib/db"
import { getCurrencyForCountry } from "@/lib/currency"
import { hashPassword } from "@/lib/auth"
import { signSession } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password, company, country } = body || {}
    if (!name || !email || !password || !company || !country) {
      return Response.json({ error: "Missing fields" }, { status: 400 })
    }
    const db = getDb()

    const currency = await getCurrencyForCountry(country)

    const password_hash = await hashPassword(password)

    const result = await tx(async (conn) => {
      const [comp] = await conn.query<any>(
        "INSERT INTO companies (name, country_code, currency_code, manager_is_first_approver) VALUES (?, ?, ?, ?)",
        [company, country, currency.code, 1],
      )
      const companyId = comp.insertId
      const [user] = await conn.query<any>(
        "INSERT INTO users (company_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'ADMIN')",
        [companyId, name, email, password_hash],
      )
      const userId = user.insertId
      return { companyId, userId }
    })

    await signSession({ sub: String(result.userId), cid: String(result.companyId), role: "ADMIN", name, email })
    return Response.json({ ok: true })
  } catch (e: any) {
    if (e?.code === "ER_DUP_ENTRY") {
      return Response.json({ error: "Email already in use" }, { status: 400 })
    }
    return Response.json({ error: e?.message || "Signup failed" }, { status: 500 })
  }
}
