export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const make = searchParams.get('make')
  const year = searchParams.get('year')
  if (!make || !year) return Response.json({ error: 'make and year are required' }, { status: 400 })

  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${encodeURIComponent(year)}?format=json`
  const res = await fetch(url, { next: { revalidate: 86400 } })
  if (!res.ok) return Response.json({ error: 'Failed to fetch models' }, { status: 502 })
  const data = await res.json()
  const models = data.Results.map(r => r.Model_Name).sort()
  return Response.json({ models })
}
