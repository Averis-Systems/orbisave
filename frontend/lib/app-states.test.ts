import { describe, expect, it } from "vitest"

import {
  FINANCIAL_OUTCOME_KEYS,
  PAGE_STATE_KEYS,
  getAppState,
  getFinancialOutcome,
} from "./app-states"

describe("app state catalog", () => {
  it("covers the required page, empty, success, warning, and error states", () => {
    expect(PAGE_STATE_KEYS).toEqual(
      expect.arrayContaining([
        "global.notFound",
        "global.serverError",
        "dashboard.notFound",
        "groups.empty",
        "notifications.empty",
        "contributions.empty",
        "contributions.noMembers",
        "contributions.failed",
        "loans.empty",
        "loans.noReview",
        "fines.empty",
        "fines.pending",
        "kyc.pending",
        "kyc.submitted",
        "kyc.verified",
      ]),
    )
  })

  it("keeps financial outcomes explicit for account, loan, payout, contribution, and fine flows", () => {
    expect(FINANCIAL_OUTCOME_KEYS).toEqual(
      expect.arrayContaining([
        "accountVerified",
        "loanRequested",
        "loanReceived",
        "loanApproved",
        "loanDeclined",
        "payoutQueued",
        "payoutReceived",
        "contributionConfirmed",
        "contributionMissed",
        "fineIssued",
        "fineSettled",
      ]),
    )
  })

  it("marks account verification, loan receipt, and payout receipt as success states", () => {
    expect(getFinancialOutcome("accountVerified").tone).toBe("success")
    expect(getFinancialOutcome("loanReceived").tone).toBe("success")
    expect(getFinancialOutcome("payoutReceived").tone).toBe("success")
  })

  it("marks missed contribution and pending fines as warning states with member-friendly guidance", () => {
    expect(getFinancialOutcome("contributionMissed").tone).toBe("warning")
    expect(getAppState("fines.pending").tone).toBe("warning")
    expect(getFinancialOutcome("contributionMissed").description).toMatch(/settle/i)
    expect(getAppState("fines.pending").description).toMatch(/settle/i)
  })
})
