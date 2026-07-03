import { describe, expect, it } from "vitest"
import { buildDashboardMetrics, getUserDashboardNavItems } from "./dashboard-reference"

describe("dashboard reference labels", () => {
  it("renames the template ecommerce cards for OrbiSave group wallet language", () => {
    const metrics = buildDashboardMetrics({
      memberCount: 18,
      maxMembers: 30,
      rotationPool: 125000,
      totalPool: 180000,
      loanPool: 55000,
      currency: "KES",
      frequency: "monthly",
    })

    expect(metrics.map((metric) => metric.label)).toEqual([
      "Total Members",
      "Rotation Savings Total",
      "Loan Pool",
      "Total Group Wallet",
    ])
    expect(metrics[1].value).toBe("KES 125,000")
    expect(metrics[0].sub).toBe("18 of 30 active seats")
  })

  it("exposes the user dashboard pages with group and savings language", () => {
    const names = getUserDashboardNavItems("chairperson", true).flatMap((section) =>
      section.items.map((item) => item.name),
    )

    expect(names).toEqual([
      "Overview",
      "My Group",
      "Contributions",
      "Savings",
      "Loans",
      "Members",
      "Rotations",
      "Meetings",
      "Notifications",
      "Personal Profile",
      "Group Settings",
    ])
    expect(names.some((name) => name.includes("Pool"))).toBe(false)
  })
})
