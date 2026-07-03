export const WTET_EVENT_NAME = 'Whips to Eastern Townships — July 5, 2026'

// Default fallback if the admin hasn't set a cutoff via /admin/wtet — July 3, 2026, 6:00 PM Montreal time (EDT, UTC-4)
export const WTET_LUNCH_DEFAULT_CUTOFF = '2026-07-03T18:00:00-04:00'

// Auberge & Restaurant McGowan — curated lunch menu for July 5, 2026
export const WTET_LUNCH_OPTIONS = [
  { id: 'ribs', name: 'Côtes levées porc, sauce bourbon et érable, frites et salade', description: 'Pork ribs with bourbon maple sauce, fries and salad' },
  { id: 'fish_and_chips', name: 'Fish and chips, frites et salade', description: 'Fish and chips, fries and salad' },
  { id: 'cauliflower_tao', name: 'Chou-fleur tao (végé), sur riz et légumes', description: 'Cauliflower tao (vegetarian), on rice and vegetables' },
  { id: 'chicken_breast', name: 'Poitrine de poulet marinée et grillée, herbes et citron', description: 'Marinated and grilled chicken breast, herbs and lemon' },
]

// wtet_lunch moved from a single {dish_id, dish_name, selected_at} object to an
// array (one entry per person) when lunch became per-passenger. Normalize old
// single-object rows saved before that change so every reader gets an array.
export function normalizeWtetLunch(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  return [{ name: null, ...raw }]
}

