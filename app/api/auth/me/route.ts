import { readSession } from "@/lib/auth"

export async function GET() {
  const s = await readSession()
  if (!s) return Response.json({ user: null }, { status: 401 })
  return Response.json({ user: s })
}
