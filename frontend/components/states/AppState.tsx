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

// Professional vector illustrations (unDraw, open license — free commercial
// use, no attribution) downloaded to /public/illustrations and recolored to
// the brand green. See public/illustrations/README.md. Mapped per state icon
// so every empty/error/outcome panel gets purpose-drawn artwork instead of
// the old hand-drawn generic blob.
const illustrationMap: Record<AppStateIcon, string> = {
  alert: "/illustrations/warning.svg",
  bell: "/illustrations/notifications.svg",
  check: "/illustrations/completed.svg",
  clock: "/illustrations/in-review.svg",
  "credit-card": "/illustrations/credit-card.svg",
  file: "/illustrations/signed-document.svg",
  gavel: "/illustrations/terms.svg",
  home: "/illustrations/page-not-found.svg",
  landmark: "/illustrations/finance.svg",
  "mail-check": "/illustrations/mail-sent.svg",
  refresh: "/illustrations/server-down.svg",
  shield: "/illustrations/security.svg",
  users: "/illustrations/team-spirit.svg",
  wallet: "/illustrations/empty-wallet.svg",
}

function resolveIllustration(state: AppStateContent) {
  // Payout/contribution success panels deserve "money received", not "empty wallet".
  if (state.icon === "wallet" && state.tone === "success") return "/illustrations/money-received.svg"
  return illustrationMap[state.icon]
}

function StateIllustration({
  state,
  size = "md",
}: {
  state: AppStateContent
  size?: "sm" | "md" | "lg"
}) {
  return (
    <div className={cn("mx-auto flex items-center justify-center", size === "lg" ? "h-56 sm:h-64" : size === "sm" ? "h-24" : "h-40 sm:h-44")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resolveIllustration(state)} alt="" className="h-full w-auto max-w-full" loading="lazy" />
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
    "inline-flex h-11 items-center justify-center rounded-lg px-5 text-xs font-bold uppercase tracking-wider transition",
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
      {content.eyebrow && <p className={cn("mt-4 text-[10px] font-bold uppercase tracking-[0.2em]", styles.text)}>{content.eyebrow}</p>}
      <h2 className="mt-4 text-lg font-bold text-[#0a2540] dark:text-white">{content.title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-gray-500 dark:text-gray-400">{content.description}</p>
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
            <h3 className="text-sm font-bold text-[#0a2540] dark:text-white">{content.title}</h3>
            <p className="mt-1 text-xs font-medium leading-5 text-gray-600 dark:text-gray-300">{content.description}</p>
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
        {content.eyebrow && <p className={cn("mt-4 text-[10px] font-bold uppercase tracking-[0.24em]", styles.text)}>{content.eyebrow}</p>}
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#0a2540] dark:text-white sm:text-4xl">{content.title}</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm font-medium leading-6 text-gray-600 dark:text-gray-300 sm:text-base">{content.description}</p>
        {(content.primaryAction || content.secondaryAction) && (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ActionButton action={content.secondaryAction} onClick={onSecondaryAction} tone={content.tone} />
            <ActionButton action={content.primaryAction} onClick={onPrimaryAction} primary tone={content.tone} />
          </div>
        )}
        {content.code && (
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-400">
            Error Code: {content.code} / OrbiSave
          </p>
        )}
      </div>
    </div>
  )
}
