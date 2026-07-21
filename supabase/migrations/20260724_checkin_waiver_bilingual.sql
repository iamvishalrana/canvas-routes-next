-- The waiver body itself must always show both English and French,
-- regardless of the check-in page's language toggle (not swapped based on
-- the reader's choice) — Quebec liability waivers are shown bilingually.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS checkin_waiver_text_fr TEXT;

ALTER TABLE public.event_checkins
  ADD COLUMN IF NOT EXISTS waiver_text_snapshot_fr TEXT;

UPDATE public.events
SET checkin_waiver_text_fr = 'DÉCHARGE DE RESPONSABILITÉ ET RENONCIATION À RECOURS DU PARTICIPANT
Road Trip Hello to Montebello — 1er août 2026
Montréal vers le Fairmont Le Château Montebello — Convoi privé sur invitation seulement

VEUILLEZ LIRE ATTENTIVEMENT CE DOCUMENT AVANT DE PARTICIPER. EN SIGNANT CI-DESSOUS, VOUS RECONNAISSEZ AVOIR LU, COMPRIS ET ACCEPTÉ D''ÊTRE LIÉ PAR TOUTES LES CONDITIONS ÉNONCÉES DANS LA PRÉSENTE DÉCHARGE.

1. Parties
La présente décharge et renonciation à recours (l''« Entente ») est conclue entre Événements Canvas Routes Inc. / Canvas Routes Events Inc. (l''« Organisateur ») et le participant soussigné (le « Participant ») pour sa participation au road trip Hello to Montebello du 1er août 2026, avec départ de Laval et arrivée au Fairmont Le Château Montebello, à Montebello, QC (l''« Événement »).

2. Description de l''Événement et ce qui est inclus
Événements Canvas Routes Inc. fournit ce qui suit dans le cadre de l''Événement, sans frais supplémentaires au-delà des frais d''inscription :
- Un convoi organisé à travers les routes secondaires de l''Outaouais, mené par Vishal Rana (Jerry)
- Un dîner trois services à l''Auberge Aux Chantignoles, à l''intérieur du Fairmont Le Château Montebello, avec vue sur la rivière des Outaouais
- Un soutien à la navigation en convoi via l''application Velox

3. Ce qui n''est pas inclus
Ce qui suit n''est expressément pas couvert ni fourni par Événements Canvas Routes Inc. et demeure sous la seule responsabilité du Participant :
- Les frais de carburant du véhicule du Participant
- Les boissons au dîner, ainsi que le café, les collations ou tout achat effectué à l''un des arrêts du parcours
- Toute activité, boutique ou expérience personnelle choisie de façon indépendante
- L''assurance du véhicule ou toute autre forme de couverture d''assurance
- Les pannes mécaniques, le remorquage ou l''assistance routière
- Tout dommage au véhicule du Participant, à ses biens personnels ou aux biens de tiers
- Les frais médicaux ou d''urgence découlant de la participation
- Toute amende, contravention ou pénalité résultant de la conduite du Participant

4. Acceptation des risques
Le Participant reconnaît et comprend que la participation à l''Événement comporte des risques inhérents, incluant notamment :
- Les accidents de véhicule, collisions ou défaillances mécaniques
- Les dangers routiers, incluant les débris, le mauvais état des routes, les travaux de construction et les conditions météorologiques défavorables
- Les blessures corporelles, l''invalidité ou le décès
- Les dommages ou la perte de biens personnels ou du véhicule
- Les actions d''autres conducteurs, participants ou tiers non affiliés à Événements Canvas Routes Inc.
- Les cas de force majeure ou circonstances imprévisibles
- La faune sur les routes ou les conditions des routes rurales
- Les surfaces de stationnement inégales ou non pavées à tout lieu le long du parcours

Le Participant assume volontairement tous les risques associés à sa participation à l''Événement, que ces risques soient énumérés ci-dessus ou non.

5. Renonciation à recours
En contrepartie d''être autorisé à participer à l''Événement, le Participant, en son nom et au nom de ses héritiers, exécuteurs testamentaires, administrateurs et ayants droit, libère, renonce à recours, décharge et s''engage à ne pas poursuivre Événements Canvas Routes Inc. / Canvas Routes Events Inc., son fondateur Vishal Rana (Jerry), les organisateurs, bénévoles, partenaires et lieux affiliés, incluant le Fairmont Le Château Montebello (collectivement les « Parties libérées »), de toute réclamation, demande, action, cause d''action ou responsabilité de quelque nature découlant de ou liée à la participation à l''Événement, incluant les réclamations découlant de la négligence des Parties libérées.

