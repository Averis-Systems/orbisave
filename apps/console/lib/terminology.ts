export const consoleCopy = {
  nav: {
    overview: "Overview",
    countries: "Countries",
    platformAdmins: "Platform Admins",
    groups: "Groups",
    membersKyc: "Members & KYC",
    loans: "Loans",
    providers: "Providers",
    savings: "Savings",
    trustAccounts: "Trust Accounts",
    analytics: "Analytics",
    auditLogs: "Audit Logs",
    settings: "Settings",
  },
  shell: {
    title: "Console",
    userFallback: "Super Admin",
    scope: "Global oversight",
    signOut: "Sign Out",
  },
} as const

export function ct(path: string, dictionary = consoleCopy): string {
  const value = path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, dictionary)

  return typeof value === "string" ? value : path
}
