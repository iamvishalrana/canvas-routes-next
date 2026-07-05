import { WTET_PARTICIPANTS, normalizeName } from './wtetParticipants.js'

export const WTET_AWARDS_EVENT_NAME = 'Whips to Eastern Townships'

// Jerry organizes the awards — he's not eligible to win one.
const INELIGIBLE_NAMES = ['jerry']

export const WTET_AWARD_CATEGORIES = [
  {
    id: 'best_energy',
    en: {
      label: 'Most Entertaining Person/Car',
      body: "The \"main character energy\" award. Loud pipes, bigger personality, showed up and instantly became the plot of the day. This is for the car-and-driver combo that brought the chaos — the good kind — and had everyone buzzing at every single stop. Who couldn't you look away from?",
    },
    fr: {
      label: 'La Personne/Voiture la Plus Divertissante',
      body: 'Le prix "énergie de personnage principal". Pot d\'échappement bruyant, personnalité encore plus bruyante — est arrivé et est instantanément devenu le sujet de la journée. Ce prix est pour le duo voiture-conducteur qui a apporté le chaos (le bon genre) et qui mettait tout le monde en effervescence à chaque arrêt. Qui ne pouviez-vous pas quitter des yeux?',
    },
  },
  {
    id: 'most_beautiful',
    en: {
      label: 'Most Beautiful Car',
      body: "The \"okay wow\" award. This one's got nothing to do with horsepower or lap times — it's pure curb appeal. Which car made you stop mid-sentence and just stare? The one that got every phone out at every stop. Vote for the ride that was simply too good-looking to ignore.",
    },
    fr: {
      label: 'La Plus Belle Voiture',
      body: 'Le prix "wow, arrête tout". Aucun rapport avec les chevaux ou les temps au tour — ici, c\'est du pur style. Quelle voiture vous a fait arrêter de parler et juste fixer? Celle qui sortait tous les téléphones à chaque arrêt. Votez pour la voiture trop belle pour être ignorée.',
    },
  },
  {
    id: 'best_driver',
    en: {
      label: 'Best Driver',
      body: "The \"never spilled my coffee\" award. Not the fastest — the smoothest. Who held their line, read the road, and made the whole convoy feel effortless to follow, corner after corner? Vote for the driver you'd trust to drive your own car blindfolded (please don't actually try that).",
    },
    fr: {
      label: 'Meilleur Conducteur',
      body: 'Le prix "n\'a jamais renversé mon café". Pas le plus rapide — le plus fluide. Qui a tenu sa ligne, lu la route, et rendu le convoi facile à suivre, virage après virage? Votez pour le conducteur à qui vous feriez confiance pour conduire votre propre voiture les yeux fermés (n\'essayez pas vraiment ça).',
    },
  },
]

// Fixed discount per category winner — not a top-3 ranking, one prize per category.
export const CATEGORY_DISCOUNT_PCT = {
  best_energy: 40,
  most_beautiful: 25,
  best_driver: 15,
}

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
