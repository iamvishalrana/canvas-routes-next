// FAQ page translations. Brand name ("Canvas Routes"), tier names
// ("Routes Member" / "Inner Circle"), and the "Routes" section/feature name
// stay untranslated, matching the convention used on every other page.
// `_word_` markers and bare canvasroutes.com / info@canvasroutes.com strings
// inside answers are parsed by renderAnswer() in FAQContent.jsx — keep them
// byte-identical in both languages so the italics/link parsing still matches.
export const faqT = {
  en: {
    heroEyebrow: 'Canvas Routes',
    heroTitleLine1: 'Frequently Asked',
    heroTitleEm: 'Questions',
    heroSubtitle: 'From your first meet to the open road — answered.',
    slowDown: 'SLOW DOWN! SLOW DOWN!',
    ctaTitle: 'Still have questions?',
    ctaReachOut: 'Reach out at',
    footerCopyright: '© 2026 Canvas Routes. Montreal, QC.',
    footerPrivacy: 'Privacy Policy',
    footerTerms: 'Terms',
    footerPartner: 'Partner with us',
    sections: [
      {
        title: 'About',
        items: [
          {
            q: 'What is Canvas Routes?',
            a: 'Canvas Routes is a Montreal-based automotive community built around curated car meets, scenic routes and convoy adventures across North America and beyond. The passion for the road matters more than the badge on your car, though we do maintain a performance and luxury standard across all our events.',
          },
          {
            q: 'Who is Canvas Routes for?',
            a: 'Anyone who genuinely loves to drive. Not to be seen, not to park and pose — but to actually get out and experience the road. Our community brings together enthusiasts of all backgrounds who share a respect for the drive, the machine and the people around them.',
          },
          {
            q: 'Are you a car club?',
            a: 'Yes — a car club built around the drivers. Cars are the common thread, but the real heart of Canvas Routes is the person behind the wheel. Someone who chose their car with intention and would rather be out on the road than standing next to it. If that sounds like you, you belong here.',
          },
          {
            q: 'Where are you based?',
            a: 'Montreal, Quebec. All current events depart from Montreal or the greater Montreal area. We are a young and growing community with ambitions that stretch across Quebec, Ontario, Vermont, Maine, New York and beyond.',
          },
          {
            q: 'How do I stay updated on upcoming events?',
            a: 'Follow us on Instagram @canvasroutes and on Facebook. All event announcements drop there first. You can also register at canvasroutes.com to be on our list.',
          },
          {
            q: 'I registered — what should I expect?',
            a: 'All Canvas Routes communication happens by email — confirmations, event details, payment information and updates are all sent directly to your inbox. Please check your junk or spam folder as our emails can sometimes land there. We recommend adding info@canvasroutes.com to your contacts so nothing gets missed.',
          },
        ],
      },
      {
        title: 'Meets',
        items: [
          {
            q: 'What kind of meets does Canvas Routes host?',
            a: 'Our main format is Cars and Coffee — a curated invite-only morning meet at a premium venue in Montreal. Great cars, great coffee, great people. We also host themed and seasonal meets throughout the year, but Cars and Coffee is the heartbeat of what we do.',
          },
          {
            q: 'What is a Canvas Routes Cars and Coffee?',
            a: 'A curated invite-only morning meet at a premium venue in Montreal. Great cars, great coffee, great people. No entry fee, no judging — just a morning worth waking up for.',
          },
          {
            q: 'How do I get an invite?',
            a: 'Register at canvasroutes.com. All registrations are personally reviewed and confirmed. This is not a first come first served event — we take care with every registration to make sure the right fit is there.',
          },
          {
            q: 'Is there a cost to attend?',
            a: 'No. Cars and Coffee events are completely free. Canvas Routes provides complimentary coffee for all registered cars.',
          },
          {
            q: 'What kind of cars show up?',
            a: 'A mix of exotics, classics, performance cars and enthusiast builds. Themed events give preference to specific categories but all passionate enthusiasts are welcome.',
          },
          {
            q: 'What if it rains?',
            a: 'Rain or shine we go ahead — meets have a great energy regardless of the weather. We only postpone in the case of severe weather. You will always be notified in advance if anything changes.',
          },
          {
            q: 'Can I bring a friend or spectator?',
            a: 'Absolutely. If they have a car they love, have them register at canvasroutes.com. Spectators are also welcome to come and enjoy the morning.',
          },
          {
            q: 'What are the rules?',
            a: 'No revving, no burnouts, no aggressive driving at any time. We are guests of our venue partners and neighbours of the communities we meet in. Respect the space, respect the cars around you and bring the right energy.',
          },
        ],
      },
      {
        title: 'Routes',
        items: [
          {
            q: 'What is a Canvas Routes route?',
            a: 'A fully planned curated convoy through some of the most scenic backroads in North America. Every detail is handled — an early meetup, a guided drive with a lead car the entire route, curated stops along the way, a hosted lunch, and personal photography and video coverage of your car on the road. All you bring is your car and your energy.',
          },
          {
            q: 'How does expressing interest in an upcoming route work?',
            a: 'Our Routes page lists the drives we\'re planning for the season. If a road calls to you, put your name down — it takes thirty seconds, costs nothing, and commits you to nothing. Each route needs a minimum number of cars; once enough drivers are in, we launch it and email everyone on the list with the full details and how to confirm a spot.',
          },
          {
            q: 'Do all our routes use the interest list?',
            a: 'No. The interest list on our Routes page is for our longer _routes_ — overnight and multi-day drives we plan months ahead, where we need a minimum crew before the route makes sense to run. Our shorter day drives work differently: they\'re announced only a few weeks before they run, with no interest-gathering step at all — spots are first come, first served, with priority given to members.',
          },
          {
            q: 'Does expressing interest cost anything or commit me to going?',
            a: 'No and no. Expressing interest is completely free — no payment details are collected — and it isn\'t a booking or a commitment. It simply tells us you\'d be in the convoy. If your plans change, you simply don\'t confirm when the route launches.',
          },
          {
            q: 'When do I pay for a route?',
            a: 'Only after a route officially launches. When we hit the crew we need, everyone on the interest list gets a launch email with the per-car fee — set by the route\'s distance, stops, and any overnight stays — and instructions to confirm your spot. Nothing is charged before then.',
          },
          {
            q: 'What happens if a route doesn\'t reach its target?',
            a: 'It gets postponed to a future season rather than run half-empty — a Canvas Routes convoy only rolls out when the crew is right. Your name stays on the list, and you\'ll be the first to hear when that route comes back around.',
          },
          {
            q: 'Do members get priority on upcoming routes?',
            a: 'Yes. When a route launches, members get priority as spots are confirmed, and expressing interest from the members portal fills in your details automatically. If you use an email tied to a member account, we\'ll ask you to log in first so your registration carries that priority.',
          },
          {
            q: 'Why do you ask about budget, dates, and activities when I express interest?',
            a: 'Because the crew shapes the trip. Your preferences — budget range, dates that work, hotel style, the things you\'d want to do along the way — feed directly into how we plan the route, where we stay, and what makes the itinerary. Every one of those questions is optional, and none of them commit you to anything.',
          },
          {
            q: 'What kind of roads can I expect?',
            a: 'We plan every route to avoid highways as much as possible. After the first regroup stop we take nothing but backroads all the way to the destination. Every route is personally mapped and scouted before the trip. Expect winding two-lane roads, elevation changes, lake views and long sweeping corners.',
          },
          {
            q: 'How do you choose your routes?',
            a: 'Every route we run has been driven by us — multiple times. Before anything is announced, we go out and scout the full road ourselves: every turn, every stop, every restaurant, every viewpoint. We drive it in different conditions, time the segments, eat the food, and only sign off on a route once there are zero question marks left. By the time you show up, every detail has already been figured out.',
          },
          {
            q: 'Do I find out the route in advance?',
            a: 'The full itinerary is shared privately with confirmed participants ahead of the trip. We generally keep the specific stops and roads a surprise — part of the Canvas Routes experience is the discovery along the way.',
          },
          {
            q: 'What is included in the route fee?',
            a: 'The fee covers a guided convoy with a lead car the entire route, a hosted lunch stop, and personal photography and video coverage of your car on the road. Some routes add a curated stop of their own — a winery, a scenic overlook, free time in a village — the specifics are always laid out in the launch email and the private itinerary page. Parking fees (if needed) and your car\'s gas are not included.',
          },
          {
            q: 'Can I bring a passenger?',
            a: 'Yes — the base fee covers two people per car. Additional passengers are charged separately. Children are welcome and we offer tiered pricing depending on age.',
          },
          {
            q: 'Do I need to sign a waiver?',
            a: 'Yes. All route participants are required to sign a Canvas Routes participant waiver before the event. This is sent to you upon confirmation of your spot.',
          },
          {
            q: 'What is your cancellation and refund policy?',
            a: 'Generally, any fee paid to Canvas Routes is fully refundable. That said, it can vary depending on the type of event or trip and how close to the date the cancellation is made. If you need to cancel, reach out directly — we will always do our best to work with you.',
          },
          {
            q: 'Are routes open to non-members?',
            a: 'Yes — Canvas Routes routes are not exclusive to members. Anyone can register for an upcoming route. Members simply get priority access during a dedicated registration window before spots open to the public, and benefit from preferred member pricing on every route.',
          },
          {
            q: 'How do I register and pay?',
            a: 'Registration is handled through canvasroutes.com. Spots are strictly limited and confirmed on a first paid basis. Registration deadlines apply for each event.',
          },
        ],
      },
      {
        title: 'Overnight & Long Distance',
        items: [
          {
            q: 'Do you organize overnight trips?',
            a: 'Yes — overnight and multi-day convoy adventures are a core part of Canvas Routes. We have overnight trips planned for this season and longer expeditions in the works beyond that.',
          },
          {
            q: 'What is the Canvas Routes flagship route?',
            a: 'The Cabot Trail in Nova Scotia — a full convoy from Montreal to Cape Breton, one of the greatest driving roads in North America. It is on the table for this season: head to canvasroutes.com/routes and express your interest — the route launches once enough drivers are in.',
          },
          {
            q: 'How far do your routes go?',
            a: 'Our routes span North America — scenic backroads through the northeast, longer expeditions further afield, and overnight adventures for those who want to go further. The road has no limits and neither do we.',
          },
        ],
      },
      {
        title: 'Membership',
        items: [
          {
            q: 'Is membership open now?',
            a: 'Yes — Canvas Routes membership is open for the 2026 season. Apply at canvasroutes.com/membership. Every application is reviewed personally and spots are limited.',
          },
          {
            q: 'What does membership include?',
            a: 'Priority registration for all events and routes, preferred member pricing on every route, access to members-only events, partner discounts, a Canvas Routes members kit and more. Inner Circle members receive additional exclusive perks and an extended season through November.',
          },
          {
            q: 'How much does membership cost?',
            a: 'Routes Member is $99 CAD per season. Inner Circle is $249 CAD per season. Full details and benefits at canvasroutes.com/membership.',
          },
          {
            q: 'What is the difference between Routes Member and Inner Circle?',
            a: 'Routes Member gives you full access to every Canvas Routes event and route with priority registration and preferred pricing all season. Inner Circle includes everything in Routes Member plus 48hr exclusive early access to all events, a $70 route credit, a professional car photoshoot on a route, exclusive partner discounts, and a Canvas Routes cap.',
          },
          {
            q: 'Are there events exclusive to members?',
            a: 'Yes. Alongside our open events, Canvas Routes runs a calendar of members-only experiences throughout the season — exclusive cruises, private gatherings, and routes that are not open to the public. These are part of what makes membership worthwhile.',
          },
          {
            q: 'How is my application reviewed?',
            a: 'Every application is read personally. We look at the car, the person, and what they bring to the community. There is no algorithm — just a genuine review. You will hear back by email.',
          },
          {
            q: 'What happens if my application is declined?',
            a: 'If your application is not approved, your payment is refunded in full — no charge is made. You are welcome to reapply in a future season.',
          },
          {
            q: 'Can I cancel my membership?',
            a: 'Membership fees are non-refundable once the season has begun. If you are approved but choose not to proceed before the season starts, contact us at info@canvasroutes.com as soon as possible.',
          },
        ],
      },
    ],
  },
  fr: {
    heroEyebrow: 'Canvas Routes',
    heroTitleLine1: 'Foire aux',
    heroTitleEm: 'Questions',
    heroSubtitle: 'De votre première rencontre à la grande route — on répond à tout.',
    slowDown: 'RALENTIS! RALENTIS!',
    ctaTitle: "D'autres questions?",
    ctaReachOut: 'Écrivez-nous à',
    footerCopyright: '© 2026 Canvas Routes. Montréal, QC.',
    footerPrivacy: 'Politique de confidentialité',
    footerTerms: 'Conditions',
    footerPartner: 'Devenez partenaire',
    sections: [
      {
        title: 'À propos',
        items: [
          {
            q: "Qu'est-ce que Canvas Routes?",
            a: "Canvas Routes est une communauté automobile basée à Montréal, bâtie autour de rencontres automobiles organisées, de routes pittoresques et d'aventures en convoi à travers l'Amérique du Nord et au-delà. La passion de la route compte plus que le badge sur votre voiture, même si nous maintenons une norme de performance et de luxe pour tous nos événements.",
          },
          {
            q: "À qui s'adresse Canvas Routes?",
            a: "À quiconque aime vraiment conduire. Pas pour se montrer, pas pour se garer et poser — mais pour vraiment sortir et vivre la route. Notre communauté rassemble des passionnés de tous horizons qui partagent un respect pour la conduite, la machine et les gens qui les entourent.",
          },
          {
            q: 'Êtes-vous un club automobile?',
            a: "Oui — un club automobile bâti autour des conducteurs. Les voitures sont le fil conducteur, mais le vrai cœur de Canvas Routes, c'est la personne derrière le volant. Quelqu'un qui a choisi sa voiture avec intention et qui préfère être sur la route plutôt que planté à côté. Si ça vous ressemble, vous avez votre place ici.",
          },
          {
            q: 'Où êtes-vous basés?',
            a: "Montréal, Québec. Tous nos événements actuels partent de Montréal ou de la grande région métropolitaine. Nous sommes une communauté jeune et en pleine croissance, avec des ambitions qui s'étendent au Québec, en Ontario, au Vermont, dans le Maine, à New York et au-delà.",
          },
          {
            q: 'Comment rester au courant des événements à venir?',
            a: "Suivez-nous sur Instagram @canvasroutes et sur Facebook. Toutes les annonces d'événements y sont publiées en premier. Vous pouvez aussi vous inscrire sur canvasroutes.com pour être sur notre liste.",
          },
          {
            q: "Je me suis inscrit — à quoi dois-je m'attendre?",
            a: "Toutes les communications de Canvas Routes se font par courriel — confirmations, détails d'événements, informations de paiement et mises à jour sont envoyés directement dans votre boîte de réception. Vérifiez votre dossier de courrier indésirable, car nos courriels peuvent parfois s'y retrouver. Nous vous recommandons d'ajouter info@canvasroutes.com à vos contacts pour ne rien manquer.",
          },
        ],
      },
      {
        title: 'Rencontres',
        items: [
          {
            q: 'Quel genre de rencontres Canvas Routes organise-t-il?',
            a: "Notre format principal est le Cars and Coffee — une rencontre matinale organisée, sur invitation seulement, dans un lieu haut de gamme à Montréal. De belles voitures, du bon café, des gens formidables. Nous organisons aussi des rencontres thématiques et saisonnières tout au long de l'année, mais le Cars and Coffee reste le cœur de ce que nous faisons.",
          },
          {
            q: "Qu'est-ce qu'un Cars and Coffee de Canvas Routes?",
            a: "Une rencontre matinale organisée, sur invitation seulement, dans un lieu haut de gamme à Montréal. De belles voitures, du bon café, des gens formidables. Aucuns frais d'entrée, aucun jugement — juste une matinée qui vaut la peine de se lever tôt.",
          },
          {
            q: 'Comment obtenir une invitation?',
            a: "Inscrivez-vous sur canvasroutes.com. Toutes les inscriptions sont examinées et confirmées personnellement. Ce n'est pas un événement au premier arrivé, premier servi — nous prenons soin d'étudier chaque inscription pour nous assurer que c'est le bon fit.",
          },
          {
            q: 'Y a-t-il un coût pour participer?',
            a: 'Non. Les événements Cars and Coffee sont entièrement gratuits. Canvas Routes offre un café gratuit pour toutes les voitures inscrites.',
          },
          {
            q: 'Quel genre de voitures peut-on voir?',
            a: "Un mélange d'exotiques, de classiques, de voitures de performance et de constructions de passionnés. Les événements thématiques donnent priorité à certaines catégories, mais tous les passionnés sont les bienvenus.",
          },
          {
            q: "Et s'il pleut?",
            a: "Qu'il pleuve ou qu'il vente, la rencontre a lieu — l'énergie reste au rendez-vous peu importe la météo. Nous reportons seulement en cas de conditions météorologiques sévères. Vous serez toujours avisé à l'avance en cas de changement.",
          },
          {
            q: 'Puis-je amener un ami ou un spectateur?',
            a: "Absolument. S'ils ont une voiture qu'ils aiment, invitez-les à s'inscrire sur canvasroutes.com. Les spectateurs sont aussi les bienvenus pour venir profiter de la matinée.",
          },
          {
            q: 'Quelles sont les règles?',
            a: "Aucun vrombissement de moteur, aucun burnout, aucune conduite agressive en tout temps. Nous sommes les invités de nos partenaires de lieu et les voisins des communautés où nous nous rencontrons. Respectez l'espace, respectez les voitures autour de vous et apportez la bonne énergie.",
          },
        ],
      },
      {
        title: 'Routes',
        items: [
          {
            q: 'Qu\'est-ce qu\'une route Canvas Routes?',
            a: "Un convoi entièrement planifié et organisé à travers certaines des plus belles routes secondaires d'Amérique du Nord. Chaque détail est pris en charge — un rassemblement matinal, une conduite guidée avec une voiture de tête sur tout le parcours, des arrêts sélectionnés en chemin, un dîner offert, et une couverture photo et vidéo personnalisée de votre voiture sur la route. Vous n'avez qu'à apporter votre voiture et votre énergie.",
          },
          {
            q: "Comment fonctionne le fait d'exprimer son intérêt pour une route à venir?",
            a: "Notre page Routes répertorie les sorties que nous planifions pour la saison. Si une route vous interpelle, inscrivez votre nom — ça prend trente secondes, ça ne coûte rien et ça ne vous engage à rien. Chaque route a besoin d'un nombre minimum de voitures; une fois que suffisamment de conducteurs sont inscrits, nous la lançons et envoyons un courriel à tous ceux sur la liste avec tous les détails et la marche à suivre pour confirmer une place.",
          },
          {
            q: 'Est-ce que toutes nos routes utilisent la liste d\'intérêt?',
            a: "Non. La liste d'intérêt sur notre page Routes est pour nos _routes_ plus longues — des sorties d'une nuit ou de plusieurs jours que nous planifions des mois à l'avance, où nous avons besoin d'un équipage minimum avant que la route ait du sens à organiser. Nos sorties d'une journée plus courtes fonctionnent différemment : elles sont annoncées seulement quelques semaines avant leur tenue, sans aucune étape de collecte d'intérêt — les places sont au premier arrivé, premier servi, avec priorité accordée aux membres.",
          },
          {
            q: "Est-ce qu'exprimer son intérêt coûte quelque chose ou m'engage à y aller?",
            a: "Non et non. Exprimer son intérêt est entièrement gratuit — aucune information de paiement n'est recueillie — et ce n'est ni une réservation ni un engagement. Ça nous indique simplement que vous seriez du convoi. Si vos plans changent, il vous suffit de ne pas confirmer au lancement de la route.",
          },
          {
            q: 'Quand est-ce que je paie pour une route?',
            a: "Seulement après le lancement officiel d'une route. Lorsque nous atteignons l'équipage nécessaire, tous ceux sur la liste d'intérêt reçoivent un courriel de lancement avec les frais par voiture — déterminés selon la distance de la route, les arrêts et les nuitées — ainsi que les instructions pour confirmer votre place. Rien n'est facturé avant cela.",
          },
          {
            q: "Que se passe-t-il si une route n'atteint pas sa cible?",
            a: "Elle est reportée à une saison future plutôt que d'être organisée à moitié vide — un convoi Canvas Routes ne part que lorsque l'équipage est au rendez-vous. Votre nom reste sur la liste, et vous serez le premier informé lorsque cette route reviendra.",
          },
          {
            q: 'Est-ce que les membres ont priorité sur les routes à venir?',
            a: "Oui. Lors du lancement d'une route, les membres ont priorité au fur et à mesure que les places sont confirmées, et exprimer son intérêt depuis le portail des membres remplit vos informations automatiquement. Si vous utilisez un courriel lié à un compte membre, nous vous demanderons de vous connecter d'abord afin que votre inscription bénéficie de cette priorité.",
          },
          {
            q: 'Pourquoi demandez-vous mon budget, mes dates et mes activités préférées lorsque j\'exprime mon intérêt?',
            a: "Parce que l'équipage façonne le voyage. Vos préférences — la fourchette de budget, les dates qui vous conviennent, le style d'hébergement, les choses que vous aimeriez faire en chemin — alimentent directement notre planification de la route, l'endroit où nous logeons et ce qui compose l'itinéraire. Chacune de ces questions est facultative et aucune ne vous engage à quoi que ce soit.",
          },
          {
            q: 'À quel genre de routes puis-je m\'attendre?',
            a: "Nous planifions chaque route pour éviter les autoroutes autant que possible. Après le premier arrêt de rassemblement, nous ne prenons que des routes secondaires jusqu'à destination. Chaque route est personnellement cartographiée et repérée avant le voyage. Attendez-vous à des routes sinueuses à deux voies, des changements d'élévation, des vues sur les lacs et de longs virages en courbe.",
          },
          {
            q: 'Comment choisissez-vous vos routes?',
            a: "Chaque route que nous organisons a été conduite par nous — à plusieurs reprises. Avant toute annonce, nous partons repérer nous-mêmes la route en entier : chaque virage, chaque arrêt, chaque restaurant, chaque point de vue. Nous la conduisons dans différentes conditions, chronométrons les segments, goûtons la nourriture, et n'approuvons une route qu'une fois qu'il ne reste plus aucun point d'interrogation. Le jour où vous vous présentez, chaque détail a déjà été réglé.",
          },
          {
            q: "Est-ce que je connais la route à l'avance?",
            a: "L'itinéraire complet est partagé en privé avec les participants confirmés avant le voyage. Nous gardons généralement les arrêts et les routes spécifiques comme surprise — la découverte en chemin fait partie de l'expérience Canvas Routes.",
          },
          {
            q: "Qu'est-ce qui est inclus dans les frais de la route?",
            a: "Les frais couvrent un convoi guidé avec une voiture de tête sur tout le parcours, un arrêt-dîner offert, et une couverture photo et vidéo personnalisée de votre voiture sur la route. Certaines routes ajoutent leur propre arrêt sélectionné — un vignoble, un point de vue panoramique, du temps libre dans un village — les détails sont toujours précisés dans le courriel de lancement et la page d'itinéraire privée. Les frais de stationnement (si nécessaire) et l'essence de votre voiture ne sont pas inclus.",
          },
          {
            q: 'Puis-je amener un passager?',
            a: "Oui — les frais de base couvrent deux personnes par voiture. Les passagers additionnels sont facturés séparément. Les enfants sont les bienvenus et nous offrons une tarification par palier selon l'âge.",
          },
          {
            q: 'Dois-je signer une décharge?',
            a: "Oui. Tous les participants aux routes doivent signer une décharge de participant Canvas Routes avant l'événement. Elle vous est envoyée dès la confirmation de votre place.",
          },
          {
            q: "Quelle est votre politique d'annulation et de remboursement?",
            a: "En général, tous les frais versés à Canvas Routes sont entièrement remboursables. Cela dit, cela peut varier selon le type d'événement ou de voyage et la proximité de la date d'annulation. Si vous devez annuler, contactez-nous directement — nous ferons toujours de notre mieux pour nous entendre avec vous.",
          },
          {
            q: 'Est-ce que les routes sont ouvertes aux non-membres?',
            a: "Oui — les routes de Canvas Routes ne sont pas exclusives aux membres. Tout le monde peut s'inscrire à une route à venir. Les membres bénéficient simplement d'un accès prioritaire durant une fenêtre d'inscription dédiée avant l'ouverture au public, ainsi que d'une tarification préférentielle sur chaque route.",
          },
          {
            q: "Comment m'inscrire et payer?",
            a: "L'inscription se fait sur canvasroutes.com. Les places sont strictement limitées et confirmées au premier payé, premier servi. Des dates limites d'inscription s'appliquent à chaque événement.",
          },
        ],
      },
      {
        title: 'Nuitées et longue distance',
        items: [
          {
            q: "Organisez-vous des voyages d'une nuit?",
            a: "Oui — les aventures en convoi d'une nuit ou de plusieurs jours font partie intégrante de Canvas Routes. Nous avons des voyages d'une nuit prévus pour cette saison, et des expéditions plus longues en préparation pour la suite.",
          },
          {
            q: 'Quelle est la route phare de Canvas Routes?',
            a: "Le Cabot Trail en Nouvelle-Écosse — un convoi complet de Montréal jusqu'au Cap-Breton, l'une des plus belles routes de conduite en Amérique du Nord. Elle est au programme pour cette saison : rendez-vous sur canvasroutes.com/routes et exprimez votre intérêt — la route se lance dès que suffisamment de conducteurs sont inscrits.",
          },
          {
            q: 'Jusqu\'où vont vos routes?',
            a: "Nos routes couvrent l'Amérique du Nord — des routes secondaires pittoresques dans le nord-est, des expéditions plus longues plus loin, et des aventures d'une nuit pour ceux qui veulent aller plus loin encore. La route n'a pas de limites, et nous non plus.",
          },
        ],
      },
      {
        title: 'Adhésion',
        items: [
          {
            q: "L'adhésion est-elle ouverte en ce moment?",
            a: "Oui — l'adhésion à Canvas Routes est ouverte pour la saison 2026. Faites votre demande sur canvasroutes.com/membership. Chaque candidature est examinée personnellement et les places sont limitées.",
          },
          {
            q: "Qu'est-ce que l'adhésion inclut?",
            a: "Inscription prioritaire à tous les événements et routes, tarification préférentielle pour membres sur chaque route, accès aux événements réservés aux membres, rabais chez nos partenaires, une trousse de membre Canvas Routes et plus encore. Les membres Inner Circle reçoivent des avantages exclusifs additionnels et une saison prolongée jusqu'en novembre.",
          },
          {
            q: "Combien coûte l'adhésion?",
            a: 'Routes Member coûte 99 $ CA par saison. Inner Circle coûte 249 $ CA par saison. Tous les détails et avantages sur canvasroutes.com/membership.',
          },
          {
            q: 'Quelle est la différence entre Routes Member et Inner Circle?',
            a: "Routes Member vous donne un accès complet à chaque événement et route Canvas Routes, avec inscription prioritaire et tarification préférentielle toute la saison. Inner Circle inclut tout ce qui est dans Routes Member, plus un accès exclusif 48h à l'avance à tous les événements, un crédit de 70 $ sur une route, une séance photo professionnelle de votre voiture sur une route, des rabais exclusifs chez nos partenaires, et une casquette Canvas Routes.",
          },
          {
            q: 'Y a-t-il des événements exclusifs aux membres?',
            a: "Oui. En plus de nos événements ouverts à tous, Canvas Routes organise un calendrier d'expériences réservées aux membres tout au long de la saison — randonnées exclusives, rassemblements privés et routes fermées au public. Ce sont ces expériences qui font que l'adhésion en vaut la peine.",
          },
          {
            q: 'Comment ma candidature est-elle examinée?',
            a: "Chaque candidature est lue personnellement. Nous regardons la voiture, la personne et ce qu'elle apporte à la communauté. Il n'y a aucun algorithme — seulement un examen authentique. Vous recevrez une réponse par courriel.",
          },
          {
            q: 'Que se passe-t-il si ma candidature est refusée?',
            a: "Si votre candidature n'est pas approuvée, votre paiement est entièrement remboursé — aucuns frais ne sont prélevés. Vous êtes le bienvenu pour présenter une nouvelle candidature lors d'une saison future.",
          },
          {
            q: 'Puis-je annuler mon adhésion?',
            a: "Les frais d'adhésion ne sont pas remboursables une fois la saison commencée. Si vous êtes approuvé mais choisissez de ne pas continuer avant le début de la saison, contactez-nous à info@canvasroutes.com dès que possible.",
          },
        ],
      },
    ],
  },
}
