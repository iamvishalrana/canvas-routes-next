-- "we need registrants, awards, waiver and lunch sections in admin panel for
-- each route" — that admin UI (Registrants / Check-in / Route Awards tabs)
-- already exists generically in Events admin for any events row with
-- checkin_enabled/awards_enabled set (see EventsClient.jsx, lib/eventCheckinShared.js).
-- WTET and Into the Laurentians already have a linked `events` row (type =
-- 'Route') for exactly this. Hello to Montebello's was deleted by migration
-- 20260716_routes_past_and_reorder.sql when it moved into upcoming_routes —
-- this recreates it, wires check-in (trip details/waiver/lunch) and Route
-- Awards, and links it back via the new upcoming_routes.event_id column so
-- future routes can follow the same pattern (see the POST /api/admin/
-- upcoming-routes handler, which now creates this link automatically).

ALTER TABLE public.upcoming_routes
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;

WITH new_event AS (
  INSERT INTO public.events (
    name, date, date_display, location, description, type, trip_length,
    registration_url, member_price, registration_enabled, public_registration_enabled,
    checkin_enabled, checkin_sections, checkin_max_passengers, checkin_lunch_options, checkin_waiver_text,
    awards_enabled, awards_categories, awards_ineligible_names
  )
  SELECT
    'Hello to Montebello', '2026-08-01', '1 August 2026', 'Montebello, QC',
    'A curated convoy from Montreal to Fairmont Le Château Montebello — coffee at L''Atelier des Deux P in Amherst, lunch at Aux Chantignoles inside the largest log château in the world, and a stop at Chocomotive before the drive home.',
    'Route', 'Same Day',
    'https://canvasroutes.com/hello-to-montebello', 19900, true, true,
    true, ARRAY['trip_details','waiver','lunch'], 2,
    '[{"id":"rotini","name":"Rotini salad with pesto & grilled chicken","description":"Rotini pasta salad with pesto, green olives, balsamic, and grilled chicken."},{"id":"ravioli","name":"Squash ravioli (vegetarian)","description":"Squash ravioli in a cheese and sage sauce."}]'::jsonb,
    'PARTICIPANT LIABILITY WAIVER & RELEASE OF CLAIMS
Hello to Montebello Road Trip — August 1, 2026
Montreal to Fairmont Le Château Montebello — Private Invite-Only Convoy

PLEASE READ THIS DOCUMENT CAREFULLY BEFORE PARTICIPATING. BY SIGNING BELOW, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY ALL TERMS SET FORTH IN THIS WAIVER.

1. Parties
This Waiver and Release of Claims ("Agreement") is entered into between Événements Canvas Routes Inc. / Canvas Routes Events Inc. ("Organizer") and the undersigned participant ("Participant") for participation in the Hello to Montebello Road Trip on August 1, 2026, departing from Laval and concluding at Fairmont Le Château Montebello in Montebello, QC (the "Event").

2. Event Description & What Is Included
Événements Canvas Routes Inc. is providing the following as part of the Event at no additional cost to the Participant beyond the registration fee:
- A curated convoy through Quebec''s Outaouais backroads led by Vishal Rana (Jerry)
- A three-course lunch at Aux Chantignoles, inside Fairmont Le Château Montebello, overlooking the Ottawa River
- Route navigation support via Velox convoy application

3. What Is Not Included
The following are expressly not covered or provided by Événements Canvas Routes Inc. and remain the sole responsibility of the Participant:
- Fuel costs for the Participant''s vehicle
- Drinks at lunch, and any coffee, snacks, or purchases at any of the route''s stops
- Any personal activities, shops, or experiences chosen independently
- Vehicle insurance or any other form of insurance coverage
- Mechanical breakdowns, towing, or roadside assistance
- Any damage to the Participant''s vehicle, personal property, or third-party property
- Medical or emergency expenses arising from participation
- Any fines, tickets, or penalties resulting from the Participant''s driving conduct

4. Assumption of Risk
The Participant acknowledges and understands that participation in the Event involves inherent risks, including but not limited to:
- Vehicle accidents, collisions, or mechanical failures
- Road hazards including debris, poor road conditions, construction, and adverse weather
- Personal injury, disability, or death
- Damage to or loss of personal property or vehicle
- Actions of other drivers, participants, or third parties not affiliated with Événements Canvas Routes Inc.
- Acts of God or unforeseeable circumstances
- Wildlife on roadways or rural road conditions
- Uneven or unpaved parking surfaces at any venue along the route

The Participant voluntarily assumes all risks associated with participation in the Event, whether or not such risks are listed above.

5. Release of Liability
In consideration of being permitted to participate in the Event, the Participant, on behalf of themselves, their heirs, executors, administrators, and assigns, hereby releases, waives, discharges, and covenants not to sue Événements Canvas Routes Inc. / Canvas Routes Events Inc., its founder Vishal Rana (Jerry), organizers, volunteers, partners, and affiliated venues including Fairmont Le Château Montebello (collectively "Released Parties") from any and all claims, demands, actions, causes of action, or liability of any kind arising out of or in connection with participation in the Event, including claims arising from the negligence of the Released Parties.

6. Participant Responsibilities
The Participant agrees to:
- Operate their vehicle safely and in full accordance with the Highway Safety Code of Quebec (Code de la sécurité routière) and all applicable traffic laws at all times
- Maintain valid vehicle registration, automobile insurance, and a valid driver''s licence for the duration of the Event
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
- They hold a valid driver''s licence appropriate for the vehicle being operated
- Événements Canvas Routes Inc. does not provide, arrange, or extend any insurance coverage of any kind to participants, passengers, or vehicles
- Any damage, loss, or liability related to the Participant''s vehicle remains solely the responsibility of the Participant and their insurer

8. Passengers
If the Participant is bringing one or more passengers:
- The Participant is solely responsible for the safety and conduct of all passengers in their vehicle throughout the entire Event
- All passengers must be 18 years of age or older unless the Participant accepts full parental or guardian responsibility in writing
- The Participant confirms their vehicle is insured to carry the number of passengers declared
- Événements Canvas Routes Inc. assumes no liability whatsoever for passengers, including minors

9. Food, Drinks & Allergies
The Participant acknowledges and agrees that:
- Événements Canvas Routes Inc. assumes no liability for any illness, allergic reaction, injury, or adverse effect arising from food or beverages consumed at any venue during the Event
- The Participant is solely responsible for disclosing any food allergies or dietary restrictions directly to Canvas Routes prior to the Event
- The Participant is solely responsible for ensuring they do not drive while impaired if they choose to purchase and consume alcohol at lunch (not included in the registration fee)

10. Indemnification
The Participant agrees to indemnify, defend, and hold harmless the Released Parties from and against any and all claims, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or resulting from the Participant''s participation in the Event, including but not limited to any claim arising from the Participant''s negligence, reckless conduct, or violation of applicable laws.

11. Media Release
The Participant grants Événements Canvas Routes Inc. / Canvas Routes Events Inc. permission to photograph, film, and record the Participant and their vehicle during the Event, and to use such images and recordings for promotional, social media, and marketing purposes without compensation. The Participant may opt out of media use by notifying the Organizer in writing prior to the Event.

12. Route Modifications & Cancellations
Événements Canvas Routes Inc. reserves the right to modify, delay, or cancel any portion of the Event route, stops, or schedule due to weather, road conditions, safety concerns, or other circumstances beyond the Organizer''s control. No refunds will be issued for changes made on safety grounds.

13. Governing Law
This Agreement shall be governed by and construed in accordance with the laws of the Province of Quebec, Canada. Any dispute arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the courts of the Province of Quebec.

14. Severability
If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.

15. Entire Agreement
This Agreement constitutes the entire agreement between the Participant and Événements Canvas Routes Inc. with respect to the subject matter hereof and supersedes all prior agreements, understandings, and representations.

BY SIGNING BELOW, THE PARTICIPANT CONFIRMS THAT THEY HAVE READ AND UNDERSTOOD THIS WAIVER IN ITS ENTIRETY AND VOLUNTARILY AGREE TO ITS TERMS.',
    true,
    '[{"id":"best_energy","label":"Most Entertaining Person/Car","body":"The \"main character energy\" award. Loud pipes, bigger personality, showed up and instantly became the plot of the day. This is for the car-and-driver combo that brought the chaos — the good kind — and had everyone buzzing at every single stop. Who couldn''t you look away from?","discount_pct":40},{"id":"most_beautiful","label":"Most Beautiful Car","body":"The \"okay wow\" award. This one''s got nothing to do with horsepower or lap times — it''s pure curb appeal. Which car made you stop mid-sentence and just stare? The one that got every phone out at every stop. Vote for the ride that was simply too good-looking to ignore.","discount_pct":25},{"id":"best_driver","label":"Best Driver","body":"The \"never spilled my coffee\" award. Not the fastest — the smoothest. Who held their line, read the road, and made the whole convoy feel effortless to follow, corner after corner? Vote for the driver you''d trust to drive your own car blindfolded (please don''t actually try that).","discount_pct":15}]'::jsonb,
    ARRAY['Jerry']
  WHERE NOT EXISTS (SELECT 1 FROM public.events WHERE name = 'Hello to Montebello' AND type = 'Route')
  RETURNING id
)
UPDATE public.upcoming_routes SET event_id = (SELECT id FROM new_event)
WHERE slug = 'hello-to-montebello' AND EXISTS (SELECT 1 FROM new_event);
