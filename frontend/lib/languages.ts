/**
 * Launch language set — mirrors backend common/translation.py.
 * Users choose AT LEAST TWO at signup; the system always serves them in one
 * of their selected languages (SMS, notifications; UI chrome i18n follows).
 */
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "sw", label: "Kiswahili" },
  { code: "rw", label: "Kinyarwanda" },
  { code: "fr", label: "Français" },
  { code: "tw", label: "Twi" },
] as const

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"]

export const MIN_LANGUAGES = 2
export const MAX_LANGUAGES = 3
