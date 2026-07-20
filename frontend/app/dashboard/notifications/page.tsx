"use client"

import Link from "next/link"
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  CreditCard,
  Loader2,
  ShieldAlert,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { useNotifications, useMarkAllAsRead, useMarkAsRead } from "@/hooks/useNotifications"
import { EmptyState, PageHeader, SectionCard } from "@/components/dashboard/ui"

/**
 * Icons keyed by the notification types the backend actually emits
 * (apps/notifications/models.py TYPE_CHOICES). The previous map keyed on
 * invented names ('alert', 'info', 'meeting'), so every real notification fell
 * through to the default icon and the colour never carried meaning.
 */
const TYPE_ICONS: Record<string, { Icon: LucideIcon; className: string }> = {
  contribution_confirmed: { Icon: CheckCircle2, className: "bg-[#ecfdf3] text-[#00ab00]" },
  contribution_failed: { Icon: AlertTriangle, className: "bg-red-50 text-red-600" },
  payout_processed: { Icon: Wallet, className: "bg-[#ecfdf3] text-[#00ab00]" },
  loan_status_changed: { Icon: CreditCard, className: "bg-blue-50 text-blue-600" },
  loan_approval_required: { Icon: ShieldAlert, className: "bg-amber-50 text-amber-600" },
  new_member_joined: { Icon: UserPlus, className: "bg-[#ecfdf3] text-[#00ab00]" },
  meeting_starting: { Icon: CalendarClock, className: "bg-blue-50 text-blue-600" },
  admin_alert: { Icon: ShieldAlert, className: "bg-amber-50 text-amber-600" },
  reminder: { Icon: Bell, className: "bg-gray-100 text-gray-500" },
}

function iconFor(type: string) {
  return TYPE_ICONS[type] || { Icon: Bell, className: "bg-gray-100 text-gray-500" }
}

function formatWhen(value: string) {
  const date = new Date(value)
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()
  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

export default function NotificationsPage() {
  // Notifications belong to the RECIPIENT, not to a group. This page used to
  // bail out with a "no group" panel, which hid a brand new member's own
  // welcome and activation alerts precisely when they needed them.
  const { data: notifications, isLoading } = useNotifications(null)
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()

  const unread = notifications?.filter((item) => !item.read_at) || []
  const read = notifications?.filter((item) => item.read_at) || []
  const isEmpty = !isLoading && unread.length === 0 && read.length === 0

  const handleMarkAll = async () => {
    try {
      await markAllAsRead.mutateAsync()
      toast.success("All notifications marked as read.")
    } catch {
      toast.error("Could not mark notifications as read.")
    }
  }

  const handleMarkOne = async (id: string) => {
    try {
      await markAsRead.mutateAsync(id)
    } catch {
      toast.error("Could not mark that notification as read.")
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="Notifications"
        description="Activity from your group and account, newest first."
        actions={
          unread.length > 0 ? (
            <button
              onClick={handleMarkAll}
              disabled={markAllAsRead.isPending}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
            >
              {markAllAsRead.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckSquare size={16} />}
              Mark all read
            </button>
          ) : undefined
        }
      />

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#00ab00]" />
        </div>
      )}

      {isEmpty && (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Contribution confirmations, payout alerts, and group updates will appear here as they happen."
        />
      )}

      {unread.length > 0 && (
        <SectionCard title="Unread" description={`${unread.length} awaiting your attention`} bodyClassName="">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {unread.map((item) => {
              const { Icon, className } = iconFor(item.type)
              const actionUrl = item.metadata?.action_url
              return (
                <li key={item.id} className="flex items-start gap-4 px-5 py-4 sm:px-6">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${className}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</p>
                      <span className="shrink-0 text-xs text-gray-400">{formatWhen(item.created_at)}</span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{item.body}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <button
                        onClick={() => handleMarkOne(item.id)}
                        className="text-xs font-medium text-gray-500 transition hover:text-gray-800 dark:hover:text-white"
                      >
                        Mark as read
                      </button>
                      {actionUrl && (
                        <Link href={actionUrl} className="text-xs font-semibold text-[#00ab00] transition hover:underline">
                          Take action
                        </Link>
                      )}
                    </div>
                  </div>
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#00ab00]" aria-label="Unread" />
                </li>
              )
            })}
          </ul>
        </SectionCard>
      )}

      {read.length > 0 && (
        <SectionCard title="Earlier" bodyClassName="">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {read.map((item) => {
              const { Icon } = iconFor(item.type)
              return (
                <li key={item.id} className="flex items-start gap-4 px-5 py-4 sm:px-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{item.title}</p>
                      <span className="shrink-0 text-xs text-gray-400">{formatWhen(item.created_at)}</span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-gray-400">{item.body}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}
