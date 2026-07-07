// Copy for the generalized per-event check-in flow — adapted from
// lib/wtetCheckinI18n.js's English strings, with event-specific bits
// (name, max passengers, contact) parameterized instead of hardcoded.
// Single-language by design (see plan) — WTET's bilingual copy was a
// deliberate one-off for that event, not the general convention.

export const CHECKIN_T = {
  gateTitle: 'Confirm Your Email',
  gateBody: 'Enter the email you registered with to view and complete your check-in.',
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  continueBtn: 'Continue',
  verifyingBtn: 'Verifying…',
  hiName: name => `Hi ${name}`,
  defaultTitle: 'Event Check-in',
  allDoneMsg: "You're all set — see you at the event.",
  incompleteMsg: 'Please complete the item(s) below marked outstanding before the event.',

  // Trip Details
  tripTitle: 'Trip Details',
  tripDoneLabel: 'Complete', tripPendingLabel: 'Not submitted',
  tripDoneMsg: 'Passengers, dietary needs, and WhatsApp number on file. Contact jerry@canvasroutes.com if anything\'s changed.',
  passengersHeader: 'Passengers — including driver',
  driverLabel: 'Driver',
  passengerLabel: n => `Passenger ${n}`,
  fullNameLabel: 'Full name *',
  ageLabel: 'Age *',
  removeBtn: 'Remove',
  addPassengerBtn: '+ Add passenger',
  passengersHint: 'Include everyone in the car — driver first, then any passengers.',
  maxPassengersNote: max => `Maximum ${max} people per car. Email jerry@canvasroutes.com if you need to bring more.`,
  passengerErrBoth: 'Name and age are required.',
  passengerErrName: 'Name is required.',
  passengerErrAge: 'Age is required.',
  dietaryLabel: 'Any dietary allergies or restrictions?',
  dietaryPlaceholder: 'e.g. nut allergy, vegetarian… or leave blank',
  whatsappLabel: 'WhatsApp number for group chat (optional)',
  whatsappPlaceholder: '+1 514 555 0100',
  whatsappHint: "We'll add you to the group chat for this event.",
  saveTripBtn: 'Save Trip Details',
  savingBtn: 'Saving…',

  // Waiver
  waiverTitle: 'Liability Waiver',
  waiverDoneLabel: 'Signed', waiverPendingLabel: 'Not signed',
  signedByOn: 'Signed on',
  waiverLockedNote: 'This waiver is locked and cannot be edited. Contact jerry@canvasroutes.com for corrections.',
  agreeLabel: 'I have read and agree to the terms above.',
  signatureLabel: 'Signature — type your full legal name *',
  signaturePlaceholder: 'Type your full name',
  signatureHint: 'Typing your name here counts as your legal signature.',
  vehicleHeader: 'Vehicle',
  yearLabel: 'Year', makeLabel: 'Make', modelLabel: 'Model',
  bringingPassengers: "I'm bringing passenger(s)",
  passengerNamePlaceholder: 'Passenger name',
  agePlaceholder: 'Age',
  emergencyHeader: 'Emergency Contact',
  nameLabel: 'Name *', phoneLabel: 'Phone *',
  phonePlaceholder: '+1 514 000 0000',
  signWaiverBtn: 'Sign Waiver',
  signingBtn: 'Signing…',
  waiverErrAgree: 'You must check the box confirming you have read and agree to the waiver.',
  waiverErrName: 'Please type your full name as your signature.',
  waiverErrEmergency: 'Emergency contact name and phone are required.',

  // Lunch
  lunchTitle: 'Lunch Preference',
  lunchDoneLabel: 'Selected', lunchPendingLabel: 'Not selected', lunchDeadlinePassedLabel: 'Deadline passed',
  lunchSelectedPost: '.',
  lunchLockedNote: 'Selections are now locked. Contact jerry@canvasroutes.com if you need to make a change.',
  lunchChangeUntil: date => `You can change your selection until ${date}.`,
  changeSelectionBtn: 'Change selection',
  lunchDeadlinePassedBody: date => `The deadline to select a lunch dish (${date}) has passed. Contact`,
  lunchDeadlinePassedBody2: "if you haven't chosen yet.",
  chooseOneUntil: date => `Choose one for each person. You can change this until ${date}.`,
  saveSelectionBtn: 'Save Selection',
  cancelBtn: 'Cancel',
  lunchErrDish: 'Please select a dish for everyone in the car.',
  lunchNeedsTripFirst: 'Complete your trip details first so we know who\'s ordering lunch.',
  lunchForPerson: (name, isDriver) => `Lunch — ${name}${isDriver ? ' (Driver)' : ' (Passenger)'}`,
  lunchAllRequired: 'A dish selection is required for everyone in the car.',

  genericError: 'Something went wrong.',
  networkError: 'Network error — please try again.',
  invalidEmailError: 'Please enter a valid email address.',
}

export function checkinDateLocale() { return 'en-CA' }
