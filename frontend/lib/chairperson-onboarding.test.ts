import { describe, expect, it } from "vitest"
import { buildExistingAccountChairpersonPayload, getChairpersonStepFields, mapFrequencyToBackend } from "./chairperson-onboarding"

describe("chairperson onboarding helpers", () => {
  it("keeps the existing-account wizard focused on non-account chairperson fields", () => {
    expect(getChairpersonStepFields()).toEqual([
      ["group_name", "group_type", "contribution_amount", "contribution_frequency", "mandatory_savings_amount"],
      ["level1", "level2"],
      ["agreePrivacy", "agreeTerms"],
      ["transaction_pin"],
    ])
  })

  it("maps the full chairperson setup into the backend group payload", () => {
    const payload = buildExistingAccountChairpersonPayload({
      country: "kenya",
      group_name: "Sunrise Farmers",
      group_type: "Farmers",
      contribution_amount: 5000,
      contribution_frequency: "Harvest",
      mandatory_savings_amount: 800,
      level1: "Kiambu",
      level2: "Limuru",
    })

    expect(payload).toEqual({
      name: "Sunrise Farmers",
      country: "kenya",
      contribution_amount: 5000,
      contribution_frequency: "harvest",
      contribution_day: 1,
      rotation_savings_pct: 70,
      loan_pool_pct: 30,
      mandatory_savings_amount: 800,
      description: "Type: Farmers. Location: Limuru, Kiambu.",
    })
  })

  it("normalizes short-cycle labels to weekly backend cadence", () => {
    expect(mapFrequencyToBackend("Daily")).toBe("weekly")
    expect(mapFrequencyToBackend("Every 3 Days")).toBe("weekly")
    expect(mapFrequencyToBackend("Every 2 Weeks")).toBe("biweekly")
  })
})
