type TranslationValue = string | TranslationTree
type TranslationTree = { [key: string]: TranslationValue }

export const dashboardCopy = {
  dashboard: {
    actions: {
      createGroup: "Create Group",
      verifyNow: "Verify Now",
      editProfile: "Edit profile",
      accountSettings: "Account settings",
      support: "Support",
      signOut: "Sign out",
    },
    labels: {
      activeGroup: "Active Group",
      groupActivity: "Group Activity",
      walletActivity: "Wallet Activity",
      groupWallet: "Group Wallet",
      totalGroupWallet: "Total Group Wallet",
      contributionRules: "Contribution Rules",
      contributionCollections: "Contribution Collections",
    },
    metrics: {
      totalMembers: "Total Members",
      rotationSavingsTotal: "Rotation Savings Total",
      loanPool: "Loan Pool",
      totalGroupWallet: "Total Group Wallet",
      weeklyContributionTarget: "Weekly Contribution Target",
      monthlyContributionTarget: "Monthly Contribution Target",
    },
    nav: {
      overview: "Overview",
      myGroup: "My Group",
      contributions: "Contributions",
      savings: "Savings",
      loans: "Loans",
      myLoans: "My Loans",
      members: "Members",
      loanApprovals: "Loan Approvals",
      rotations: "Rotations",
      meetings: "Meetings",
      notifications: "Notifications",
      personalProfile: "Personal Profile",
      groupSettings: "Group Settings",
    },
    emptyStates: {
      noGroups: "You have not joined or created any groups yet. Start by creating your first group.",
      noContributions: "No contributions have been recorded for this group yet.",
      noLoans: "You have not requested financing from this group yet.",
      noSavings: "Mandatory savings will appear here after the first automatic deduction.",
    },
  },
} as const

export const forbiddenTemplateTerms = [
  "Customers",
  "Orders",
  "Ecommerce",
  "Recent Orders",
  "Monthly Sales",
  "Create Pool",
  "Active Pool",
  "Console Home",
  "Provider Hub",
  "Production Network",
  "Terminate Session",
  "randomuser",
  "Musharof",
] as const

export function t(path: string, dictionary: TranslationTree = dashboardCopy): string {
  const value = path.split(".").reduce<TranslationValue | undefined>((current, segment) => {
    if (!current || typeof current === "string") return undefined
    return current[segment]
  }, dictionary)

  return typeof value === "string" ? value : path
}
