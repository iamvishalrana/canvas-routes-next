export const WTET_PARTICIPANTS = [
  { name: 'Alain Meunier',          car: '2019 Chevrolet Corvette Grand Sport',          photo: '/WTET/Alain-Meunier.jpg' },
  { name: 'Alain Sahakian',         car: '2023 Toyota Supra',                            photo: '/WTET/Alain-Sahakian.jpeg' },
  { name: 'Alexandre Boutin',       car: '2026 Audi RS6 Performance',                    photo: '/WTET/Alex-Boutin.jpeg' },
  { name: 'Bernard Attard',         car: '1973 Dodge Challenger',                        photo: '/WTET/Bernard-Attard.jpeg' },
  { name: 'Elie Massuda',           car: '2006 Porsche Boxster',                         photo: null },
  { name: 'Frederic Lefebvre',      car: '2020 Audi RS3',                                photo: '/WTET/Fred-Lefebvre.jpeg' },
  { name: 'Jean-François Rouette',  car: '2021 Audi TTRS',                               photo: null },
  { name: 'Jean-Philippe Remon',    car: '2011 BMW 135i',                                photo: '/WTET/Jean-Philippe.png' },
  { name: 'Jerry',                  car: null,                                           photo: null },
  { name: 'Louis Guindon',          car: '2023 Genesis G70 3.3T',                        photo: '/WTET/Louis-Guindon.png' },
  { name: 'Louis Philippe Mauger',  car: '2020 BMW M2 Compétition',                     photo: '/WTET/Louis-Mauger.jpg' },
  { name: 'Michel Robert',          car: '2008 Porsche Boxster',                         photo: '/WTET/Michel-Robert.jpeg' },
  { name: 'Raphael Lacoste',        car: '2011 Ferrari 458 Italia',                      photo: null },
  { name: 'Tanya Ghingold',         car: '2012 Porsche 718 Cayman S Black Edition',     photo: '/WTET/Tanya-Ghingold.png' },
  { name: 'Tino Guerrier',          car: '2021 Mercedes-Benz C63 S Coupé',              photo: null },
  { name: 'Yvon Maggi',             car: '2014 Porsche 911 Turbo S',                     photo: '/WTET/Yvon-Maggi.png' },
]

// Match a registrant name to their WTET photo using last-name fuzzy matching
export function findWtetPhoto(name) {
  if (!name) return null
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  const nameParts = norm(name).split(/\s+/)
  const lastName = nameParts[nameParts.length - 1]

  // Exact full-name match first
  const exact = WTET_PARTICIPANTS.find(p => norm(p.name) === norm(name))
  if (exact) return exact.photo

  // Last-name match
  const byLast = WTET_PARTICIPANTS.find(p => {
    const parts = norm(p.name).split(/\s+/)
    return parts[parts.length - 1] === lastName
  })
  return byLast?.photo ?? null
}
