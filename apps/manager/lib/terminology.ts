export const managerCopy = {
  nav: {
    overview: "Overview",
    groupVerification: "Group Verification",
    kycReview: "KYC Review",
    members: "Members",
    loans: "Loans",
    contributions: "Contributions",
    savings: "Savings",
    trustAccount: "Trust Account",
    auditLogs: "Audit Logs",
    support: "Support",
    settings: "Settings",
  },
  shell: {
    title: "Manager",
    userFallback: "Admin",
    scopeFallback: "Country operations",
    signOut: "Sign Out",
  },
} as const

export function mt(path: string, dictionary = managerCopy): string {
  const value = path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, dictionary)

  return typeof value === "string" ? value : path
}
