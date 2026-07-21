// Privacy Policy & Terms and Conditions — full content in both languages.
// Each section keeps the same order/index across en/fr so PrivacyContent.jsx
// and TermsContent.jsx can just index into privacyT[lang] / termsT[lang].
export const legalChrome = {
  en: { eyebrow: 'Legal', faq: 'FAQ', back: '← Back', lastUpdated: 'Last updated: July 2026' },
  fr: { eyebrow: 'Juridique', faq: 'FAQ', back: '← Retour', lastUpdated: 'Dernière mise à jour : juillet 2026' },
}

export const privacyT = {
  en: {
    pageTitle: 'Privacy Policy',
    sections: [
      {
        title: 'Who we are',
        body: 'Canvas Routes is operated by Événements Canvas Routes Inc. / Canvas Routes Events Inc., a corporation incorporated in Quebec, Canada. We can be reached at info@canvasroutes.com. This Privacy Policy applies to the website canvasroutes.com and any services offered through it.',
      },
      {
        title: 'Privacy officer',
        body: 'The person responsible for the protection of personal information at Événements Canvas Routes Inc. is the owner. For any privacy-related questions, requests, or concerns, please contact: info@canvasroutes.com. We will respond within 30 days.',
      },
      {
        title: 'What information we collect',
        body: "When you submit a membership application or event registration, we collect the following personal information: your full name, email address, date of birth (month and day, year optional), phone number (optional), Instagram handle (optional), the year, make, model, and colour of your vehicle, and any additional information you choose to share. When you express interest in an upcoming route, we additionally collect your trip preferences if you choose to provide them — budget range, preferred dates, accommodation preference, preferred activities, and any notes. When you join our notification list, we collect your name, email, phone (optional), date of birth, vehicle details, and the types of events you are interested in. With every form submission we also record the general device platform used (for example iOS, Android, Windows, or macOS), derived from your browser's technical headers — we do not collect device identifiers or track your device across other websites. For approved members, we may also collect and store photos and media you submit for your member profile or gallery. We collect payment card information through Stripe — we do not store raw card data ourselves.",
      },
      {
        title: 'Event check-in & waivers',
        body: 'Ahead of certain events, registrants are asked to complete a digital check-in that may include: trip details such as the names and ages of any passengers riding with you, dietary restrictions, and a WhatsApp number for day-of coordination; a lunch or meal selection where a meal is included; and a digital liability waiver, which records your typed signature (full legal name), vehicle year/make/model, an emergency contact\'s name and phone number, and the IP address and timestamp of your submission — the IP address and timestamp are recorded solely to establish that the waiver was validly signed, in the same way a handwritten signature and date would be recorded on paper. Some events also offer optional Route Awards voting, which records your email address and the picks you submit; the winner of each category may receive a discount on a future route. This information is used only to plan and run the event safely, to honour your meal and passenger preferences, and to establish a valid waiver in the event of a liability claim — it is not used for marketing and is not shared with any party outside those listed under "Who processes your data."',
      },
      {
        title: 'How we use your information',
        body: 'The information you provide is used solely to assess your membership application, process payments, communicate with you about Canvas Routes events and membership status, gauge demand for and plan upcoming routes (including using the trip preferences you share to shape itineraries, accommodation, and activities), understand what devices our community uses so we can improve the website experience, and send you relevant updates about our community. By submitting our forms, you consent to receive these communications. You may withdraw your consent at any time by contacting info@canvasroutes.com. We do not sell, rent, or share your personal information with any third parties for marketing purposes.',
      },
      {
        title: 'Who processes your data',
        body: "We use the following third-party services to operate Canvas Routes: Supabase (supabase.com) stores your personal information in a secure database, including membership applications, member profiles, and event registrations. Stripe (stripe.com) processes payment card information for membership fees and event registrations. Stripe handles, stores, and secures all payment card data on our behalf — we do not store raw card numbers. Resend (resend.com) delivers confirmation and notification emails. Meta Pixel (meta.com) collects anonymised behavioural data on our website to support advertising and analytics through Facebook and Instagram — this data is subject to Meta's own privacy policy and advertising practices. Cloudinary and Backblaze may be used in the future to store member-submitted photos and media. Upstash (upstash.com) provides rate limiting by temporarily storing your IP address to prevent abuse — this data is not linked to your identity and expires automatically. Vercel (vercel.com) hosts the website and processes all web requests — basic technical data including IP addresses may be processed for infrastructure and security purposes. Google Maps (google.com) powers the interactive route maps on our site — when a map loads, Google receives standard technical data such as your IP address, subject to Google's own privacy policy. Sentry (sentry.io) provides error monitoring — if a technical error occurs while you use the site, technical details of the request (which may include your IP address) are captured so we can fix the problem. Anthropic (anthropic.com) provides AI assistance used by our administrators to draft communications — limited application details (such as name and vehicle) may be processed for this purpose, and Anthropic does not use this data to train its models. All third-party services are engaged solely to operate Canvas Routes and are contractually restricted from using your personal data for purposes beyond what we have authorised.",
      },
      {
        title: 'Data transfers outside Quebec',
        body: "Your personal information is processed by third-party services based in the United States: Supabase, Inc. (database storage), Stripe, Inc. (payment processing), Resend, Inc. (email delivery), Meta Platforms, Inc. (advertising analytics), Upstash, Inc. (rate limiting), Vercel, Inc. (website hosting and infrastructure), Google LLC (maps and analytics), Functional Software, Inc. dba Sentry (error monitoring), and Anthropic, PBC (administrative AI assistance). As a result, your personal information may be stored and processed outside of Quebec and Canada. Before using these services, we assessed that each provides a level of protection comparable to Quebec's privacy law requirements. By submitting our forms, you acknowledge that your information will be transferred to the United States for the purposes described in this policy.",
      },
      {
        title: 'Cookies & Analytics',
        body: "This website uses Google Analytics 4 and the Meta Pixel to collect anonymised usage data, including pages visited, time spent on site, and general location (country/city level). Google Analytics sets the following cookies: _ga (distinguishes users, expires after 2 years) and _ga_* (maintains session state, expires after 2 years). The Meta Pixel sets the _fbp cookie (identifies browsers, expires after 90 days) and may set _fbc if you arrive via a Facebook advertisement. No personally identifiable information is shared with Google or Meta. Analytics and advertising cookies are only set after you give consent using the banner on our site. You can change your cookie preference at any time using the 'Manage cookies' link at the bottom of any page. Basic technical cookies may also be set by our hosting provider (Vercel) for infrastructure and security purposes, and Google Maps may set its own cookies when an interactive map loads. We also use functional browser storage (not cookies, and not used for tracking): if you express interest in a route, your name, email, phone, and car may be saved in your own browser's local storage so the form is pre-filled on your next visit — this stays on your device, and clearing your browser data removes it. A small flag is also stored for the duration of your visit so announcements you dismiss stay dismissed.",
      },
      {
        title: 'Your rights under Quebec Law 25',
        body: 'As a Quebec resident, you have the following rights regarding your personal information: the right to access the personal information we hold about you; the right to request corrections to inaccurate information; the right to request deletion of your personal information; the right to data portability — to receive your personal information in a commonly used technological format; and the right to withdraw your consent to our use of your data at any time. To exercise any of these rights, contact us at info@canvasroutes.com and we will respond within 30 days.',
      },
      {
        title: 'Data retention',
        body: 'We retain your personal information for as long as necessary to manage your membership application and communicate with you about Canvas Routes. Signed liability waivers, including the associated IP address and timestamp, are retained for as long as legally necessary to establish a defense to a liability claim, even if you later request deletion of other personal information. If you request deletion of your data, we will remove what we are not otherwise required or permitted to keep within 30 days.',
      },
      {
        title: 'Security',
        body: 'We take reasonable measures to protect your personal information. Our website is served over HTTPS, and data transmitted through our forms is encrypted in transit. Payment card data is handled exclusively by Stripe and subject to PCI-DSS compliance. However, no method of transmission over the internet is 100% secure.',
      },
      {
        title: 'Changes to this policy',
        body: 'We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. For material changes to how we collect or use your personal information, we will notify you directly by email if you have provided your contact information. For minor changes, we will update the date at the top of this page.',
      },
      {
        title: 'Contact',
        body: 'If you have any questions about this Privacy Policy or how we handle your personal information, please contact us at info@canvasroutes.com.',
      },
    ],
  },
  fr: {
    pageTitle: 'Politique de confidentialité',
    sections: [
      {
        title: 'Qui nous sommes',
        body: 'Canvas Routes est exploité par Événements Canvas Routes Inc. / Canvas Routes Events Inc., une société constituée au Québec, Canada. Vous pouvez nous joindre à info@canvasroutes.com. Cette politique de confidentialité s\'applique au site web canvasroutes.com et à tout service offert par son entremise.',
      },
      {
        title: 'Responsable de la protection des renseignements personnels',
        body: 'La personne responsable de la protection des renseignements personnels chez Événements Canvas Routes Inc. est le propriétaire. Pour toute question, demande ou préoccupation relative à la confidentialité, veuillez communiquer avec : info@canvasroutes.com. Nous répondrons dans un délai de 30 jours.',
      },
      {
        title: 'Quels renseignements nous recueillons',
        body: "Lorsque vous soumettez une demande d'adhésion ou une inscription à un événement, nous recueillons les renseignements personnels suivants : votre nom complet, votre adresse courriel, votre date de naissance (mois et jour, année facultative), votre numéro de téléphone (facultatif), votre identifiant Instagram (facultatif), l'année, la marque, le modèle et la couleur de votre véhicule, ainsi que tout renseignement supplémentaire que vous choisissez de partager. Lorsque vous manifestez votre intérêt pour une route à venir, nous recueillons également vos préférences de voyage si vous choisissez de les fournir — fourchette de budget, dates préférées, préférence d'hébergement, activités préférées et toute remarque. Lorsque vous vous inscrivez à notre liste de notification, nous recueillons votre nom, votre courriel, votre téléphone (facultatif), votre date de naissance, les détails de votre véhicule et les types d'événements qui vous intéressent. À chaque soumission de formulaire, nous enregistrons également la plateforme générale de l'appareil utilisé (par exemple iOS, Android, Windows ou macOS), déduite des en-têtes techniques de votre navigateur — nous ne recueillons pas d'identifiants d'appareil et ne suivons pas votre appareil sur d'autres sites web. Pour les membres approuvés, nous pouvons également recueillir et conserver les photos et médias que vous soumettez pour votre profil de membre ou votre galerie. Nous recueillons les renseignements de carte de paiement par l'entremise de Stripe — nous ne conservons pas nous-mêmes les données brutes de carte.",
      },
      {
        title: 'Enregistrement et décharges pour les événements',
        body: 'Avant certains événements, les inscrits sont invités à compléter un enregistrement numérique qui peut inclure : les détails du trajet, comme les noms et âges des passagers vous accompagnant, les restrictions alimentaires et un numéro WhatsApp pour la coordination le jour même; un choix de repas lorsqu\'un repas est inclus; et une décharge de responsabilité numérique, qui enregistre votre signature tapée (nom légal complet), l\'année/la marque/le modèle de votre véhicule, le nom et le numéro de téléphone d\'un contact d\'urgence, ainsi que l\'adresse IP et l\'horodatage de votre soumission — l\'adresse IP et l\'horodatage sont enregistrés uniquement pour établir que la décharge a été valablement signée, de la même manière qu\'une signature manuscrite et une date seraient consignées sur papier. Certains événements offrent également un vote optionnel pour les Route Awards, qui enregistre votre adresse courriel et les choix que vous soumettez; le gagnant de chaque catégorie peut recevoir un rabais sur une route future. Ces renseignements ne sont utilisés que pour planifier et organiser l\'événement en toute sécurité, honorer vos préférences de repas et de passagers, et établir une décharge valide en cas de réclamation en responsabilité — ils ne sont pas utilisés à des fins de marketing et ne sont partagés avec aucune partie autre que celles mentionnées sous « Qui traite vos données ».',
      },
      {
        title: 'Comment nous utilisons vos renseignements',
        body: 'Les renseignements que vous fournissez sont utilisés uniquement pour évaluer votre demande d\'adhésion, traiter les paiements, communiquer avec vous au sujet des événements Canvas Routes et du statut de votre adhésion, évaluer la demande pour les routes à venir et les planifier (y compris l\'utilisation des préférences de voyage que vous partagez pour façonner les itinéraires, l\'hébergement et les activités), comprendre quels appareils notre communauté utilise afin d\'améliorer l\'expérience du site web, et vous envoyer des mises à jour pertinentes sur notre communauté. En soumettant nos formulaires, vous consentez à recevoir ces communications. Vous pouvez retirer votre consentement en tout temps en communiquant avec info@canvasroutes.com. Nous ne vendons, ne louons ni ne partageons vos renseignements personnels avec des tiers à des fins de marketing.',
      },
      {
        title: 'Qui traite vos données',
        body: "Nous utilisons les services tiers suivants pour exploiter Canvas Routes : Supabase (supabase.com) conserve vos renseignements personnels dans une base de données sécurisée, y compris les demandes d'adhésion, les profils de membres et les inscriptions aux événements. Stripe (stripe.com) traite les renseignements de carte de paiement pour les frais d'adhésion et les inscriptions aux événements. Stripe gère, conserve et sécurise toutes les données de carte de paiement en notre nom — nous ne conservons pas les numéros de carte bruts. Resend (resend.com) achemine les courriels de confirmation et de notification. Meta Pixel (meta.com) recueille des données comportementales anonymisées sur notre site web afin de soutenir la publicité et l'analyse par l'entremise de Facebook et Instagram — ces données sont assujetties à la propre politique de confidentialité et aux pratiques publicitaires de Meta. Cloudinary et Backblaze pourraient être utilisés à l'avenir pour conserver les photos et médias soumis par les membres. Upstash (upstash.com) assure la limitation du débit en conservant temporairement votre adresse IP afin de prévenir les abus — ces données ne sont pas liées à votre identité et expirent automatiquement. Vercel (vercel.com) héberge le site web et traite toutes les requêtes web — des données techniques de base, y compris les adresses IP, peuvent être traitées à des fins d'infrastructure et de sécurité. Google Maps (google.com) alimente les cartes interactives des routes sur notre site — lorsqu'une carte se charge, Google reçoit des données techniques standard telles que votre adresse IP, assujetties à la propre politique de confidentialité de Google. Sentry (sentry.io) assure la surveillance des erreurs — si une erreur technique survient pendant votre utilisation du site, les détails techniques de la requête (qui peuvent inclure votre adresse IP) sont capturés afin que nous puissions résoudre le problème. Anthropic (anthropic.com) fournit une assistance par IA utilisée par nos administrateurs pour rédiger des communications — des détails limités de la demande (comme le nom et le véhicule) peuvent être traités à cette fin, et Anthropic n'utilise pas ces données pour entraîner ses modèles. Tous les services tiers sont engagés uniquement pour exploiter Canvas Routes et sont contractuellement tenus de ne pas utiliser vos données personnelles à des fins autres que celles que nous avons autorisées.",
      },
      {
        title: 'Transferts de données hors du Québec',
        body: "Vos renseignements personnels sont traités par des services tiers établis aux États-Unis : Supabase, Inc. (stockage de base de données), Stripe, Inc. (traitement des paiements), Resend, Inc. (acheminement des courriels), Meta Platforms, Inc. (analyse publicitaire), Upstash, Inc. (limitation du débit), Vercel, Inc. (hébergement et infrastructure du site web), Google LLC (cartes et analyse), Functional Software, Inc. faisant affaire sous le nom de Sentry (surveillance des erreurs), et Anthropic, PBC (assistance administrative par IA). Par conséquent, vos renseignements personnels peuvent être conservés et traités à l'extérieur du Québec et du Canada. Avant d'utiliser ces services, nous avons évalué que chacun offre un niveau de protection comparable aux exigences de la loi québécoise sur la protection des renseignements personnels. En soumettant nos formulaires, vous reconnaissez que vos renseignements seront transférés aux États-Unis aux fins décrites dans la présente politique.",
      },
      {
        title: 'Témoins et analyse',
        body: "Ce site web utilise Google Analytics 4 et le Meta Pixel pour recueillir des données d'utilisation anonymisées, y compris les pages visitées, le temps passé sur le site et la localisation générale (à l'échelle du pays/de la ville). Google Analytics installe les témoins suivants : _ga (distingue les utilisateurs, expire après 2 ans) et _ga_* (maintient l'état de session, expire après 2 ans). Le Meta Pixel installe le témoin _fbp (identifie les navigateurs, expire après 90 jours) et peut installer _fbc si vous arrivez par l'entremise d'une publicité Facebook. Aucun renseignement personnel identifiable n'est partagé avec Google ou Meta. Les témoins d'analyse et de publicité ne sont installés qu'après votre consentement au moyen de la bannière sur notre site. Vous pouvez modifier votre préférence en matière de témoins en tout temps à l'aide du lien « Gérer les témoins » au bas de toute page. Des témoins techniques de base peuvent également être installés par notre fournisseur d'hébergement (Vercel) à des fins d'infrastructure et de sécurité, et Google Maps peut installer ses propres témoins lorsqu'une carte interactive se charge. Nous utilisons également un stockage fonctionnel du navigateur (qui n'est pas un témoin et n'est pas utilisé à des fins de suivi) : si vous manifestez de l'intérêt pour une route, votre nom, courriel, téléphone et véhicule peuvent être enregistrés dans le stockage local de votre propre navigateur afin de préremplir le formulaire lors de votre prochaine visite — cela demeure sur votre appareil, et l'effacement des données de votre navigateur le supprime. Un petit indicateur est également conservé pour la durée de votre visite afin que les annonces que vous fermez demeurent fermées.",
      },
      {
        title: 'Vos droits en vertu de la Loi 25 du Québec',
        body: 'En tant que résident du Québec, vous disposez des droits suivants concernant vos renseignements personnels : le droit d\'accéder aux renseignements personnels que nous détenons à votre sujet; le droit de demander la correction de renseignements inexacts; le droit de demander la suppression de vos renseignements personnels; le droit à la portabilité des données — recevoir vos renseignements personnels dans un format technologique structuré et couramment utilisé; et le droit de retirer votre consentement à l\'utilisation de vos données en tout temps. Pour exercer l\'un de ces droits, communiquez avec nous à info@canvasroutes.com et nous répondrons dans un délai de 30 jours.',
      },
      {
        title: 'Conservation des données',
        body: 'Nous conservons vos renseignements personnels aussi longtemps que nécessaire pour gérer votre demande d\'adhésion et communiquer avec vous au sujet de Canvas Routes. Les décharges de responsabilité signées, y compris l\'adresse IP et l\'horodatage associés, sont conservées aussi longtemps que légalement nécessaire pour établir une défense contre une réclamation en responsabilité, même si vous demandez ultérieurement la suppression d\'autres renseignements personnels. Si vous demandez la suppression de vos données, nous supprimerons ce que nous ne sommes pas autrement tenus ou autorisés à conserver dans un délai de 30 jours.',
      },
      {
        title: 'Sécurité',
        body: "Nous prenons des mesures raisonnables pour protéger vos renseignements personnels. Notre site web est servi par HTTPS, et les données transmises par nos formulaires sont chiffrées en transit. Les données de carte de paiement sont traitées exclusivement par Stripe et assujetties à la conformité PCI-DSS. Cependant, aucune méthode de transmission sur Internet n'est sécurisée à 100 %.",
      },
      {
        title: 'Modifications à la présente politique',
        body: 'Nous pouvons mettre à jour cette politique de confidentialité de temps à autre. Les modifications seront affichées sur cette page avec une date mise à jour. Pour les modifications importantes à la manière dont nous recueillons ou utilisons vos renseignements personnels, nous vous en informerons directement par courriel si vous nous avez fourni vos coordonnées. Pour les modifications mineures, nous mettrons à jour la date en haut de cette page.',
      },
      {
        title: 'Contact',
        body: 'Si vous avez des questions au sujet de cette politique de confidentialité ou de la façon dont nous traitons vos renseignements personnels, veuillez communiquer avec nous à info@canvasroutes.com.',
      },
    ],
  },
}

