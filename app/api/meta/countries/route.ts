export async function GET() {
  const res = await fetch("https://restcountries.com/v3.1/all?fields=name", { next: { revalidate: 60 * 60 * 12 } })
  if (!res.ok) return Response.json({ countries: [] })
  const data = await res.json()
  const countries = data
    .map((c: any) => ({ name: c.name.common }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name))
  return Response.json({ countries })
}
