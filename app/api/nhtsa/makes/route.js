export async function GET() {
  const res = await fetch('https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json', {
    next: { revalidate: 86400 }, // cache for 24h — the list barely changes
  })
  if (!res.ok) return Response.json({ error: 'Failed to fetch makes' }, { status: 502 })
  const data = await res.json()
  const makes = data.Results.map(r => r.Make_Name).sort()
  return Response.json({ makes })
}
