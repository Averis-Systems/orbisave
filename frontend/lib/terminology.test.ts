import { describe, expect, it } from "vitest"
import { dashboardCopy, forbiddenTemplateTerms, t } from "./terminology"

describe("OrbiSave terminology", () => {
  it("exposes translation-ready dashboard copy for the core group wallet terms", () => {
    expect(t("dashboard.actions.createGroup")).toBe("Create Group")
    expect(t("dashboard.labels.activeGroup")).toBe("Active Group")
    expect(t("dashboard.nav.savings")).toBe("Savings")
    expect(t("dashboard.metrics.rotationSavingsTotal")).toBe("Rotation Savings Total")
    expect(t("dashboard.metrics.loanPool")).toBe("Loan Pool")
  })

  it("keeps common dashboard copy free of template ecommerce terms", () => {
    const serializedCopy = JSON.stringify(dashboardCopy).toLowerCase()

    for (const term of forbiddenTemplateTerms) {
      expect(serializedCopy).not.toContain(term.toLowerCase())
    }
  })
})
