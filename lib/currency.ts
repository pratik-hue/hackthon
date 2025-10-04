export type ConversionResult = {
  rate: number
  converted: number
}

export async function convertCurrency(base: string, target: string, amount: number): Promise<ConversionResult> {
  if (base === target) return { rate: 1, converted: amount }
  const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${encodeURIComponent(base)}`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error("Failed to fetch exchange rates")
  const data = await res.json()
  const rate = data?.rates?.[target]
  if (!rate) throw new Error(`No rate from ${base} to ${target}`)
  return { rate, converted: amount * rate }
}

export async function getCurrencyForCountry(countryName: string): Promise<{ code: string; name?: string }> {
  const res = await fetch("https://restcountries.com/v3.1/all?fields=name,currencies", {
    cache: "force-cache",
    next: { revalidate: 60 * 60 * 6 },
  })
  if (!res.ok) throw new Error("Failed to fetch countries")
  const all = await res.json()
  const match = all.find((c: any) => c?.name?.common?.toLowerCase() === countryName.toLowerCase())
  if (!match?.currencies) throw new Error("Currency not found for country")
  const code = Object.keys(match.currencies)[0]
  return { code, name: match.currencies[code]?.name }
}