export const termsT = {
  en: {
    pageTitle: 'Terms & Conditions',
    sections: [
      {
        title: 'Acceptance of terms',
        body: 'By submitting a membership application, route registration, expression of interest in an upcoming route, notification-list signup, or any other form on Canvas Routes, you agree to be bound by these Terms & Conditions as issued by Événements Canvas Routes Inc. / Canvas Routes Events Inc., a corporation incorporated in Quebec, Canada. If you do not agree, please do not submit an application or registration.',
      },
      {
        title: 'Membership tiers',
        body: 'Canvas Routes offers two membership tiers per season. Routes Member is $99 CAD per season and includes access to Canvas Routes events, routes, and Cars & Coffee gatherings as described on the site. Inner Circle is $249 CAD per season and includes everything in Routes Member, with extended access through November and additional benefits as described on the site. The standard season runs June through October. Inner Circle membership extends through November. Pricing is subject to change for future seasons.',
      },
      {
        title: 'Application & approval',
        body: 'All membership applications are reviewed personally. Canvas Routes reserves the right to accept or decline any application at its sole discretion, for any reason or no reason. Submitting an application does not guarantee membership. You will be notified by email of the outcome of your application.',
      },
      {
        title: 'Payment',
        body: 'Membership fees are processed through Stripe. When you complete checkout as part of your membership application, an authorization hold is placed on your card for the applicable membership fee — your card is not charged at that moment. If your application is approved, the held amount is captured and your membership begins. If your application is declined, the hold is released in full and no charge is made; depending on your bank, the hold may take a few business days to disappear from your statement. All prices are in Canadian dollars (CAD) and are subject to applicable Quebec sales tax (GST/QST), which is calculated and shown before you confirm payment. Membership is not active until your application has been reviewed and approved by Canvas Routes. By submitting your card details, you authorize Événements Canvas Routes Inc. to place this hold and, upon approval, capture the applicable membership fee.',
      },
      {
        title: 'Cancellations & refunds',
        body: 'Membership fees are non-refundable once your application has been approved and the season has begun. If your application is declined, a full refund is issued automatically. If you are approved but choose not to proceed before the season begins, contact us as soon as possible at info@canvasroutes.com. If Canvas Routes cancels a membership without cause on its part, a prorated refund may be issued at our discretion based on the remaining portion of the season.',
      },
      {
        title: 'Expressing interest in upcoming routes',
        body: 'Our Routes page lists planned drives that launch once enough drivers have registered their interest. Expressing interest is free and is not a booking, reservation, or commitment of any kind — it signals that you would like to join, and no payment details are collected. Each planned route has a minimum interest threshold; when it is reached, Canvas Routes may launch the route and notify everyone on the interest list by email with full details, including the per-car fee and how to confirm a spot. Interest counts shown on the site are indicative only. Canvas Routes may modify, postpone, or withdraw any planned route at its discretion, including where the interest threshold is not met, and expressing interest does not guarantee that a route will run, that spots will be available, or that you will receive a spot. Members receive priority when spots are confirmed. Trip preferences you share when expressing interest are used to help plan the route and carry no obligation on either side.',
      },
      {
        title: 'Route fees',
        body: 'Route participation fees vary by event and are stated on the individual event page or, for routes announced through the interest process, in the launch email — per-car fees are set for each route based on its length, planned stops, overnight stays, and logistics, and are always communicated before any payment is collected, plus applicable Quebec sales tax (GST/QST). When you register, an authorization hold is placed on your card for the applicable fee; every registration is reviewed personally, and the hold is only captured (charged) once your spot is confirmed — if it is not confirmed, the hold is released in full and no charge is made. Route fees are non-refundable once your registration has been confirmed and the hold captured. If you are unable to attend after confirmation, you may transfer your spot to another eligible Canvas Routes member with prior written approval from info@canvasroutes.com. Canvas Routes reserves the right to cancel or reschedule any route due to weather, road conditions, or other circumstances beyond its control — in such cases, a full refund will be issued.',
      },
      {
        title: 'Member conduct',
        body: 'Members are expected to treat other members, guests, and venues with respect at all times. Conduct that is unsafe, disrespectful, threatening, or otherwise damaging to the Canvas Routes community will not be tolerated. Canvas Routes reserves the right to revoke membership at any time, without refund, for conduct that violates these standards. This applies at events, on drives, and in any community spaces associated with Canvas Routes.',
      },
      {
        title: 'Events & waivers',
        body: 'Event schedules, locations, and formats are subject to change without notice. A waiver of liability may be required at all Canvas Routes events, including routes, Cars & Coffee gatherings, and any other organized activity. By registering for or attending any Canvas Routes event, you agree to sign any waiver presented at the event. Members who participate in routes, drives, and other events do so entirely at their own risk. Canvas Routes does not organize racing or any illegal driving activity, and members are expected to obey all applicable traffic laws at all times.',
      },
      {
        title: 'Event check-in',
        body: 'For events that require it, you must complete a digital check-in ahead of time, which may include your trip details (passengers, dietary restrictions, WhatsApp number), a meal selection where a meal is included, and the liability waiver. Typing your full legal name into the signature field and submitting the waiver constitutes your electronic signature and has the same legal effect as a handwritten signature — your submission timestamp and IP address are recorded to establish that the waiver was validly signed. Attendance may be conditional on completing check-in by any deadline communicated to you (for example, a lunch selection cutoff). Where Route Awards voting is offered, it is optional, for fun, and decided by participant vote; Canvas Routes has final discretion over vote validity, tie-breaking, and how any associated discount is applied, and the outcome is not transferable or exchangeable for cash.',
      },
      {
        title: 'Third party activities',
        body: 'Some Canvas Routes events may include optional or suggested activities operated by independent third parties, including but not limited to Ziptrek Ecotours, Skyline Luge, restaurants, and other service providers. Participation in any third-party activity is entirely voluntary and subject to that provider\'s own terms, conditions, waivers, and safety rules. Événements Canvas Routes Inc. has no affiliation with, and accepts no liability for, any injury, loss, or damage arising from participation in activities organized or operated by third parties.',
      },
      {
        title: 'Food & beverage',
        body: 'Canvas Routes events may include group dining at third-party restaurants and cafés. Événements Canvas Routes Inc. is not responsible for the quality, safety, or suitability of food or beverages served by any third-party establishment. Any dietary requirements, allergies, or food-related concerns are the sole responsibility of the individual member. Canvas Routes accepts no liability for any adverse reaction, illness, or loss arising from food or beverages consumed at third-party venues during Canvas Routes events.',
      },
      {
        title: 'Photo gallery',
        body: 'As a Canvas Routes member, you may submit photos and media to be stored in your private member profile. Member-submitted photos are stored securely and are not shared publicly or with other members unless you explicitly choose to make them visible. Event photos taken by Canvas Routes organizers may be shared in the member gallery or on Canvas Routes social media channels. If you wish to have a specific photo removed, contact info@canvasroutes.com and it will be removed within 14 days.',
      },
      {
        title: 'Partner discounts',
        body: 'Canvas Routes members may be offered promotional discounts or promo codes through our partner brands and sponsors. All partner discounts are subject to availability and may be modified, suspended, or withdrawn at any time by the partner or by Canvas Routes without notice. Promo codes are non-transferable and may be subject to additional terms set by the issuing partner. Canvas Routes makes no warranty or guarantee regarding the continued availability of any partner discount or the quality of partner products and services.',
      },
      {
        title: 'Intellectual property',
        body: 'Photos, videos, and other content produced by Canvas Routes may not be reproduced, shared commercially, or used without prior written permission. By attending Canvas Routes events, members consent to being photographed or filmed for community use, including on the Canvas Routes website and social media channels.',
      },
      {
        title: 'Limitation of liability',
        body: "Événements Canvas Routes Inc., its directors, officers, organizers, and representatives are not liable for any personal injury, property damage, vehicle damage, or loss of any kind arising from participation in Canvas Routes events or activities, including routes, Cars & Coffee gatherings, or any other organized event. This limitation extends to injuries, losses, or damages arising from participation in third-party activities suggested or arranged in connection with Canvas Routes events, and to any adverse experience at third-party food and beverage establishments. Members are solely responsible for maintaining appropriate vehicle insurance and ensuring their vehicle is roadworthy. Participation in all Canvas Routes activities is voluntary and at each member's own risk.",
      },
      {
        title: 'Governing law',
        body: 'These Terms & Conditions are governed by and construed in accordance with the laws of the Province of Quebec and the laws of Canada applicable therein, without regard to conflict of law principles. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts of the Province of Quebec.',
      },
      {
        title: 'Contact',
        body: 'If you have any questions about these Terms & Conditions, please contact us at info@canvasroutes.com.',
      },
    ],
  },
  fr: {
    pageTitle: 'Conditions générales',
    sections: [
      {
        title: 'Acceptation des conditions',
        body: 'En soumettant une demande d\'adhésion, une inscription à une route, une manifestation d\'intérêt pour une route à venir, une inscription à la liste de notification, ou tout autre formulaire sur Canvas Routes, vous acceptez d\'être lié par les présentes Conditions générales telles qu\'émises par Événements Canvas Routes Inc. / Canvas Routes Events Inc., une société constituée au Québec, Canada. Si vous n\'êtes pas d\'accord, veuillez ne pas soumettre de demande ou d\'inscription.',
      },
      {
        title: 'Paliers d\'adhésion',
        body: 'Canvas Routes offre deux paliers d\'adhésion par saison. Routes Member coûte 99 $ CAD par saison et comprend l\'accès aux événements, routes et rassemblements Cars & Coffee de Canvas Routes tel que décrit sur le site. Inner Circle coûte 249 $ CAD par saison et comprend tout ce qui est inclus dans Routes Member, avec un accès prolongé jusqu\'en novembre et des avantages supplémentaires tel que décrit sur le site. La saison standard s\'étend de juin à octobre. L\'adhésion Inner Circle se prolonge jusqu\'en novembre. Les prix sont sujets à changement pour les saisons futures.',
      },
      {
        title: 'Demande et approbation',
        body: 'Toutes les demandes d\'adhésion sont examinées personnellement. Canvas Routes se réserve le droit d\'accepter ou de refuser toute demande à sa seule discrétion, pour quelque raison que ce soit ou sans raison. La soumission d\'une demande ne garantit pas l\'adhésion. Vous serez avisé par courriel du résultat de votre demande.',
      },
      {
        title: 'Paiement',
        body: 'Les frais d\'adhésion sont traités par l\'entremise de Stripe. Lorsque vous complétez le paiement dans le cadre de votre demande d\'adhésion, une autorisation est placée sur votre carte pour les frais d\'adhésion applicables — votre carte n\'est pas débitée à ce moment. Si votre demande est approuvée, le montant autorisé est prélevé et votre adhésion débute. Si votre demande est refusée, l\'autorisation est entièrement levée et aucun débit n\'est effectué; selon votre banque, l\'autorisation peut prendre quelques jours ouvrables avant de disparaître de votre relevé. Tous les prix sont en dollars canadiens (CAD) et sont assujettis aux taxes de vente du Québec applicables (TPS/TVQ), lesquelles sont calculées et affichées avant que vous confirmiez le paiement. L\'adhésion n\'est pas active tant que votre demande n\'a pas été examinée et approuvée par Canvas Routes. En soumettant les détails de votre carte, vous autorisez Événements Canvas Routes Inc. à placer cette autorisation et, en cas d\'approbation, à prélever les frais d\'adhésion applicables.',
      },
      {
        title: 'Annulations et remboursements',
        body: 'Les frais d\'adhésion ne sont pas remboursables une fois votre demande approuvée et la saison commencée. Si votre demande est refusée, un remboursement complet est émis automatiquement. Si vous êtes approuvé mais choisissez de ne pas poursuivre avant le début de la saison, communiquez avec nous dès que possible à info@canvasroutes.com. Si Canvas Routes annule une adhésion sans faute de sa part, un remboursement au prorata peut être émis à notre discrétion selon la portion restante de la saison.',
      },
      {
        title: 'Manifester votre intérêt pour les routes à venir',
        body: 'Notre page Routes énumère les circuits prévus qui seront lancés une fois qu\'un nombre suffisant de conducteurs auront manifesté leur intérêt. Manifester son intérêt est gratuit et ne constitue ni une réservation, ni un engagement d\'aucune sorte — cela indique que vous souhaitez participer, et aucun renseignement de paiement n\'est recueilli. Chaque route prévue a un seuil d\'intérêt minimal; une fois ce seuil atteint, Canvas Routes peut lancer la route et aviser tous les inscrits sur la liste d\'intérêt par courriel avec les détails complets, y compris les frais par voiture et la façon de confirmer une place. Le nombre d\'intéressés affiché sur le site est indicatif seulement. Canvas Routes peut modifier, reporter ou retirer toute route prévue à sa discrétion, y compris lorsque le seuil d\'intérêt n\'est pas atteint, et manifester son intérêt ne garantit pas qu\'une route aura lieu, que des places seront disponibles, ou que vous obtiendrez une place. Les membres reçoivent la priorité lors de la confirmation des places. Les préférences de voyage que vous partagez en manifestant votre intérêt servent à planifier la route et n\'entraînent aucune obligation de part ou d\'autre.',
      },
      {
        title: 'Frais de route',
        body: 'Les frais de participation aux routes varient selon l\'événement et sont indiqués sur la page de l\'événement individuel ou, pour les routes annoncées par le processus de manifestation d\'intérêt, dans le courriel de lancement — les frais par voiture sont établis pour chaque route selon sa longueur, les arrêts prévus, les nuitées et la logistique, et sont toujours communiqués avant la perception de tout paiement, plus les taxes de vente du Québec applicables (TPS/TVQ). Lors de votre inscription, une autorisation est placée sur votre carte pour les frais applicables; chaque inscription est examinée personnellement, et l\'autorisation n\'est prélevée (débitée) qu\'une fois votre place confirmée — si elle n\'est pas confirmée, l\'autorisation est entièrement levée et aucun débit n\'est effectué. Les frais de route ne sont pas remboursables une fois votre inscription confirmée et l\'autorisation prélevée. Si vous ne pouvez pas participer après la confirmation, vous pouvez transférer votre place à un autre membre admissible de Canvas Routes avec l\'approbation écrite préalable de info@canvasroutes.com. Canvas Routes se réserve le droit d\'annuler ou de reporter toute route en raison de la météo, de l\'état des routes ou d\'autres circonstances hors de son contrôle — dans ces cas, un remboursement complet sera émis.',
      },
      {
        title: 'Conduite des membres',
        body: 'Les membres doivent traiter les autres membres, invités et établissements avec respect en tout temps. Toute conduite dangereuse, irrespectueuse, menaçante ou autrement nuisible à la communauté Canvas Routes ne sera pas tolérée. Canvas Routes se réserve le droit de révoquer une adhésion en tout temps, sans remboursement, pour toute conduite qui contrevient à ces normes. Ceci s\'applique aux événements, lors des circuits et dans tout espace communautaire associé à Canvas Routes.',
      },
      {
        title: 'Événements et décharges',
        body: 'Les horaires, lieux et formats des événements peuvent changer sans préavis. Une décharge de responsabilité peut être exigée à tous les événements Canvas Routes, y compris les routes, les rassemblements Cars & Coffee et toute autre activité organisée. En vous inscrivant à un événement Canvas Routes ou en y participant, vous acceptez de signer toute décharge présentée lors de l\'événement. Les membres qui participent aux routes, circuits et autres événements le font entièrement à leurs propres risques. Canvas Routes n\'organise aucune course ni activité de conduite illégale, et les membres doivent respecter en tout temps les lois de la circulation applicables.',
      },
      {
        title: 'Enregistrement pour l\'événement',
        body: 'Pour les événements qui l\'exigent, vous devez compléter un enregistrement numérique à l\'avance, qui peut inclure les détails de votre trajet (passagers, restrictions alimentaires, numéro WhatsApp), un choix de repas lorsqu\'un repas est inclus, et la décharge de responsabilité. Le fait de taper votre nom légal complet dans le champ de signature et de soumettre la décharge constitue votre signature électronique et a le même effet juridique qu\'une signature manuscrite — l\'horodatage et l\'adresse IP de votre soumission sont enregistrés afin d\'établir que la décharge a été valablement signée. La participation peut être conditionnelle à la réalisation de l\'enregistrement avant toute échéance qui vous est communiquée (par exemple, une date limite de choix de repas). Lorsqu\'un vote pour les Route Awards est offert, celui-ci est facultatif, pour le plaisir, et décidé par vote des participants; Canvas Routes a la discrétion finale sur la validité des votes, le bris d\'égalité et la façon dont tout rabais associé est appliqué, et le résultat n\'est ni transférable ni échangeable contre de l\'argent.',
      },
      {
        title: 'Activités de tiers',
        body: 'Certains événements Canvas Routes peuvent inclure des activités optionnelles ou suggérées, exploitées par des tiers indépendants, notamment mais sans s\'y limiter Ziptrek Ecotours, Skyline Luge, des restaurants et d\'autres fournisseurs de services. La participation à toute activité de tiers est entièrement volontaire et assujettie aux propres conditions, décharges et règles de sécurité de ce fournisseur. Événements Canvas Routes Inc. n\'a aucune affiliation avec, et n\'accepte aucune responsabilité pour, toute blessure, perte ou dommage découlant de la participation à des activités organisées ou exploitées par des tiers.',
      },
      {
        title: 'Nourriture et boissons',
        body: 'Les événements Canvas Routes peuvent inclure des repas de groupe dans des restaurants et cafés tiers. Événements Canvas Routes Inc. n\'est pas responsable de la qualité, de la sécurité ou de la pertinence de la nourriture ou des boissons servies par tout établissement tiers. Toute exigence alimentaire, allergie ou préoccupation liée à la nourriture relève de la seule responsabilité du membre concerné. Canvas Routes n\'accepte aucune responsabilité pour toute réaction indésirable, maladie ou perte découlant de la nourriture ou des boissons consommées dans des établissements tiers lors des événements Canvas Routes.',
      },
      {
        title: 'Galerie de photos',
        body: 'En tant que membre de Canvas Routes, vous pouvez soumettre des photos et médias à conserver dans votre profil de membre privé. Les photos soumises par les membres sont conservées de manière sécurisée et ne sont pas partagées publiquement ni avec d\'autres membres, à moins que vous ne choisissiez explicitement de les rendre visibles. Les photos d\'événements prises par les organisateurs de Canvas Routes peuvent être partagées dans la galerie des membres ou sur les réseaux sociaux de Canvas Routes. Si vous souhaitez qu\'une photo précise soit retirée, communiquez avec info@canvasroutes.com et elle sera retirée dans un délai de 14 jours.',
      },
      {
        title: 'Rabais des partenaires',
        body: 'Les membres de Canvas Routes peuvent se voir offrir des rabais promotionnels ou des codes promotionnels par l\'entremise de nos marques et commanditaires partenaires. Tous les rabais des partenaires sont sujets à disponibilité et peuvent être modifiés, suspendus ou retirés en tout temps par le partenaire ou par Canvas Routes, sans préavis. Les codes promotionnels sont non transférables et peuvent être assujettis à des conditions supplémentaires établies par le partenaire émetteur. Canvas Routes ne donne aucune garantie quant à la disponibilité continue de tout rabais partenaire ou à la qualité des produits et services des partenaires.',
      },
      {
        title: 'Propriété intellectuelle',
        body: 'Les photos, vidéos et autre contenu produits par Canvas Routes ne peuvent être reproduits, partagés commercialement ou utilisés sans autorisation écrite préalable. En assistant aux événements Canvas Routes, les membres consentent à être photographiés ou filmés à des fins communautaires, y compris sur le site web et les réseaux sociaux de Canvas Routes.',
      },
      {
        title: 'Limitation de responsabilité',
        body: 'Événements Canvas Routes Inc., ses administrateurs, dirigeants, organisateurs et représentants ne sont pas responsables de toute blessure corporelle, dommage matériel, dommage au véhicule ou perte de quelque nature découlant de la participation aux événements ou activités de Canvas Routes, y compris les routes, les rassemblements Cars & Coffee ou tout autre événement organisé. Cette limitation s\'étend aux blessures, pertes ou dommages découlant de la participation à des activités de tiers suggérées ou organisées en lien avec des événements Canvas Routes, ainsi qu\'à toute expérience indésirable dans des établissements de nourriture et boissons tiers. Les membres sont seuls responsables de maintenir une assurance véhicule appropriée et de s\'assurer que leur véhicule est en état de rouler. La participation à toutes les activités de Canvas Routes est volontaire et aux propres risques de chaque membre.',
      },
      {
        title: 'Loi applicable',
        body: 'Les présentes Conditions générales sont régies et interprétées conformément aux lois de la province de Québec et aux lois du Canada qui s\'y appliquent, sans égard aux principes de conflit de lois. Tout différend découlant des présentes conditions sera soumis à la compétence exclusive des tribunaux de la province de Québec.',
      },
      {
        title: 'Contact',
        body: 'Si vous avez des questions au sujet des présentes Conditions générales, veuillez communiquer avec nous à info@canvasroutes.com.',
      },
    ],
  },
}
