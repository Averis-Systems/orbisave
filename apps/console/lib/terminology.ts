export const consoleCopy = {
  // Group headings in the sidebar. Kept short so they read as quiet section
  // labels, not competing nav items.
  sections: {
    operations: "Operations",
    oversight: "Oversight",
    platform: "Platform",
  },
  nav: {
    overview: "Overview",
    countries: "Countries",
    groups: "Groups",
    // One entry covering both populations. Staff and members are tabs on the
    // Users page, not separate nav items listing overlapping people.
    users: "Users",
    loans: "Loans",
    savings: "Savings",
    trustAccounts: "Trust Accounts",
    analytics: "Analytics",
    auditLogs: "Audit Logs",
    // Providers & Config is an expandable parent. Its children are the three
    // configuration surfaces that actually exist as routes today; nothing here
    // points at a page that has not been built.
    providersConfig: "Providers & Config",
    paymentProviders: "Payment Providers",
    apiIntegrations: "API & Integrations",
    platformSettings: "Platform Settings",
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
