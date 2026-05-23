// Cars for Canvas Routes spec sheets
// URL: /spec/[owner]/[car]
// owner: lowercase first name, car: lowercase slug (spaces → hyphens)

const CARS = [
  // Add cars here as received
  // Example:
  // {
  //   owner: 'john',
  //   car: 'porsche-911-gt3',
  //   displayName: 'John',
  //   year: '2023',
  //   make: 'Porsche',
  //   model: '911 GT3',
  //   color: 'Guards Red',
  //   specs: [
  //     { label: 'Engine', value: '4.0L Flat-Six' },
  //     { label: 'Power', value: '502 hp' },
  //     { label: 'Transmission', value: '7-Speed PDK' },
  //     { label: '0–100 km/h', value: '3.4 s' },
  //     { label: 'Top Speed', value: '318 km/h' },
  //   ],
  //   note: 'Optional tagline or note about the car',
  // },
]

export function getCar(owner, car) {
  return CARS.find(c => c.owner === owner && c.car === car) || null
}

export default CARS
