"use client"

import { type FormEvent, type ReactNode, useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2, ChevronLeft, Landmark, Percent, Save, ShieldCheck, Vote } from "lucide-react"
import { toast } from "sonner"

import { useGroups } from "@/hooks/useGroups"
import { useMembers } from "@/hooks/useMembers"
import { useAuthStore } from "@/store/auth"

const COUNTRY_POLICY: Record<string, { authority: string; market: string; currency: string }> = {
  kenya: { authority: "Central Bank of Kenya", market: "Kenya", currency: "KES" },
  rwanda: { authority: "National Bank of Rwanda", market: "Rwanda", currency: "RWF" },
  ghana: { authority: "Bank of Ghana", market: "Ghana", currency: "GHS" },
}

function numberValue(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export default function LoanSettingsPage() {
  const user = useAuthStore((state) => state.user)
  const { data: groups } = useGroups()
  const activeGroup = groups?.[0] || null
  const { data: members } = useMembers(activeGroup?.id || null)
  const currentMembership = members?.find((member) => member.member === user?.id || member.member_email === user?.email)
  const isChairperson = currentMembership?.role === "chairperson" || user?.role === "chairperson"
  const policy = COUNTRY_POLICY[activeGroup?.country || user?.country || "kenya"] || COUNTRY_POLICY.kenya

  const [loanPoolEnabled, setLoanPoolEnabled] = useState(true)
  const [proposedRate, setProposedRate] = useState(String(activeGroup?.loan_interest_rate_monthly || ""))
  const [quorum, setQuorum] = useState("60")
  const [majority, setMajority] = useState("51")
  const [termWeeks, setTermWeeks] = useState("12")
  const [exposureLimit, setExposureLimit] = useState("30")

  const rateValue = numberValue(proposedRate)
  const isRateReasonable = rateValue > 0 && rateValue <= 30
  const proposalSummary = useMemo(
    () => [
      { label: "Current group rate", value: activeGroup?.loan_interest_rate_monthly ? `${activeGroup.loan_interest_rate_monthly}% monthly` : "Not configured" },
      { label: "Country cap source", value: policy.authority },
      { label: "Policy market", value: policy.market },
      { label: "Currency", value: activeGroup?.currency || policy.currency },
    ],
    [activeGroup?.currency, activeGroup?.loan_interest_rate_monthly, policy],
  )

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isChairperson) {
      toast.error("Only the chairperson can draft loan rule proposals.")
      return
    }
    if (!isRateReasonable) {
      toast.error("Enter a conservative monthly rate above 0%. Country cap enforcement must be confirmed by backend policy.")
      return
    }
    toast.success("Loan interest proposal prepared for group voting.")
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link href="/dashboard/settings" className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-primary dark:hover:bg-white/10">
              <ChevronLeft size={16} />
            </Link>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Loan Pool Governance</p>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#0a2540] dark:text-white">Loan Pool Rules</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
            Draft internal lending rules for group voting. Interest must stay below country policy caps and should be lower for easier repayment.
          </p>
        </div>
        <StatusPill label={isChairperson ? "Chairperson proposal" : "Member view"} />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Loan Pool" value={loanPoolEnabled ? "Enabled" : "Paused"} helper="Member borrowing availability" icon={<Landmark size={18} />} />
        <MetricCard label="Proposed Rate" value={proposedRate ? `${proposedRate}%` : "Not set"} helper="Subject to vote and cap" icon={<Percent size={18} />} />
        <MetricCard label="Approval Model" value="Quorum + majority" helper="Adopted rules lock until another vote" icon={<Vote size={18} />} />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <form onSubmit={submit} className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Draft Loan Rule Proposal</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
                These settings should become active only after a valid group vote.
              </p>
            </div>
          </div>

          {!isChairperson && (
            <div className="mt-5 rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              Members can review and vote when a proposal is published. Drafting loan pool rules is a chairperson privilege.
            </div>
          )}

          <div className="mt-6 space-y-5">
            <Toggle label="Enable Loan Pool" checked={loanPoolEnabled} onChange={setLoanPoolEnabled} disabled={!isChairperson} hint="Allow eligible members to request internal group loans." />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Proposed monthly interest (%)">
                <input value={proposedRate} onChange={(event) => setProposedRate(event.target.value)} disabled={!isChairperson} inputMode="decimal" className="group-input" placeholder="Example: 3" />
              </Field>
              <Field label="Max term (weeks)">
                <input value={termWeeks} onChange={(event) => setTermWeeks(event.target.value)} disabled={!isChairperson} inputMode="numeric" className="group-input" />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Exposure limit (%)">
                <input value={exposureLimit} onChange={(event) => setExposureLimit(event.target.value)} disabled={!isChairperson} inputMode="numeric" className="group-input" />
              </Field>
              <Field label="Quorum (%)">
                <input value={quorum} onChange={(event) => setQuorum(event.target.value)} disabled={!isChairperson} inputMode="numeric" className="group-input" />
              </Field>
              <Field label="Majority (%)">
                <input value={majority} onChange={(event) => setMajority(event.target.value)} disabled={!isChairperson} inputMode="numeric" className="group-input" />
              </Field>
            </div>

            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-[#016828] dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              Country cap values should come from super-admin country policy settings. The backend must reject adopted rates above the active cap for {policy.market}.
            </div>

            <button
              type="submit"
              disabled={!isChairperson}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-green-hover disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            >
              <Save size={15} />
              Prepare Vote Proposal
            </button>
          </div>
        </form>

        <aside className="space-y-5">
          <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">
              <Landmark size={20} />
            </div>
            <h2 className="mt-5 text-lg font-black text-[#0a2540] dark:text-white">Country Rate Guardrail</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
              National-rate data changes over time, so OrbiSave should store active country caps in console policy settings instead of hardcoding them into the dashboard.
            </p>
            <div className="mt-5 space-y-3">
              {proposalSummary.map((item) => <InfoRow key={item.label} label={item.label} value={item.value} />)}
            </div>
          </section>

          <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 shrink-0 text-amber-500" size={18} />
              <div>
                <h2 className="text-lg font-black text-[#0a2540] dark:text-white">Repayment Safety</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
                  The safest internal loan rates are usually well below the legal or central-bank cap. The UI should nudge groups toward affordability, while backend policy enforces the maximum.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  )
}

function Toggle({ label, checked, onChange, disabled, hint }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
      <div>
        <p className="text-sm font-black text-[#0a2540] dark:text-white">{label}</p>
        {hint && <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative h-6 w-11 rounded-lg transition ${checked ? "bg-primary" : "bg-gray-200 dark:bg-white/10"} disabled:cursor-not-allowed disabled:opacity-50`}
        aria-pressed={checked}
      >
        <span className={`absolute top-1 h-4 w-4 rounded bg-white shadow-sm transition ${checked ? "left-6" : "left-1"}`} />
      </button>
    </div>
  )
}

function MetricCard({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: ReactNode }) {
  return (
    <article className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-primary dark:bg-emerald-500/10">{icon}</span>
      </div>
      <p className="mt-4 text-2xl font-black text-[#0a2540] dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{helper}</p>
    </article>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</span>
      {children}
    </label>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</span>
      <span className="text-right text-xs font-black text-[#0a2540] dark:text-white">{value}</span>
    </div>
  )
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-lg border border-gray-100 bg-gray-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
      {label}
    </span>
  )
}
