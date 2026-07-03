"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Gavel,
  Home,
  Landmark,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react"

import {
  getAppState,
  getFinancialOutcome,
  type AppStateAction,
  type AppStateContent,
  type AppStateIcon,
  type AppStateTone,
  type FinancialOutcomeKey,
  type PageStateKey,
} from "@/lib/app-states"
import { cn } from "@/lib/utils"

const iconMap: Record<AppStateIcon, typeof AlertTriangle> = {
  alert: AlertTriangle,
  bell: Bell,
  check: CheckCircle2,
  clock: Clock3,
  "credit-card": CreditCard,
  file: FileText,
  gavel: Gavel,
  home: Home,
  landmark: Landmark,
  "mail-check": MailCheck,
  refresh: RefreshCw,
  shield: ShieldCheck,
  users: Users,
  wallet: WalletCards,
}

const toneStyles: Record<AppStateTone, { icon: string; surface: string; border: string; text: string; accent: string }> = {
  success: {
    icon: "bg-emerald-50 text-primary dark:bg-emerald-500/10 dark:text-emerald-200",
    surface: "bg-emerald-50/70 dark:bg-emerald-500/10",
    border: "border-emerald-100 dark:border-emerald-500/20",
    text: "text-primary dark:text-emerald-200",
    accent: "bg-primary hover:bg-green-hover text-white",
  },
  warning: {
    icon: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-200",
    surface: "bg-amber-50/80 dark:bg-amber-500/10",
    border: "border-amber-100 dark:border-amber-500/20",
    text: "text-amber-700 dark:text-amber-200",
    accent: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  danger: {
    icon: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-200",
    surface: "bg-red-50/80 dark:bg-red-500/10",
    border: "border-red-100 dark:border-red-500/20",
    text: "text-red-600 dark:text-red-200",
    accent: "bg-red-600 hover:bg-red-700 text-white",
  },
  info: {
    icon: "bg-sky-50 text-[#0a2540] dark:bg-sky-500/10 dark:text-sky-200",
    surface: "bg-sky-50/70 dark:bg-sky-500/10",
    border: "border-sky-100 dark:border-sky-500/20",
    text: "text-[#0a2540] dark:text-sky-200",
    accent: "bg-[#0a2540] hover:bg-[#1c3a5f] text-white",
  },
  empty: {
    icon: "bg-emerald-50 text-primary dark:bg-emerald-500/10 dark:text-emerald-200",
    surface: "bg-white dark:bg-white/[0.03]",
    border: "border-gray-200 dark:border-white/10",
    text: "text-primary dark:text-emerald-200",
    accent: "bg-primary hover:bg-green-hover text-white",
  },
  neutral: {
    icon: "bg-gray-50 text-gray-500 dark:bg-white/10 dark:text-gray-300",
    surface: "bg-gray-50 dark:bg-white/5",
    border: "border-gray-100 dark:border-white/10",
    text: "text-gray-600 dark:text-gray-300",
    accent: "bg-[#0a2540] hover:bg-[#1c3a5f] text-white",
  },
}

function resolveState({
  stateKey,
  outcomeKey,
  state,
}: {
  stateKey?: PageStateKey
  outcomeKey?: FinancialOutcomeKey
  state?: AppStateContent
}) {
  if (state) return state
  if (outcomeKey) return getFinancialOutcome(outcomeKey)
  if (stateKey) return getAppState(stateKey)
  return getAppState("groups.empty")
}

function StateIcon({
  state,
  size = "md",
}: {
  state: AppStateContent
  size?: "sm" | "md" | "lg"
}) {
  const Icon = iconMap[state.icon]
  const styles = toneStyles[state.tone]
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg",
        size === "sm" ? cn(styles.text, "bg-transparent") : styles.icon,
        size === "sm" ? "h-9 w-9" : size === "lg" ? "h-16 w-16" : "h-12 w-12",
      )}
    >
      <Icon size={size === "sm" ? 18 : size === "lg" ? 30 : 23} />
    </span>
  )
}

