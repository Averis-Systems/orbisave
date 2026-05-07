export interface OrbitalMember {
  id: number
  initials: string
  name: string
  country: "KEN" | "RWA" | "GHA"
  sx: number
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

export const G = {
  900: "#012b0f",
  800: "#014d1b",
  700: "#016828",
  600: "#018a35",
  500: "#009A44",  // Safaricom primary
  400: "#00b84f",
  300: "#33cc72",
  200: "#80e3aa",
  100: "#ccf2de",
  50:  "#f0fbf4",
};

export const GROUP = {
  name: "Kisumu Agri Chama",
  id: "KAC-2025-001",
  location: "Kisumu, Western Kenya",
  started: "Jan 2025",
  chairperson: "David Omondi",
  treasurer: "Faith Otieno",
  secretary: "James Mwangi",
  totalMembers: 20,
  activeMembers: 18,
  totalPool: 487500,
  monthlyContribution: 5000,
  nextPayoutMember: "Grace Akinyi",
  nextPayoutDate: "12 days",
  nextPayoutAmount: 100000,
  cycleMonth: 9,
  totalCycles: 20,
  groupHealth: 87,
  trustAccount: "KCB Bank – Trust A/C #00847291",
  floatBalance: 12400,
  loanPoolBalance: 45000,
};

export const MEMBERS = [
  { id:1, name:"Grace Akinyi",    phone:"0712 345 678", status:"active", paid:true,  rotation:1, loanActive:false, joinDate:"Jan 2025", contributions:9, missed:0,  nextPayout:true,  kyc:"verified" },
  { id:2, name:"David Omondi",    phone:"0723 456 789", status:"active", paid:true,  rotation:2, loanActive:false, joinDate:"Jan 2025", contributions:9, missed:0,  nextPayout:false, kyc:"verified", isChair:true },
  { id:3, name:"Faith Otieno",    phone:"0734 567 890", status:"active", paid:true,  rotation:3, loanActive:false, joinDate:"Jan 2025", contributions:9, missed:0,  nextPayout:false, kyc:"verified", isTreasurer:true },
  { id:4, name:"James Mwangi",    phone:"0745 678 901", status:"active", paid:false, rotation:4, loanActive:true,  joinDate:"Jan 2025", contributions:8, missed:1,  nextPayout:false, kyc:"verified", isSecretary:true },
  { id:5, name:"Mary Wanjiku",    phone:"0756 789 012", status:"active", paid:true,  rotation:5, loanActive:false, joinDate:"Jan 2025", contributions:9, missed:0,  nextPayout:false, kyc:"verified" },
  { id:6, name:"Peter Kamau",     phone:"0767 890 123", status:"active", paid:false, rotation:6, loanActive:false, joinDate:"Jan 2025", contributions:7, missed:2,  nextPayout:false, kyc:"verified" },
  { id:7, name:"Ann Chebet",      phone:"0778 901 234", status:"active", paid:true,  rotation:7, loanActive:false, joinDate:"Feb 2025", contributions:8, missed:1,  nextPayout:false, kyc:"verified" },
  { id:8, name:"John Kipchoge",   phone:"0789 012 345", status:"active", paid:true,  rotation:8, loanActive:true,  joinDate:"Jan 2025", contributions:9, missed:0,  nextPayout:false, kyc:"verified" },
];

export const LOANS = [
  { id:"LN-001", member:"James Mwangi",   amount:15000, purpose:"Fertilizer purchase", requested:"Sep 28, 2025", status:"pending",  approvals:{chair:false,treasurer:false}, interest:10, term:"3 months", collateral:"Rotation payout" },
  { id:"LN-002", member:"John Kipchoge",  amount:8000,  purpose:"Medical emergency",   requested:"Oct 1, 2025",  status:"active",   approvals:{chair:true, treasurer:true},  interest:10, term:"2 months", disbursed:"Oct 3, 2025", repaid:3200, due:"Dec 3, 2025" },
  { id:"LN-003", member:"Mary Wanjiku",   amount:12000, purpose:"School fees",         requested:"Sep 15, 2025", status:"repaid",   approvals:{chair:true, treasurer:true},  interest:10, term:"2 months" },
  { id:"LN-004", member:"Esther Nyambura",amount:5000,  purpose:"Business stock",      requested:"Oct 2, 2025",  status:"pending",  approvals:{chair:false,treasurer:false}, interest:10, term:"1 month", collateral:"Savings record" },
];

export const CONTRIBUTIONS_HISTORY = [
  { month:"Feb", collected:95000, target:100000 },
  { month:"Mar", collected:100000,target:100000 },
  { month:"Apr", collected:90000, target:100000 },
  { month:"May", collected:100000,target:100000 },
  { month:"Jun", collected:85000, target:100000 },
  { month:"Jul", collected:100000,target:100000 },
  { month:"Aug", collected:95000, target:100000 },
  { month:"Sep", collected:100000,target:100000 },
  { month:"Oct", collected:72000, target:100000 },
];

export const TRANSACTIONS = [
  { id:"TXN-1021", date:"Oct 5, 2025",  type:"contribution", member:"David Omondi",    amount:5000,  direction:"in",  status:"confirmed", ref:"MPesa:QFJ7823K" },
  { id:"TXN-1020", date:"Oct 5, 2025",  type:"contribution", member:"Grace Akinyi",    amount:5000,  direction:"in",  status:"confirmed", ref:"MPesa:QFJ7822K" },
  { id:"TXN-1019", date:"Oct 5, 2025",  type:"contribution", member:"Faith Otieno",    amount:5000,  direction:"in",  status:"confirmed", ref:"MPesa:QFJ7821K" },
  { id:"TXN-1018", date:"Oct 3, 2025",  type:"loan_disburse",member:"John Kipchoge",   amount:8000,  direction:"out", status:"confirmed", ref:"MPesa:QFG5511J" },
  { id:"TXN-1017", date:"Oct 3, 2025",  type:"contribution", member:"Mary Wanjiku",    amount:5000,  direction:"in",  status:"confirmed", ref:"MPesa:QFG5510J" },
];

export const MEETINGS = [
  { id:"MTG-009", date:"Oct 12, 2025", time:"10:00 AM", type:"monthly",   status:"upcoming", agenda:["October contribution review","LN-001 loan approval vote","LN-004 loan approval vote","Q4 savings plan discussion"], attendance:null },
  { id:"MTG-008", date:"Sep 14, 2025", time:"10:00 AM", type:"monthly",   status:"completed",agenda:["September contributions","Charles Mutua payout confirmation","Loan engine policy update"],attendance:18 },
];

export const ROTATION_SCHEDULE = [
  { position:1, member:"Grace Akinyi",    status:"upcoming", month:"Oct 2025", amount:100000 },
  { position:2, member:"James Mwangi",    status:"scheduled",month:"Nov 2025", amount:100000 },
  { position:3, member:"Mary Wanjiku",    status:"scheduled",month:"Dec 2025", amount:100000 },
  { position:4, member:"Ann Chebet",      status:"scheduled",month:"Jan 2026", amount:100000 },
];

export const POOL_DATA = [
  { name:"Main Pool",   value:487500, color: G[500] },
  { name:"Loan Pool",  value:45000,  color: G[300] },
  { name:"Float",      value:12400,  color: G[200] },
];

export const NOTIFICATIONS = [
  { id:1, type:"alert",   title:"3 members have not paid this month",             time:"2 hours ago",  read:false, action:"View Members" },
  { id:2, type:"approval",title:"Loan request LN-001 awaiting your approval",    time:"4 hours ago",  read:false, action:"Review Loan" },
];