6. Responsabilités du Participant
Le Participant s''engage à :
- Conduire son véhicule de façon sécuritaire et en pleine conformité avec le Code de la sécurité routière du Québec et toutes les lois de la circulation applicables en tout temps
- Maintenir une immatriculation valide de son véhicule, une assurance automobile valide et un permis de conduire valide pendant toute la durée de l''Événement
- S''abstenir de faire la course, de conduire de façon agressive, de rouler à vitesse excessive, de faire des dérapages, d''accélérer bruyamment ou des « burnouts » en tout temps pendant l''Événement
- Suivre toutes les instructions et directions de parcours données par les organisateurs d''Événements Canvas Routes Inc.
- Télécharger et activer l''application de convoi Velox avant le départ
- Ne pas consommer d''alcool s''il doit conduire pour toute portion restante de l''Événement; s''assurer qu''un conducteur désigné sobre soit présent dans tout véhicule où de l''alcool est consommé
- Respecter tous les participants, lieux, membres du personnel et tiers
- Accepter l''entière responsabilité de tout dommage causé par son véhicule à des biens, à d''autres véhicules ou à des personnes
- Ne pas participer s''il est sous l''influence de l''alcool, de drogues, de médicaments sur ordonnance affectant la capacité de conduire, ou de toute autre substance affectant les facultés, au début de l''Événement
- Garder le contact d''urgence Vishal Rana (Jerry) au 514-437-3437 joignable en tout temps pendant l''Événement

7. Exigences relatives au véhicule et à l''assurance
Le Participant confirme que :
- Son véhicule est couvert par une assurance automobile valide, tel que requis par les lois de la province de Québec
- Son véhicule est en bon état mécanique et sécuritaire pour la conduite sur autoroute et sur route secondaire
- Il détient un permis de conduire valide et approprié pour le véhicule utilisé
- Événements Canvas Routes Inc. ne fournit, n''organise ni n''étend aucune couverture d''assurance, de quelque nature que ce soit, aux participants, passagers ou véhicules
- Tout dommage, perte ou responsabilité liée au véhicule du Participant demeure sous la seule responsabilité du Participant et de son assureur

8. Passagers
Si le Participant amène un ou plusieurs passagers :
- Le Participant est seul responsable de la sécurité et de la conduite de tous les passagers dans son véhicule pendant toute la durée de l''Événement
- Tous les passagers doivent être âgés de 18 ans ou plus, à moins que le Participant n''accepte par écrit l''entière responsabilité parentale ou de tuteur
- Le Participant confirme que son véhicule est assuré pour transporter le nombre de passagers déclaré
- Événements Canvas Routes Inc. n''assume aucune responsabilité, de quelque nature que ce soit, à l''égard des passagers, y compris les mineurs

9. Nourriture, boissons et allergies
Le Participant reconnaît et accepte que :
- Événements Canvas Routes Inc. n''assume aucune responsabilité pour toute maladie, réaction allergique, blessure ou effet indésirable découlant de la nourriture ou des boissons consommées à tout lieu pendant l''Événement
- Le Participant est seul responsable de divulguer à Canvas Routes, avant l''Événement, toute allergie alimentaire ou restriction alimentaire
- Le Participant est seul responsable de s''assurer de ne pas conduire avec les facultés affaiblies s''il choisit d''acheter et de consommer de l''alcool au dîner (non inclus dans les frais d''inscription)

10. Indemnisation
Le Participant s''engage à indemniser, défendre et tenir indemnes les Parties libérées contre toute réclamation, dommage, perte, coût et dépense (incluant les honoraires juridiques raisonnables) découlant de ou résultant de la participation du Participant à l''Événement, incluant notamment toute réclamation découlant de la négligence, de la conduite imprudente ou de la violation des lois applicables par le Participant.

11. Autorisation de captation médiatique
Le Participant autorise Événements Canvas Routes Inc. / Canvas Routes Events Inc. à photographier, filmer et enregistrer le Participant et son véhicule pendant l''Événement, et à utiliser ces images et enregistrements à des fins promotionnelles, de médias sociaux et de marketing, sans compensation. Le Participant peut refuser cette utilisation en avisant l''Organisateur par écrit avant l''Événement.

12. Modifications de parcours et annulations
Événements Canvas Routes Inc. se réserve le droit de modifier, retarder ou annuler toute portion du parcours, des arrêts ou de l''horaire de l''Événement en raison de la météo, des conditions routières, de préoccupations liées à la sécurité ou d''autres circonstances hors du contrôle de l''Organisateur. Aucun remboursement ne sera émis pour des changements effectués pour des raisons de sécurité.

13. Loi applicable
La présente Entente est régie et interprétée conformément aux lois de la province de Québec, Canada. Tout litige découlant de ou lié à la présente Entente relève de la compétence exclusive des tribunaux de la province de Québec.

14. Divisibilité
Si une disposition de la présente Entente est jugée invalide ou inapplicable, les autres dispositions demeurent en pleine vigueur et effet.

15. Entente complète
La présente Entente constitue l''entente complète entre le Participant et Événements Canvas Routes Inc. relativement à son objet et remplace toute entente, compréhension ou représentation antérieure.

EN SIGNANT CI-DESSOUS, LE PARTICIPANT CONFIRME AVOIR LU ET COMPRIS LA PRÉSENTE DÉCHARGE DANS SON INTÉGRALITÉ ET EN ACCEPTER VOLONTAIREMENT LES CONDITIONS.'
WHERE name = 'Hello to Montebello' AND type = 'Route';
