"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ArrowDownRight, ArrowUpRight, BarChart2, CreditCard, Download, Users } from "lucide-react"

import { useActiveGroup } from "@/hooks/useGroups"
import { useMembers } from "@/hooks/useMembers"
import { useContributions } from "@/hooks/useContributions"
import { useLoans } from "@/hooks/useLoans"
import { formatCurrency } from "@/lib/formatters"
import {
  Column,
  DataTable,
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  Tabs,
} from "@/components/dashboard/ui"

type ReportTab = "equity" | "cashflow" | "loans"

type EquityRow = { name: string; total: number; count: number }

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (cell: string | number) => {
    const value = String(cell ?? "")
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
  }
  const csv = rows.map((row) => row.map(escape).join(",")).join("\r\n")
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const { activeGroup, isLoading: groupsLoading } = useActiveGroup()
  const { data: members, isLoading: membersLoading } = useMembers(activeGroup?.id || null)
  const { data: contributions, isLoading: contribsLoading } = useContributions(activeGroup?.id || null)
  const { data: loans, isLoading: loansLoading } = useLoans(activeGroup?.id || null)

  const [tab, setTab] = useState<ReportTab>("equity")
  const currency = activeGroup?.currency || "KES"
  const loading = groupsLoading || membersLoading || contribsLoading || loansLoading

  const matrix: EquityRow[] = useMemo(
    () =>
      (members || []).map((m) => {
        const memberContribs = (contributions || []).filter(
          (c) => c.member_name === m.member_name && c.status === "confirmed",
        )
        return {
          name: m.member_name,
          total: memberContribs.reduce((acc, c) => acc + Number(c.amount), 0),
          count: memberContribs.length,
        }
      }),
    [members, contributions],
  )

  const confirmedContribs = useMemo(
    () => (contributions || []).filter((c) => c.status === "confirmed"),
    [contributions],
  )
  const disbursedLoans = useMemo(
    () => (loans || []).filter((l) => l.status === "disbursed" || l.status === "active"),
    [loans],
  )

  const grossDisbursed = (loans || [])
    .filter((l) => ["disbursed", "active", "repaid"].includes(l.status))
    .reduce((s, l) => s + Number(l.amount), 0)
  const netRecovered = (loans || [])
    .filter((l) => l.status === "repaid")
    .reduce((s, l) => s + Number(l.amount), 0)
  const atRisk = disbursedLoans.reduce((s, l) => s + Number(l.amount), 0)

  const handleExport = () => {
    if (tab === "equity") {
      downloadCsv(`orbisave-member-equity-${activeGroup?.id?.slice(0, 8) || "group"}.csv`, [
        ["Member", "Installments", "Net Equity Contribution", "Currency"],
        ...matrix.map((r) => [r.name, r.count, r.total, currency]),
        ["TOTAL", matrix.reduce((s, r) => s + r.count, 0), matrix.reduce((s, r) => s + r.total, 0), currency],
      ])
    } else if (tab === "cashflow") {
      downloadCsv(`orbisave-ledger-flow-${activeGroup?.id?.slice(0, 8) || "group"}.csv`, [
        ["Type", "Party", "Amount", "Direction", "Date", "Currency"],
        ...confirmedContribs.map((c) => [
          "Contribution",
          c.member_name,
          Number(c.amount),
          "in",
          c.confirmed_at || c.initiated_at || c.scheduled_date || "",
          c.currency || currency,
        ]),
        ...disbursedLoans.map((l) => [
          "Loan disbursement",
          l.borrower_name,
          Number(l.amount),
          "out",
          l.disbursed_at || "",
          l.currency || currency,
        ]),
      ])
    } else {
      downloadCsv(`orbisave-loan-portfolio-${activeGroup?.id?.slice(0, 8) || "group"}.csv`, [
        ["Reference", "Borrower", "Purpose", "Principal", "Term (weeks)", "Status", "Currency"],
        ...(loans || []).map((l) => [
          l.id.slice(0, 8),
          l.borrower_name,
          l.purpose,
          Number(l.amount),
          l.term_weeks,
          l.status,
          l.currency || currency,
        ]),
      ])
    }
    toast.success("Report exported to CSV.")
  }

  const equityColumns: Column<EquityRow>[] = [
    {
      key: "name",
      header: "Participant",
      render: (r) => <span className="font-medium text-gray-900 dark:text-white">{r.name}</span>,
    },
    {
      key: "count",
      header: "Frequency",
      align: "center",
      render: (r) => <span className="text-gray-500">{r.count} installments</span>,
    },
    {
      key: "total",
      header: "Net Equity Contribution",
      align: "right",
      render: (r) => (
        <span className="font-semibold text-[#00ab00] tabular-nums">{formatCurrency(r.total, currency)}</span>
      ),
    },
  ]

  const loanColumns: Column<NonNullable<typeof loans>[number]>[] = [
    {
      key: "ref",
      header: "Reference",
      render: (l) => <span className="font-mono text-xs text-gray-400">{l.id.slice(0, 8)}</span>,
    },
    {
      key: "borrower",
      header: "Borrower",
      render: (l) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{l.borrower_name}</p>
          <p className="text-xs capitalize text-gray-400">{l.purpose.replace(/_/g, " ")}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Principal",
      align: "right",
      render: (l) => <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{formatCurrency(l.amount, currency)}</span>,
    },
    { key: "term", header: "Horizon", render: (l) => <span className="text-gray-500">{l.term_weeks} weeks</span> },
    { key: "status", header: "Status", align: "right", render: (l) => <StatusBadge status={l.status} /> },
  ]

  const tabs = [
    { id: "equity", label: "Member Equity", count: matrix.length },
    { id: "cashflow", label: "Ledger Flow", count: confirmedContribs.length + disbursedLoans.length },
    { id: "loans", label: "Loan Portfolio", count: loans?.length ?? 0 },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Group analytics"
        title="Reports"
        description="Financial audits and member participation, exportable for group records and audits."
        actions={
          <button
            onClick={handleExport}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0a2540] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1c3a5f] disabled:opacity-50"
          >
            <Download size={16} /> Export CSV
          </button>
        }
      />

      <Tabs items={tabs} active={tab} onChange={(id) => setTab(id as ReportTab)} />

      {/* Member Equity */}
      {tab === "equity" && (
        <SectionCard
          title="Contributor equity matrix"
          description="Aggregated lifetime confirmed savings per group member."
          actions={<Users size={20} className="text-gray-300" />}
        >
          {matrix.length > 0 ? (
            <>
              <DataTable
                columns={equityColumns}
                rows={matrix}
                rowKey={(r) => r.name}
                minWidth={520}
              />
              <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Consolidated group wallet</span>
                <span className="text-lg font-semibold text-gray-900 tabular-nums dark:text-white">
                  {formatCurrency(matrix.reduce((s, r) => s + r.total, 0), currency)}
                </span>
              </div>
            </>
          ) : (
            <EmptyState
              icon={Users}
              title="No member equity yet"
              description="Once members contribute, their confirmed savings will build this equity matrix."
            />
          )}
        </SectionCard>
      )}

      {/* Ledger Flow */}
      {tab === "cashflow" && (
        <SectionCard
          title="Verified transaction ledger"
          description="Confirmed contributions in, loan disbursements out."
        >
          {confirmedContribs.length + disbursedLoans.length > 0 ? (
            <div className="space-y-2">
              {confirmedContribs.map((c) => (
                <LedgerRow
                  key={c.id}
                  direction="in"
                  label="Contribution"
                  party={c.member_name}
                  meta={new Date(c.confirmed_at || c.initiated_at || c.scheduled_date || Date.now()).toLocaleString()}
                  amount={formatCurrency(c.amount, c.currency || currency)}
                />
              ))}
              {disbursedLoans.map((l) => (
                <LedgerRow
                  key={l.id}
                  direction="out"
                  label="Loan disbursement"
                  party={l.borrower_name}
                  meta={`Ref ${l.id.slice(0, 8)}`}
                  amount={formatCurrency(l.amount, l.currency || currency)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BarChart2}
              title="No ledger movement yet"
              description="Confirmed contributions and disbursements will appear here as the group transacts."
            />
          )}
        </SectionCard>
      )}

      {/* Loan Portfolio */}
      {tab === "loans" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Gross disbursed" value={formatCurrency(grossDisbursed, currency)} icon={CreditCard} />
            <StatCard label="Net recovered" value={formatCurrency(netRecovered, currency)} icon={ArrowUpRight} tone="green" />
            <StatCard label="At-risk exposure" value={formatCurrency(atRisk, currency)} icon={ArrowDownRight} tone="red" />
          </div>
          <SectionCard title="Loan portfolio exposure" description="Every loan the group has issued.">
            <DataTable
              columns={loanColumns}
              rows={loans || []}
              rowKey={(l) => l.id}
              minWidth={640}
              empty="No loans issued yet."
            />
          </SectionCard>
        </div>
      )}
    </div>
  )
}

function LedgerRow({
  direction,
  label,
  party,
  meta,
  amount,
}: {
  direction: "in" | "out"
  label: string
  party: string
  meta: string
  amount: string
}) {
  const isIn = direction === "in"
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 transition-colors hover:border-gray-200 dark:border-gray-800 dark:hover:border-gray-700">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            isIn ? "bg-[#ecfdf3] text-[#00ab00]" : "bg-red-50 text-red-500"
          }`}
        >
          {isIn ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{party}</p>
          <p className="text-xs text-gray-400">{meta}</p>
        </div>
      </div>
      <p className={`text-sm font-semibold tabular-nums ${isIn ? "text-[#00ab00]" : "text-red-500"}`}>
        {isIn ? "+" : "−"}
        {amount}
      </p>
    </div>
  )
}
