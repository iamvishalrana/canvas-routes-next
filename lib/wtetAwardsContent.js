import { WTET_PARTICIPANTS, normalizeName } from './wtetParticipants.js'

export const WTET_AWARDS_EVENT_NAME = 'Whips to Eastern Townships'

// Jerry organizes the awards — he's not eligible to win one.
const INELIGIBLE_NAMES = ['jerry']

export const WTET_AWARD_CATEGORIES = [
  {
    id: 'most_beautiful',
    en: {
      label: 'Most Beautiful Car',
      body: "Forget horsepower and lap times — this one's pure curb appeal. Which car stopped you in your tracks every time it rolled up? Vote for the ride you couldn't stop staring at.",
    },
    fr: {
      label: 'La Plus Belle Voiture',
      body: 'Oubliez les chevaux et les temps au tour — ici, on parle de style pur. Quelle voiture vous a arrêté net à chaque fois qu\'elle arrivait? Votez pour celle que vous ne pouviez pas arrêter de regarder.',
    },
  },
  {
    id: 'best_driver',
    en: {
      label: 'Best Driver',
      body: "Not the fastest — the smoothest. Who held their line, read the road, and made the whole convoy feel effortless to follow? This one's for the driver you trusted completely.",
    },
    fr: {
      label: 'Meilleur Conducteur',
      body: 'Pas le plus rapide — le plus fluide. Qui a tenu sa ligne, lu la route, et rendu le convoi facile à suivre? Ce prix est pour le conducteur en qui vous aviez une confiance totale.',
    },
  },
  {
    id: 'best_energy',
    en: {
      label: 'Car with the Best Energy',
      body: 'Some cars just bring the vibe — the sound, the presence, the way the group lit up every time it pulled in. Which car (and driver) had everyone buzzing at every stop?',
    },
    fr: {
      label: 'La Voiture Avec la Meilleure Énergie',
      body: "Certaines voitures amènent juste l'ambiance — le son, la présence, la façon dont le groupe s'animait à chaque arrivée. Quelle voiture (et quel conducteur) mettait tout le monde en effervescence à chaque arrêt?",
    },
  },
]

// Candidates a given voter is allowed to pick from: everyone except Jerry and
// except themselves (self-voting isn't allowed in any category).
export function getEligibleCandidates(voterName) {
  const voterNorm = normalizeName(voterName)
  return WTET_PARTICIPANTS.filter(p => {
    const n = normalizeName(p.name)
    if (INELIGIBLE_NAMES.includes(n)) return false
    if (n === voterNorm) return false
    return true
  })
}

export function isEligibleCandidateName(name) {
  const n = normalizeName(name)
  if (INELIGIBLE_NAMES.includes(n)) return false
  return WTET_PARTICIPANTS.some(p => normalizeName(p.name) === n)
}
