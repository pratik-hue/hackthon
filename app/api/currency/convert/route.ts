import { convertCurrency } from "@/lib/currency"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const base = searchParams.get("base")
  const target = searchParams.get("target")
  const amount = Number(searchParams.get("amount") || "0")
  if (!base || !target) return Response.json({ error: "Missing params" }, { status: 400 })
  const res = await convertCurrency(base, target, amount)
  return Response.json(res)
}