function StateIllustration({
  state,
  size = "md",
}: {
  state: AppStateContent
  size?: "sm" | "md" | "lg"
}) {
  const isWarning = state.tone === "warning"
  const isDanger = state.tone === "danger"
  const isSuccess = state.tone === "success"
  const isFinancial = ["wallet", "credit-card", "landmark", "gavel"].includes(state.icon)
  const primary = isDanger ? "#dc2626" : isWarning ? "#d97706" : "#00ab00"
  const secondary = isDanger ? "#fee2e2" : isWarning ? "#fef3c7" : "#e9f3ed"
  const accent = isDanger ? "#991b1b" : isWarning ? "#92400e" : "#0a2540"
  const Icon = iconMap[state.icon]

  return (
    <div className={cn("relative mx-auto", size === "lg" ? "h-72 w-full max-w-[520px]" : size === "sm" ? "h-28 w-44" : "h-48 w-full max-w-[360px]")}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 520 288" fill="none" role="img" aria-label="">
        <path d="M70 207C99 143 160 104 231 116C289 126 302 70 362 70C425 70 473 122 470 184C467 237 417 269 332 264C257 260 229 235 169 244C103 254 43 246 70 207Z" fill={secondary} />
        <path d="M95 213C131 165 181 144 236 155C294 166 313 111 363 108C410 105 442 140 444 184C446 226 408 244 341 242C270 239 238 214 178 224C124 233 71 245 95 213Z" fill="white" fillOpacity="0.68" />
        <path d="M120 217C168 196 214 194 257 213C310 237 376 234 420 210" stroke={primary} strokeOpacity="0.16" strokeWidth="10" strokeLinecap="round" />
        <path d="M113 219C168 199 217 199 260 217C310 239 372 235 421 211" stroke={primary} strokeOpacity="0.28" strokeWidth="2" strokeLinecap="round" />
        <circle cx="147" cy="91" r="8" fill={primary} fillOpacity="0.18" />
        <circle cx="418" cy="78" r="6" fill={primary} fillOpacity="0.24" />
        <circle cx="82" cy="158" r="5" fill={accent} fillOpacity="0.12" />
        <circle cx="456" cy="224" r="5" fill={accent} fillOpacity="0.14" />

        {isFinancial ? (
          <>
            <rect x="174" y="118" width="172" height="88" rx="18" fill="#0a2540" />
            <rect x="190" y="136" width="140" height="14" rx="7" fill="white" fillOpacity="0.18" />
            <rect x="190" y="164" width="64" height="14" rx="7" fill={primary} />
            <circle cx="306" cy="172" r="18" fill="white" fillOpacity="0.14" />
            <circle cx="323" cy="172" r="18" fill="white" fillOpacity="0.18" />
            <path d="M260 96C286 86 318 90 341 108" stroke={primary} strokeWidth="9" strokeLinecap="round" />
            <path d="M180 98C205 84 226 84 249 97" stroke={primary} strokeOpacity="0.35" strokeWidth="8" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M189 185V127L260 84L331 127V185H189Z" fill="#0a2540" />
            <path d="M214 185V140H306V185" fill="white" fillOpacity="0.13" />
            <path d="M260 84L340 132" stroke={primary} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M260 84L180 132" stroke={primary} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="238" y="146" width="44" height="39" rx="9" fill={primary} />
          </>
        )}

        {isSuccess && (
          <path d="M360 118L380 138L420 96" stroke={primary} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {(isWarning || isDanger) && (
          <>
            <path d="M386 87L431 166H341L386 87Z" fill={primary} fillOpacity="0.16" />
            <path d="M386 111V139" stroke={primary} strokeWidth="8" strokeLinecap="round" />
            <circle cx="386" cy="154" r="5" fill={primary} />
          </>
        )}
        {!isSuccess && !isWarning && !isDanger && (
          <path d="M371 98C399 111 414 133 417 164" stroke={primary} strokeWidth="8" strokeLinecap="round" strokeDasharray="2 18" />
        )}
      </svg>
      <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#0a2540] shadow-[0_18px_45px_rgba(10,37,64,0.12)] backdrop-blur">
        <Icon size={28} color={primary} strokeWidth={2.4} />
      </span>
    </div>
  )
}

function ActionButton({
  action,
  onClick,
  primary,
  tone,
}: {
  action?: AppStateAction
  onClick?: () => void
  primary?: boolean
  tone: AppStateTone
}) {
  if (!action) return null
  const styles = toneStyles[tone]
  const className = cn(
    "inline-flex h-11 items-center justify-center rounded-lg px-5 text-xs font-black uppercase tracking-widest transition",
    primary
      ? styles.accent
      : "border border-[#d6e4df] bg-white/65 text-[#0a2540] backdrop-blur hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10",
  )

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {action.label}
    </button>
  )
}

export function AppStatePanel({
  stateKey,
  outcomeKey,
  state,
  compact = false,
  className,
  children,
  onPrimaryAction,
  onSecondaryAction,
}: {
  stateKey?: PageStateKey
  outcomeKey?: FinancialOutcomeKey
  state?: AppStateContent
  compact?: boolean
  className?: string
  children?: ReactNode
  onPrimaryAction?: () => void
  onSecondaryAction?: () => void
}) {
  const content = resolveState({ stateKey, outcomeKey, state })
  const styles = toneStyles[content.tone]

  return (
    <section
      className={cn("relative overflow-hidden text-center", compact ? "px-5 py-8" : "px-6 py-12", className)}
    >
      <div className="pointer-events-none absolute inset-x-10 top-10 -z-10 h-40 rounded-full bg-[#e9f3ed]/50 blur-3xl dark:bg-emerald-500/10" />
      <StateIllustration state={content} size={compact ? "sm" : "md"} />
      {content.eyebrow && <p className={cn("mt-3 text-[10px] font-black uppercase tracking-[0.2em]", styles.text)}>{content.eyebrow}</p>}
      <h2 className="mt-3 text-lg font-black text-[#0a2540] dark:text-white">{content.title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">{content.description}</p>
      {children}
      {(content.primaryAction || content.secondaryAction) && (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ActionButton action={content.secondaryAction} onClick={onSecondaryAction} tone={content.tone} />
          <ActionButton action={content.primaryAction} onClick={onPrimaryAction} primary tone={content.tone} />
        </div>
      )}
    </section>
  )
}

export function AppStateNotice({
  stateKey,
  outcomeKey,
  state,
  action,
  onAction,
  className,
}: {
  stateKey?: PageStateKey
  outcomeKey?: FinancialOutcomeKey
  state?: AppStateContent
  action?: AppStateAction
  onAction?: () => void
  className?: string
}) {
  const content = resolveState({ stateKey, outcomeKey, state })
  const styles = toneStyles[content.tone]
  const primaryAction = action || content.primaryAction

  return (
    <div className={cn("rounded-lg border border-l-4 p-4 backdrop-blur", styles.border, styles.surface, className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <StateIcon state={content} size="sm" />
          <div>
            <h3 className="text-sm font-black text-[#0a2540] dark:text-white">{content.title}</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-gray-600 dark:text-gray-300">{content.description}</p>
          </div>
        </div>
        <ActionButton action={primaryAction} onClick={onAction} primary tone={content.tone} />
      </div>
    </div>
  )
}

export function FullPageState({
  stateKey,
  outcomeKey,
  state,
  onPrimaryAction,
  onSecondaryAction,
}: {
  stateKey?: PageStateKey
  outcomeKey?: FinancialOutcomeKey
  state?: AppStateContent
  onPrimaryAction?: () => void
  onSecondaryAction?: () => void
}) {
  const content = resolveState({ stateKey, outcomeKey, state })
  const styles = toneStyles[content.tone]

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7fbf8] p-6 text-center dark:bg-gray-950">
      <div className="pointer-events-none absolute left-1/2 top-20 h-72 w-[760px] -translate-x-1/2 rounded-full bg-[#e9f3ed] blur-3xl dark:bg-emerald-500/10" />
      <div className="pointer-events-none absolute bottom-[-120px] left-[-80px] h-72 w-72 rounded-full bg-[#0a2540]/5 blur-3xl" />
      <div className="pointer-events-none absolute right-[-120px] top-[-80px] h-72 w-72 rounded-full bg-[#00ab00]/10 blur-3xl" />

      <div className="relative w-full max-w-2xl">
        <StateIllustration state={content} size="lg" />
        {content.eyebrow && <p className={cn("mt-2 text-[10px] font-black uppercase tracking-[0.24em]", styles.text)}>{content.eyebrow}</p>}
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#0a2540] dark:text-white sm:text-5xl">{content.title}</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300 sm:text-base">{content.description}</p>
        {(content.primaryAction || content.secondaryAction) && (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ActionButton action={content.secondaryAction} onClick={onSecondaryAction} tone={content.tone} />
            <ActionButton action={content.primaryAction} onClick={onPrimaryAction} primary tone={content.tone} />
          </div>
        )}
        {content.code && (
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">
            Error Code: {content.code} / OrbiSave
          </p>
        )}
      </div>
    </div>
  )
}
