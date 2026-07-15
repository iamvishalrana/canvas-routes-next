// Straight-line waypoint connections between stops — not a traced GPS route
// (unlike WTET's recorded trace), since this route hasn't been driven yet.
// Good enough to show the shape of the day on the overview map.
export const ROUTE_PATH = [
  { lat: 45.4459, lng: -73.6034 },       // Angrignon Mall, LaSalle
  { lat: 45.8957004, lng: -74.1564982 }, // Porte du Nord, Saint-Jérôme
  { lat: 45.68, lng: -75.05 },           // L'Atelier des Deux P, Amherst (approximate)
  { lat: 45.6450, lng: -74.9500 },       // Fairmont Le Château Montebello
  { lat: 45.6514, lng: -74.9438 },       // Chocomotive, Montebello
  { lat: 45.8957004, lng: -74.1564982 }, // Porte du Nord, Saint-Jérôme (return)
]
