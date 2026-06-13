import type { CountryCode } from "@/lib/location-data"

export const GROUP_TYPES = ["Farmers", "Corporate", "Women Self Help", "Fishers", "Students", "Other"] as const

export const CONTRIBUTION_FREQUENCIES = [
  "Daily",
  "Every 3 Days",
  "Every 5 Days",
  "Weekly",
  "Every 2 Weeks",
  "Monthly",
  "Harvest",
] as const

export type ContributionFrequency = (typeof CONTRIBUTION_FREQUENCIES)[number]

export interface ExistingAccountChairpersonValues {
  country: CountryCode
  group_name: string
  group_type: string
  group_type_other?: string
  contribution_amount: number
  contribution_frequency: ContributionFrequency
  mandatory_savings_amount?: number
  level1: string
  level2: string
}

export function getChairpersonStepFields() {
  return [
    ["group_name", "group_type", "contribution_amount", "contribution_frequency", "mandatory_savings_amount"],
    ["level1", "level2"],
    ["agreePrivacy", "agreeTerms"],
    ["transaction_pin"],
  ]
}

export function mapFrequencyToBackend(uiVal: string) {
  if (uiVal === "Daily" || uiVal === "Every 3 Days" || uiVal === "Every 5 Days" || uiVal === "Weekly") return "weekly"
  if (uiVal === "Every 2 Weeks") return "biweekly"
  if (uiVal === "Monthly") return "monthly"
  if (uiVal === "Harvest") return "harvest"
  return "monthly"
}

export function buildExistingAccountChairpersonPayload(values: ExistingAccountChairpersonValues) {
  const groupType = values.group_type === "Other" ? values.group_type_other || "Other" : values.group_type

  return {
    name: values.group_name,
    country: values.country,
    contribution_amount: values.contribution_amount,
    contribution_frequency: mapFrequencyToBackend(values.contribution_frequency),
    contribution_day: 1,
    rotation_savings_pct: 70,
    loan_pool_pct: 30,
    mandatory_savings_amount: values.mandatory_savings_amount || 0,
    description: `Type: ${groupType}. Location: ${values.level2}, ${values.level1}.`,
  }
}
