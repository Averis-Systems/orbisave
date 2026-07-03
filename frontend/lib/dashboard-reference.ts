import {
  Bell,
  Building2,
  CreditCard,
  LayoutDashboard,
  PiggyBank,
  RefreshCw,
  Settings,
  User,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { formatCurrency } from "./formatters"
import { t } from "./terminology"

export type DashboardMetric = {
  label: string
  value: string
  sub: string
  trend: "up" | "down" | "neutral"
  trendLabel: string
}

export type DashboardNavItem = {
  name: string
  href: string
  icon: LucideIcon
  badge?: string | number
}

export type DashboardNavSection = {
  title: string
  items: DashboardNavItem[]
}

type MetricInput = {
  memberCount?: number
  maxMembers?: number
  rotationPool?: number
  totalPool?: number
  loanPool?: number
  currency?: string
  frequency?: string
}

export function buildDashboardMetrics(input: MetricInput): DashboardMetric[] {
  const currency = input.currency || "KES"
  const memberCount = input.memberCount ?? 0
  const maxMembers = input.maxMembers ?? 0

  return [
    {
      label: t("dashboard.metrics.totalMembers"),
      value: `${memberCount}`,
      sub: `${memberCount} of ${maxMembers} active seats`,
      trend: "up",
      trendLabel: "11.01%",
    },
    {
      label: t("dashboard.metrics.rotationSavingsTotal"),
      value: formatCurrency(input.rotationPool ?? 0, currency),
      sub: `${normalizeFrequency(input.frequency)} payout cadence`,
      trend: "down",
      trendLabel: "9.05%",
    },
    {
      label: t("dashboard.metrics.loanPool"),
      value: formatCurrency(input.loanPool ?? 0, currency),
      sub: "Available for internal credit",
      trend: "up",
      trendLabel: "4.28%",
    },
    {
      label: t("dashboard.metrics.totalGroupWallet"),
      value: formatCurrency(input.totalPool ?? 0, currency),
      sub: "Trust account balance",
      trend: "neutral",
      trendLabel: "Live",
    },
  ]
}

export function getTargetTitle(frequency?: string) {
  const normalized = normalizeFrequency(frequency).toLowerCase()
  if (normalized.includes("week")) return "Weekly Target"
  if (normalized.includes("day")) return "Weekly Target"
  if (normalized.includes("harvest")) return "Harvest Target"
  return "Monthly Target"
}

export function normalizeFrequency(frequency?: string) {
  if (!frequency) return "Monthly"
  return frequency
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function getUserDashboardNavItems(role: string, hasLoanPool: boolean): DashboardNavSection[] {
  const isGroupAdmin = role === "chairperson" || role === "treasurer"

  return [
    {
      title: "Menu",
      items: [
        { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
        { name: "My Group", href: "/dashboard/my-group", icon: Building2 },
      ],
    },
    {
      title: "Financing",
      items: [
        { name: t("dashboard.nav.contributions"), href: "/dashboard/contributions", icon: Wallet },
        { name: t("dashboard.nav.savings"), href: "/dashboard/savings", icon: PiggyBank },
        ...(hasLoanPool ? [{ name: t("dashboard.nav.loans"), href: "/dashboard/my-loans", icon: CreditCard }] : []),
      ],
    },
    ...(isGroupAdmin
      ? [
          {
            title: "Management",
            items: [
              { name: "Members", href: "/dashboard/members", icon: Users },
              { name: "Rotations", href: "/dashboard/rotations", icon: RefreshCw },
              { name: "Meetings", href: "/dashboard/meetings", icon: Video },
            ],
          },
        ]
      : []),
    {
      title: "System",
      items: [
        { name: "Notifications", href: "/dashboard/notifications", icon: Bell, badge: 3 },
        { name: "Personal Profile", href: "/dashboard/profile", icon: User },
        ...(isGroupAdmin ? [{ name: "Group Settings", href: "/dashboard/settings", icon: Settings }] : []),
      ],
    },
  ]
}