export const WTET_WAIVER_TEXT = `PARTICIPANT LIABILITY WAIVER & RELEASE OF CLAIMS
Whips to Eastern Townships Road Trip — July 5, 2026
Montreal to Eastern Townships — Private Invite-Only Convoy

PLEASE READ THIS DOCUMENT CAREFULLY BEFORE PARTICIPATING. BY SIGNING BELOW, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY ALL TERMS SET FORTH IN THIS WAIVER.

1. Parties
This Waiver and Release of Claims ("Agreement") is entered into between Événements Canvas Routes Inc. / Canvas Routes Events Inc. ("Organizer") and the undersigned participant ("Participant") for participation in the Whips to Eastern Townships Road Trip on July 5, 2026, departing from Montreal and concluding at Auberge McGowan (the "Event").

2. Event Description & What Is Included
Événements Canvas Routes Inc. is providing the following as part of the Event at no additional cost to the Participant beyond the registration fee:
- A curated convoy through scenic Eastern Townships backroads led by Vishal Rana (Jerry)
- A private winery tasting experience at Vignoble Domaine du Brésée, Dunham
- A premium lunch at Auberge McGowan, overlooking Lac Memphremagog
- Route navigation support via Velox convoy application

3. What Is Not Included
The following are expressly not covered or provided by Événements Canvas Routes Inc. and remain the sole responsibility of the Participant:
- Fuel costs for the Participant's vehicle
- Parking fees at any location outside of the reserved group parking arrangements
- Any personal activities, shops, or experiences chosen independently
- Any alcohol consumed at the winery tasting or at any other stop — Participant is solely responsible for their fitness to drive after consuming alcohol, and Canvas Routes strongly requires a designated sober driver for any vehicle in which alcohol is consumed
- Vehicle insurance or any other form of insurance coverage
- Mechanical breakdowns, towing, or roadside assistance
- Any damage to the Participant's vehicle, personal property, or third-party property
- Medical or emergency expenses arising from participation
- Any fines, tickets, or penalties resulting from the Participant's driving conduct

4. Assumption of Risk
The Participant acknowledges and understands that participation in the Event involves inherent risks, including but not limited to:
- Vehicle accidents, collisions, or mechanical failures
- Road hazards including debris, poor road conditions, construction, and adverse weather
- Personal injury, disability, or death
- Damage to or loss of personal property or vehicle
- Actions of other drivers, participants, or third parties not affiliated with Événements Canvas Routes Inc.
- Acts of God or unforeseeable circumstances
- Wildlife on roadways or rural road conditions
- Risks associated with the winery tasting, alcohol consumption, or any third-party venue visited during the Event
- Uneven or unpaved parking surfaces at any venue along the route

The Participant voluntarily assumes all risks associated with participation in the Event, whether or not such risks are listed above.

5. Release of Liability
In consideration of being permitted to participate in the Event, the Participant, on behalf of themselves, their heirs, executors, administrators, and assigns, hereby releases, waives, discharges, and covenants not to sue Événements Canvas Routes Inc. / Canvas Routes Events Inc., its founder Vishal Rana (Jerry), organizers, volunteers, partners, and affiliated venues including Vignoble Domaine du Brésée and Auberge McGowan (collectively "Released Parties") from any and all claims, demands, actions, causes of action, or liability of any kind arising out of or in connection with participation in the Event, including claims arising from the negligence of the Released Parties.

6. Participant Responsibilities
The Participant agrees to:
- Operate their vehicle safely and in full accordance with the Highway Safety Code of Quebec (Code de la sécurité routière) and all applicable traffic laws at all times
- Maintain valid vehicle registration, automobile insurance, and a valid driver's licence for the duration of the Event
- Refrain from racing, aggressive driving, excessive speeding, drifting, revving, or burnouts at any point during the Event
- Follow all instructions and route directions provided by Événements Canvas Routes Inc. organizers
- Download and activate the Velox convoy application prior to departure
- Not consume alcohol if they will be driving for any portion of the remaining Event; ensure a sober designated driver is present in any vehicle where alcohol is consumed
- Respect all participants, venues, staff, and third parties
- Accept full responsibility for any damage caused by their vehicle to property, other vehicles, or persons
- Not participate if under the influence of alcohol, drugs, prescription medication that impairs driving, or any other impairing substance at the start of the Event
- Keep emergency contact Vishal Rana (Jerry) at 514-437-3437 reachable at all times during the Event

7. Vehicle & Insurance Requirements
The Participant confirms that:
- Their vehicle is covered by valid automobile insurance as required by the laws of the Province of Quebec
- Their vehicle is in safe and roadworthy mechanical condition for highway and backroad driving
- They hold a valid driver's licence appropriate for the vehicle being operated
- Événements Canvas Routes Inc. does not provide, arrange, or extend any insurance coverage of any kind to participants, passengers, or vehicles
- Any damage, loss, or liability related to the Participant's vehicle remains solely the responsibility of the Participant and their insurer

8. Passengers
If the Participant is bringing one or more passengers:
- The Participant is solely responsible for the safety and conduct of all passengers in their vehicle throughout the entire Event
- All passengers must be 18 years of age or older unless the Participant accepts full parental or guardian responsibility in writing
- The Participant confirms their vehicle is insured to carry the number of passengers declared
- Événements Canvas Routes Inc. assumes no liability whatsoever for passengers, including minors

9. Alcohol & Third-Party Venues
The Participant acknowledges and agrees that:
- Événements Canvas Routes Inc. assumes no liability for any illness, allergic reaction, injury, or adverse effect arising from food, beverages, or alcohol consumed at any venue during the Event
- Alcohol tasting at Vignoble Domaine du Brésée is entirely optional and undertaken at the Participant's own discretion and risk
- The Participant is solely responsible for ensuring they do not drive while impaired, and for arranging a sober designated driver if alcohol is consumed
- The Participant is solely responsible for disclosing any food allergies or dietary restrictions directly to Canvas Routes prior to the Event

10. Indemnification
The Participant agrees to indemnify, defend, and hold harmless the Released Parties from and against any and all claims, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or resulting from the Participant's participation in the Event, including but not limited to any claim arising from the Participant's negligence, reckless conduct, or violation of applicable laws.

11. Media Release
The Participant grants Événements Canvas Routes Inc. / Canvas Routes Events Inc. permission to photograph, film, and record the Participant and their vehicle during the Event, and to use such images and recordings for promotional, social media, and marketing purposes without compensation. The Participant may opt out of media use by notifying the Organizer in writing prior to the Event.

12. Route Modifications & Cancellations
Événements Canvas Routes Inc. reserves the right to modify, delay, or cancel any portion of the Event route, stops, or schedule due to weather, road conditions, safety concerns, or other circumstances beyond the Organizer's control. No refunds will be issued for changes made on safety grounds.

13. Governing Law
This Agreement shall be governed by and construed in accordance with the laws of the Province of Quebec, Canada. Any dispute arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the courts of the Province of Quebec.

14. Severability
If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.

15. Entire Agreement
This Agreement constitutes the entire agreement between the Participant and Événements Canvas Routes Inc. with respect to the subject matter hereof and supersedes all prior agreements, understandings, and representations.

BY SIGNING BELOW, THE PARTICIPANT CONFIRMS THAT THEY HAVE READ AND UNDERSTOOD THIS WAIVER IN ITS ENTIRETY AND VOLUNTARILY AGREE TO ITS TERMS.`

