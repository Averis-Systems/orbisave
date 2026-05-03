/**
 * Shared demo data for the OrbiSave landing page visualizations.
 * Single source of truth — imported by page.tsx (Hero SVG) and RotationVisualizer.tsx.
 * All demo amounts are in KES (Kenya) for consistency.
 */

export interface OrbitalMember {
  id: number
  initials: string
  name: string
  country: "KEN" | "RWA" | "GHA"
  /** SVG cx position for the hero orbital */
  sx: number
  /** SVG cy position for the hero orbital */
  sy: number
  isPayout: boolean
}

export const ORBITAL_MEMBERS: OrbitalMember[] = [
  { id: 0, initials: "AK", name: "Amara K.",  country: "KEN", sx: 240, sy: 65,  isPayout: true  },
  { id: 1, initials: "KO", name: "Kwame O.",  country: "KEN", sx: 392, sy: 152, isPayout: false },
  { id: 2, initials: "NW", name: "Njeri W.",  country: "KEN", sx: 392, sy: 328, isPayout: false },
  { id: 3, initials: "KA", name: "Kofi A.",   country: "KEN", sx: 240, sy: 415, isPayout: false },
  { id: 4, initials: "FM", name: "Fatima M.", country: "KEN", sx: 88,  sy: 328, isPayout: false },
  { id: 5, initials: "DO", name: "David O.",  country: "KEN", sx: 88,  sy: 152, isPayout: false },
]

export const DEMO_PAYOUT_AMOUNT = "KES 48,500"
export const DEMO_VAULT_AMOUNT  = "KES 1.2M"
export const DEMO_CYCLE         = "Cycle 3"
export const DEMO_CURRENCY      = "KES"

export const TRUST_PILLARS = [
  "Your money is kept in safe bank accounts, not by OrbiSave.",
  "Every payment is recorded forever so there are no money fights.",
  "Your leaders must all agree before any big money is moved.",
]

export const PAST = [
  { initials: "RK", name: "Rose K.",  amount: DEMO_PAYOUT_AMOUNT, cycle: "Cycle 1" },
  { initials: "JM", name: "James M.", amount: DEMO_PAYOUT_AMOUNT, cycle: "Cycle 2" },
]

export const ROTATION_QUEUE = ORBITAL_MEMBERS.map((m, index) => ({
  position: index + 1,
  initials: m.initials,
  name: m.name,
  country: m.country,
  amount: DEMO_PAYOUT_AMOUNT,
  status: m.isPayout ? "current" : "upcoming",
  cycle: `Cycle ${index + 3}`
}))
