export async function GET() {
  try {
    const res = await fetch('https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json', {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return Response.json({ error: 'Failed to fetch makes' }, { status: 502 })
    const data = await res.json()
    const makes = (data.Results || []).map(r => r.Make_Name).sort()
    return Response.json({ makes })
  } catch {
    return Response.json({ error: 'Failed to fetch makes' }, { status: 502 })
  }
}