export const WTET_WAIVER_TEXT_FR = `DÉCHARGE DE RESPONSABILITÉ ET RENONCIATION À RECOURS DU PARTICIPANT
Road Trip Whips to Eastern Townships — 5 juillet 2026
Montréal vers les Cantons-de-l'Est — Convoi privé sur invitation seulement

VEUILLEZ LIRE ATTENTIVEMENT CE DOCUMENT AVANT DE PARTICIPER. EN SIGNANT CI-DESSOUS, VOUS RECONNAISSEZ AVOIR LU, COMPRIS ET ACCEPTÉ D'ÊTRE LIÉ PAR TOUTES LES CONDITIONS ÉNONCÉES DANS LA PRÉSENTE DÉCHARGE.

1. Parties
La présente décharge et renonciation à recours (l'« Entente ») est conclue entre Événements Canvas Routes Inc. / Canvas Routes Events Inc. (l'« Organisateur ») et le participant soussigné (le « Participant ») pour sa participation au road trip Whips to Eastern Townships du 5 juillet 2026, avec départ de Montréal et arrivée à l'Auberge McGowan (l'« Événement »).

2. Description de l'Événement et ce qui est inclus
Événements Canvas Routes Inc. fournit ce qui suit dans le cadre de l'Événement, sans frais supplémentaires au-delà des frais d'inscription :
- Un convoi organisé à travers les routes secondaires pittoresques des Cantons-de-l'Est, mené par Vishal Rana (Jerry)
- Une expérience privée de dégustation au Vignoble Domaine du Brésée, à Dunham
- Un déjeuner haut de gamme à l'Auberge McGowan, avec vue sur le lac Memphrémagog
- Un soutien à la navigation en convoi via l'application Velox

3. Ce qui n'est pas inclus
Ce qui suit n'est expressément pas couvert ni fourni par Événements Canvas Routes Inc. et demeure sous la seule responsabilité du Participant :
- Les frais de carburant du véhicule du Participant
- Les frais de stationnement à tout endroit à l'extérieur des arrangements de stationnement de groupe réservés
- Toute activité, boutique ou expérience personnelle choisie de façon indépendante
- Tout alcool consommé lors de la dégustation au vignoble ou à tout autre arrêt — le Participant est seul responsable de son aptitude à conduire après avoir consommé de l'alcool, et Canvas Routes exige fortement la présence d'un conducteur désigné sobre pour tout véhicule où de l'alcool est consommé
- L'assurance du véhicule ou toute autre forme de couverture d'assurance
- Les pannes mécaniques, le remorquage ou l'assistance routière
- Tout dommage au véhicule du Participant, à ses biens personnels ou aux biens de tiers
- Les frais médicaux ou d'urgence découlant de la participation
- Toute amende, contravention ou pénalité résultant de la conduite du Participant

4. Acceptation des risques
Le Participant reconnaît et comprend que la participation à l'Événement comporte des risques inhérents, incluant notamment :
- Les accidents de véhicule, collisions ou défaillances mécaniques
- Les dangers routiers, incluant les débris, le mauvais état des routes, les travaux de construction et les conditions météorologiques défavorables
- Les blessures corporelles, l'invalidité ou le décès
- Les dommages ou la perte de biens personnels ou du véhicule
- Les actions d'autres conducteurs, participants ou tiers non affiliés à Événements Canvas Routes Inc.
- Les cas de force majeure ou circonstances imprévisibles
- La faune sur les routes ou les conditions des routes rurales
- Les risques associés à la dégustation au vignoble, à la consommation d'alcool ou à tout autre lieu tiers visité pendant l'Événement
- Les surfaces de stationnement inégales ou non pavées à tout lieu le long du parcours

Le Participant assume volontairement tous les risques associés à sa participation à l'Événement, que ces risques soient énumérés ci-dessus ou non.

5. Renonciation à recours
En contrepartie d'être autorisé à participer à l'Événement, le Participant, en son nom et au nom de ses héritiers, exécuteurs testamentaires, administrateurs et ayants droit, libère, renonce à recours, décharge et s'engage à ne pas poursuivre Événements Canvas Routes Inc. / Canvas Routes Events Inc., son fondateur Vishal Rana (Jerry), les organisateurs, bénévoles, partenaires et lieux affiliés, incluant le Vignoble Domaine du Brésée et l'Auberge McGowan (collectivement les « Parties libérées »), de toute réclamation, demande, action, cause d'action ou responsabilité de quelque nature découlant de ou liée à la participation à l'Événement, incluant les réclamations découlant de la négligence des Parties libérées.

6. Responsabilités du Participant
Le Participant s'engage à :
- Conduire son véhicule de façon sécuritaire et en pleine conformité avec le Code de la sécurité routière du Québec et toutes les lois de la circulation applicables en tout temps
- Maintenir une immatriculation valide de son véhicule, une assurance automobile valide et un permis de conduire valide pendant toute la durée de l'Événement
- S'abstenir de faire la course, de conduire de façon agressive, de rouler à vitesse excessive, de faire des dérapages, d'accélérer bruyamment ou des « burnouts » en tout temps pendant l'Événement
- Suivre toutes les instructions et directions de parcours données par les organisateurs d'Événements Canvas Routes Inc.
- Télécharger et activer l'application de convoi Velox avant le départ
- Ne pas consommer d'alcool s'il doit conduire pour toute portion restante de l'Événement; s'assurer qu'un conducteur désigné sobre soit présent dans tout véhicule où de l'alcool est consommé
- Respecter tous les participants, lieux, membres du personnel et tiers
- Accepter l'entière responsabilité de tout dommage causé par son véhicule à des biens, à d'autres véhicules ou à des personnes
- Ne pas participer s'il est sous l'influence de l'alcool, de drogues, de médicaments sur ordonnance affectant la capacité de conduire, ou de toute autre substance affectant les facultés, au début de l'Événement
- Garder le contact d'urgence Vishal Rana (Jerry) au 514-437-3437 joignable en tout temps pendant l'Événement

7. Exigences relatives au véhicule et à l'assurance
Le Participant confirme que :
- Son véhicule est couvert par une assurance automobile valide, tel que requis par les lois de la province de Québec
- Son véhicule est en bon état mécanique et sécuritaire pour la conduite sur autoroute et sur route secondaire
- Il détient un permis de conduire valide et approprié pour le véhicule utilisé
- Événements Canvas Routes Inc. ne fournit, n'organise ni n'étend aucune couverture d'assurance, de quelque nature que ce soit, aux participants, passagers ou véhicules
- Tout dommage, perte ou responsabilité liée au véhicule du Participant demeure sous la seule responsabilité du Participant et de son assureur

8. Passagers
Si le Participant amène un ou plusieurs passagers :
- Le Participant est seul responsable de la sécurité et de la conduite de tous les passagers dans son véhicule pendant toute la durée de l'Événement
- Tous les passagers doivent être âgés de 18 ans ou plus, à moins que le Participant n'accepte par écrit l'entière responsabilité parentale ou de tuteur
- Le Participant confirme que son véhicule est assuré pour transporter le nombre de passagers déclaré
- Événements Canvas Routes Inc. n'assume aucune responsabilité, de quelque nature que ce soit, à l'égard des passagers, y compris les mineurs

9. Alcool et lieux tiers
Le Participant reconnaît et accepte que :
- Événements Canvas Routes Inc. n'assume aucune responsabilité pour toute maladie, réaction allergique, blessure ou effet indésirable découlant de la nourriture, des boissons ou de l'alcool consommés à tout lieu pendant l'Événement
- La dégustation d'alcool au Vignoble Domaine du Brésée est entièrement facultative et se fait à la seule discrétion et au seul risque du Participant
- Le Participant est seul responsable de s'assurer de ne pas conduire avec les facultés affaiblies, et d'organiser un conducteur désigné sobre si de l'alcool est consommé
- Le Participant est seul responsable de divulguer à Canvas Routes, avant l'Événement, toute allergie alimentaire ou restriction alimentaire

10. Indemnisation
Le Participant s'engage à indemniser, défendre et tenir indemnes les Parties libérées contre toute réclamation, dommage, perte, coût et dépense (incluant les honoraires juridiques raisonnables) découlant de ou résultant de la participation du Participant à l'Événement, incluant notamment toute réclamation découlant de la négligence, de la conduite imprudente ou de la violation des lois applicables par le Participant.

11. Autorisation de captation médiatique
Le Participant autorise Événements Canvas Routes Inc. / Canvas Routes Events Inc. à photographier, filmer et enregistrer le Participant et son véhicule pendant l'Événement, et à utiliser ces images et enregistrements à des fins promotionnelles, de médias sociaux et de marketing, sans compensation. Le Participant peut refuser cette utilisation en avisant l'Organisateur par écrit avant l'Événement.

12. Modifications de parcours et annulations
Événements Canvas Routes Inc. se réserve le droit de modifier, retarder ou annuler toute portion du parcours, des arrêts ou de l'horaire de l'Événement en raison de la météo, des conditions routières, de préoccupations liées à la sécurité ou d'autres circonstances hors du contrôle de l'Organisateur. Aucun remboursement ne sera émis pour des changements effectués pour des raisons de sécurité.

13. Loi applicable
La présente Entente est régie et interprétée conformément aux lois de la province de Québec, Canada. Tout litige découlant de ou lié à la présente Entente relève de la compétence exclusive des tribunaux de la province de Québec.

14. Divisibilité
Si une disposition de la présente Entente est jugée invalide ou inapplicable, les autres dispositions demeurent en pleine vigueur et effet.

15. Entente complète
La présente Entente constitue l'entente complète entre le Participant et Événements Canvas Routes Inc. relativement à son objet et remplace toute entente, compréhension ou représentation antérieure.

EN SIGNANT CI-DESSOUS, LE PARTICIPANT CONFIRME AVOIR LU ET COMPRIS CETTE DÉCHARGE DANS SON INTÉGRALITÉ ET EN ACCEPTER VOLONTAIREMENT LES CONDITIONS.`
