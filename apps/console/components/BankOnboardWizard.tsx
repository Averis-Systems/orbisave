'use client'

/**
 * Bank onboarding wizard — the single source of truth for adding or editing a
 * partner bank and its accounts. Rendered wherever banks are managed (the
 * Payment providers page) so "Onboard bank" opens it directly, no page hop.
 *
 * The component is presentation only: it never calls the API. The host page
 * owns fetch/save and passes `onSubmit(form)`. Use `bankFormToPayload` to turn
 * the form into the request body and `providerToBankForm` to edit an existing
 * bank.
 */

import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Coins,
  Info,
  Landmark,
  Loader2,
  Lock,
  PiggyBank,
  Plus,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────────────────

export interface BankAccount {
  id?: string
  label: string
  account_type: string
  account_number: string
  account_name: string
  currency: string
  bank_code?: string
  branch_code?: string
  is_active?: boolean
  is_default_for_collections?: boolean
  is_default_for_disbursements?: boolean
  is_default_for_reconciliation?: boolean
}

export interface Provider {
  id: string
  name: string
  provider_code: string
  country: string
  region?: string
  environment: string
  status: string
  base_url: string
  merchant_code?: string
  webhook_url?: string
  supports_collections?: boolean
  supports_disbursements?: boolean
  supports_mobile_money?: boolean
  has_api_key?: boolean
  has_api_secret?: boolean
  has_webhook_secret?: boolean
  accounts?: BankAccount[]
  last_tested_at?: string | null
  last_test_status?: string | null
  last_test_message?: string
}

interface BankAccountDraft {
  id?: string
  account_number: string
  account_name: string
  currency: string
  bank_code: string
  branch_code: string
}

export interface BankWizardForm {
  id?: string
  provider_code: string
  name: string
  country: string
  region: string
  environment: 'sandbox' | 'live'
  status: string
  base_url: string
  api_key: string
  api_secret: string
  merchant_code: string
  webhook_url: string
  webhook_secret: string
  supports_collections: boolean
  supports_disbursements: boolean
  supports_mobile_money: boolean
  accounts: Record<CoreAccountKey, BankAccountDraft>
}

// ── Constants ────────────────────────────────────────────────────────────────

/** The four accounts every partner bank holds for OrbiSave, in wizard order. */
export const CORE_ACCOUNTS = [
  {
    key: 'trust',
    label: 'Main Trust / Custody',
    icon: ShieldCheck,
    hint: 'Holds members’ pooled savings in custody. The regulated trust account the bank ring-fences from OrbiSave’s own funds.',
    defaultFlag: 'is_default_for_reconciliation' as const,
  },
  {
    key: 'savings',
    label: 'Group Savings',
    icon: PiggyBank,
    hint: 'Where member contributions are collected before they settle into the trust. Default account for collections.',
    defaultFlag: 'is_default_for_collections' as const,
  },
  {
    key: 'loan',
    label: 'Loan Disbursement',
    icon: Coins,
    hint: 'Funds loans are paid out from and repayments return to. Default account for disbursements.',
    defaultFlag: 'is_default_for_disbursements' as const,
  },
  {
    key: 'fee',
    label: 'Company / Charges',
    icon: Building2,
    hint: 'OrbiSave’s own account. Collects the transactional charges we earn on each successful transaction.',
    defaultFlag: null,
  },
] as const

type CoreAccountKey = (typeof CORE_ACCOUNTS)[number]['key']

type PartnerKind = 'bank' | 'wallet' | 'custom'
const BANK_PARTNERS: {
  code: string
  label: string
  short: string
  initials: string
  kind: PartnerKind
  country: string
  base_url: string
}[] = [
  { code: 'jenga_ke', label: 'Equity Bank Kenya (Jenga)', short: 'Equity Bank', initials: 'EQ', kind: 'bank', country: 'kenya', base_url: 'https://api.finserve.africa' },
  { code: 'absa_ke', label: 'Absa Bank Kenya', short: 'Absa Bank', initials: 'AB', kind: 'bank', country: 'kenya', base_url: '' },
  { code: 'coop_ke', label: 'Co-operative Bank Kenya', short: 'Co-operative Bank', initials: 'CO', kind: 'bank', country: 'kenya', base_url: '' },
  { code: 'jenga_rw', label: 'Equity Bank Rwanda (Jenga)', short: 'Equity Rwanda', initials: 'EQ', kind: 'bank', country: 'rwanda', base_url: 'https://api.finserve.africa' },
  { code: 'ecobank_gh', label: 'Ecobank Ghana', short: 'Ecobank', initials: 'EC', kind: 'bank', country: 'ghana', base_url: '' },
  { code: 'mpesa', label: 'M-Pesa (Daraja)', short: 'M-Pesa', initials: 'MP', kind: 'wallet', country: 'kenya', base_url: 'https://sandbox.safaricom.co.ke' },
  { code: 'mtn_momo', label: 'MTN MoMo', short: 'MTN MoMo', initials: 'MT', kind: 'wallet', country: 'ghana', base_url: '' },
  { code: 'airtel', label: 'Airtel Money', short: 'Airtel Money', initials: 'AT', kind: 'wallet', country: 'kenya', base_url: '' },
  { code: 'custom', label: 'Custom / Other', short: 'Custom rail', initials: '+', kind: 'custom', country: 'kenya', base_url: '' },
]

export const COUNTRY_META: Record<string, { label: string; currency: string; code: string }> = {
  kenya: { label: 'Kenya', currency: 'KES', code: 'KE' },
  rwanda: { label: 'Rwanda', currency: 'RWF', code: 'RW' },
  ghana: { label: 'Ghana', currency: 'GHS', code: 'GH' },
}

const WIZARD_STEPS = [
  { title: 'Bank', desc: 'Partner, coverage & environment' },
  { title: 'Credentials', desc: 'API keys & webhooks' },
  { title: 'Accounts', desc: 'Trust, savings, loan & fees' },
  { title: 'Review', desc: 'Confirm & activate' },
] as const

const PARTNER_GROUPS: { kind: PartnerKind; label: string }[] = [
  { kind: 'bank', label: 'Partner banks' },
  { kind: 'wallet', label: 'Mobile money' },
  { kind: 'custom', label: 'Custom' },
]

const DEFAULT_BADGE: Record<string, string> = {
  is_default_for_collections: 'Collections default',
  is_default_for_disbursements: 'Disbursements default',
  is_default_for_reconciliation: 'Reconciliation default',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const emptyAccountDraft = (currency: string): BankAccountDraft => ({
  account_number: '',
  account_name: '',
  currency,
  bank_code: '',
  branch_code: '',
})

export const buildEmptyBankForm = (): BankWizardForm => ({
  provider_code: 'jenga_ke',
  name: 'Equity Bank Kenya',
  country: 'kenya',
  region: '',
  environment: 'sandbox',
  status: 'inactive',
  base_url: 'https://api.finserve.africa',
  api_key: '',
  api_secret: '',
  merchant_code: '',
  webhook_url: '',
  webhook_secret: '',
  supports_collections: true,
  supports_disbursements: true,
  supports_mobile_money: true,
  accounts: {
    trust: emptyAccountDraft('KES'),
    savings: emptyAccountDraft('KES'),
    loan: emptyAccountDraft('KES'),
    fee: emptyAccountDraft('KES'),
  },
})

/** Build an edit form from an existing bank, loading its accounts into slots. */
export function providerToBankForm(provider: Provider): BankWizardForm {
  const currency = COUNTRY_META[provider.country]?.currency || 'KES'
  const accounts = buildEmptyBankForm().accounts
  for (const core of CORE_ACCOUNTS) {
    const match = (provider.accounts || []).find((a) => a.account_type === core.key && a.is_active !== false)
    accounts[core.key] = match
      ? {
          id: match.id,
          account_number: match.account_number || '',
          account_name: match.account_name || '',
          currency: match.currency || currency,
          bank_code: match.bank_code || '',
          branch_code: match.branch_code || '',
        }
      : emptyAccountDraft(currency)
  }
  return {
    id: provider.id,
    provider_code: provider.provider_code,
    name: provider.name,
    country: provider.country,
    region: provider.region || '',
    environment: (provider.environment as 'sandbox' | 'live') || 'sandbox',
    status: provider.status,
    base_url: provider.base_url || '',
    api_key: '',
    api_secret: '',
    merchant_code: provider.merchant_code || '',
    webhook_url: provider.webhook_url || '',
    webhook_secret: '',
    supports_collections: provider.supports_collections ?? true,
    supports_disbursements: provider.supports_disbursements ?? true,
    supports_mobile_money: provider.supports_mobile_money ?? true,
    accounts,
  }
}

/** Turn a wizard form into the request body. Secrets only sent when typed. */
export function bankFormToPayload(form: BankWizardForm): Record<string, unknown> {
  const accounts = CORE_ACCOUNTS.filter((core) => form.accounts[core.key].account_number.trim()).map((core) => {
    const draft = form.accounts[core.key]
    const defaults: Record<string, boolean> = {}
    if (core.defaultFlag) defaults[core.defaultFlag] = true
    return {
      ...(draft.id ? { id: draft.id } : {}),
      label: core.label,
      account_type: core.key,
      account_number: draft.account_number.trim(),
      account_name: draft.account_name.trim(),
      country_code: COUNTRY_META[form.country]?.code || 'KE',
      currency: draft.currency,
      bank_code: draft.bank_code.trim(),
      branch_code: draft.branch_code.trim(),
      ...defaults,
    }
  })
  const payload: Record<string, unknown> = {
    provider_code: form.provider_code,
    name: form.name,
    country: form.country,
    region: form.region.trim(),
    environment: form.environment,
    status: form.status,
    base_url: form.base_url.trim(),
    merchant_code: form.merchant_code.trim(),
    webhook_url: form.webhook_url.trim(),
    supports_collections: form.supports_collections,
    supports_disbursements: form.supports_disbursements,
    supports_mobile_money: form.supports_mobile_money,
    accounts,
  }
  if (form.api_key.trim()) payload.api_key = form.api_key.trim()
  if (form.api_secret.trim()) payload.api_secret = form.api_secret.trim()
  if (form.webhook_secret.trim()) payload.webhook_secret = form.webhook_secret.trim()
  return payload
}

export function maskAccount(value: string) {
  if (!value) return 'Not set'
  const tail = value.slice(-4)
  return `•••• ${tail}`
}

// ── Wizard ───────────────────────────────────────────────────────────────────

export function BankWizard({
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  form: BankWizardForm
  saving: boolean
  onChange: (form: BankWizardForm) => void
  onClose: () => void
  onSubmit: (form: BankWizardForm) => void
}) {
  const [step, setStep] = useState(0)
  const [nameTouched, setNameTouched] = useState(false)
  const set = (patch: Partial<BankWizardForm>) => onChange({ ...form, ...patch })
  const setAccount = (key: CoreAccountKey, patch: Partial<BankAccountDraft>) =>
    onChange({ ...form, accounts: { ...form.accounts, [key]: { ...form.accounts[key], ...patch } } })

  const selectPartner = (code: string) => {
    const partner = BANK_PARTNERS.find((p) => p.code === code)
    if (!partner) {
      set({ provider_code: code })
      return
    }
    const currency = COUNTRY_META[partner.country]?.currency || form.accounts.trust.currency
    const accounts = { ...form.accounts }
    for (const core of CORE_ACCOUNTS) accounts[core.key] = { ...accounts[core.key], currency }
    onChange({
      ...form,
      provider_code: code,
      country: partner.country,
      base_url: partner.base_url || form.base_url,
      name: form.id ? form.name : partner.short,
      accounts,
    })
  }

  const setCountry = (country: string) => {
    const currency = COUNTRY_META[country]?.currency || 'KES'
    const accounts = { ...form.accounts }
    for (const core of CORE_ACCOUNTS) accounts[core.key] = { ...accounts[core.key], currency }
    set({ country, accounts })
  }

  const applyCurrencyToAll = (currency: string) => {
    const accounts = { ...form.accounts }
    for (const core of CORE_ACCOUNTS) accounts[core.key] = { ...accounts[core.key], currency }
    set({ accounts })
  }

  const filledAccounts = CORE_ACCOUNTS.filter((c) => form.accounts[c.key].account_number.trim())
  const nameValid = Boolean(form.name.trim())
  const canContinue = step === 0 ? Boolean(nameValid && form.provider_code && form.country) : true
  const isLast = step === WIZARD_STEPS.length - 1
  const active = WIZARD_STEPS[step]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <button aria-label="Close" className="absolute inset-0 bg-navy/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_-15px_rgba(10,37,64,0.4)]">
        {/* Step rail */}
        <aside className="hidden w-[250px] shrink-0 flex-col justify-between bg-gradient-to-b from-navy to-[#0b2947] p-6 text-white md:flex">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/15">
                <Landmark size={18} />
              </span>
              <div className="leading-tight">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">OrbiSave</p>
                <p className="text-sm font-semibold">{form.id ? 'Edit bank' : 'Onboard a bank'}</p>
              </div>
            </div>

            <ol className="mt-8 space-y-1">
              {WIZARD_STEPS.map((s, i) => {
                const done = i < step
                const current = i === step
                return (
                  <li key={s.title} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < WIZARD_STEPS.length - 1 && (
                      <span className={`absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-px ${done ? 'bg-primary' : 'bg-white/15'}`} />
                    )}
                    <span
                      className={`relative z-10 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition ${
                        done
                          ? 'bg-primary text-white'
                          : current
                            ? 'bg-white text-navy ring-4 ring-white/15'
                            : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {done ? <Check size={13} /> : i + 1}
                    </span>
                    <div className="pt-0.5">
                      <p className={`text-sm font-medium ${current ? 'text-white' : done ? 'text-white/80' : 'text-white/45'}`}>
                        {s.title}
                      </p>
                      <p className={`text-[11px] leading-snug ${current ? 'text-white/60' : 'text-white/35'}`}>{s.desc}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <Lock size={14} className="mt-0.5 shrink-0 text-primary" />
            <p className="text-[11px] leading-snug text-white/60">
              Bank-grade encryption. Credentials are encrypted at rest and never shown again.
            </p>
          </div>
        </aside>

        {/* Content pane */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-8">
            <div className="min-w-0">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-primary md:hidden">
                Step {step + 1} of {WIZARD_STEPS.length}
              </p>
              <h2 className="text-xl font-semibold tracking-tight text-navy">{active.title}</h2>
              <p className="mt-0.5 text-sm text-slate-500">{active.desc}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy"
            >
              <X size={18} />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
            {step === 0 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  {PARTNER_GROUPS.map((group) => {
                    const items = BANK_PARTNERS.filter((p) => p.kind === group.kind)
                    if (!items.length) return null
                    return (
                      <div key={group.kind}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                          {items.map((p) => (
                            <PartnerCard
                              key={p.code}
                              partner={p}
                              selected={form.provider_code === p.code}
                              onSelect={() => selectPartner(p.code)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <WizardField label="Display name">
                      <input
                        value={form.name}
                        onChange={(e) => set({ name: e.target.value })}
                        onBlur={() => setNameTouched(true)}
                        aria-invalid={nameTouched && !nameValid}
                        className={`input-shell ${nameTouched && !nameValid ? 'border-[#d92d20] focus:border-[#d92d20] focus:ring-[#d92d20]/15' : ''}`}
                        placeholder="Equity Bank Kenya"
                      />
                    </WizardField>
                    {nameTouched && !nameValid && <p className="mt-1.5 text-xs text-[#b42318]">Give the bank a display name.</p>}
                  </div>
                  <WizardField label="Country">
                    <Segmented
                      value={form.country}
                      onChange={setCountry}
                      options={Object.entries(COUNTRY_META).map(([value, meta]) => ({ value, label: meta.label }))}
                    />
                  </WizardField>
                  <WizardField
                    label="Region"
                    hint="Leave blank for a country-wide bank. Later you can scope a bank to a region, e.g. Coast or Western, and assign different banks per region."
                  >
                    <input value={form.region} onChange={(e) => set({ region: e.target.value })} className="input-shell" placeholder="Country-wide" />
                  </WizardField>
                  <div className="sm:col-span-2">
                    <WizardField label="Environment" hint="Sandbox uses the bank’s test rails. Switch to Live only with production credentials.">
                      <Segmented
                        value={form.environment}
                        onChange={(v) => set({ environment: v as 'sandbox' | 'live' })}
                        options={[
                          { value: 'sandbox', label: 'Sandbox' },
                          { value: 'live', label: 'Live' },
                        ]}
                      />
                    </WizardField>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-start gap-2.5 rounded-xl border border-[#abefc6] bg-[#f6fef9] p-3.5">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#039855]" />
                  <p className="text-xs leading-snug text-[#067647]">
                    These credentials are encrypted at rest with bank-grade encryption and are never shown again. On edit,
                    leave a secret blank to keep the stored value.
                  </p>
                </div>

                <FieldGroup title="Connection">
                  <div className="sm:col-span-2">
                    <WizardField label="API base URL" hint="The bank’s API host for the selected environment.">
                      <input value={form.base_url} onChange={(e) => set({ base_url: e.target.value })} className="input-shell" placeholder="https://api.finserve.africa" />
                    </WizardField>
                  </div>
                </FieldGroup>

                <FieldGroup title="API credentials">
                  <WizardField label="API key / Consumer key">
                    <input value={form.api_key} onChange={(e) => set({ api_key: e.target.value })} className="input-shell" placeholder={form.id ? 'Leave blank to keep current' : ''} />
                  </WizardField>
                  <WizardField label="API secret / Consumer secret">
                    <input type="password" value={form.api_secret} onChange={(e) => set({ api_secret: e.target.value })} className="input-shell" placeholder={form.id ? 'Leave blank to keep current' : ''} />
                  </WizardField>
                  <div className="sm:col-span-2">
                    <WizardField label="Merchant code" hint="The merchant or business short code the bank issued for your account.">
                      <input value={form.merchant_code} onChange={(e) => set({ merchant_code: e.target.value })} className="input-shell" />
                    </WizardField>
                  </div>
                </FieldGroup>

                <FieldGroup title="Webhooks">
                  <div className="sm:col-span-2">
                    <WizardField label="Webhook URL" hint="Our endpoint the bank calls back with settlement events.">
                      <input value={form.webhook_url} onChange={(e) => set({ webhook_url: e.target.value })} className="input-shell" placeholder="https://api.orbisave.com/webhooks/…" />
                    </WizardField>
                  </div>
                  <div className="sm:col-span-2">
                    <WizardField label="Webhook secret" hint="Used to verify signatures on callbacks the bank sends us.">
                      <input type="password" value={form.webhook_secret} onChange={(e) => set({ webhook_secret: e.target.value })} className="input-shell" placeholder={form.id ? 'Leave blank to keep current' : ''} />
                    </WizardField>
                  </div>
                </FieldGroup>

                <FieldGroup title="Capabilities" hint="What this rail can do. Turn off any it does not support.">
                  <div className="sm:col-span-2 flex flex-wrap gap-2">
                    <Toggle checked={form.supports_collections} onChange={(v) => set({ supports_collections: v })} label="Collections" />
                    <Toggle checked={form.supports_disbursements} onChange={(v) => set({ supports_disbursements: v })} label="Disbursements" />
                    <Toggle checked={form.supports_mobile_money} onChange={(v) => set({ supports_mobile_money: v })} label="Mobile money" />
                  </div>
                </FieldGroup>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500">
                    The four accounts this bank holds for OrbiSave. Leave any you do not have yet blank.
                  </p>
                  <button
                    type="button"
                    onClick={() => applyCurrencyToAll(COUNTRY_META[form.country]?.currency || 'KES')}
                    className="shrink-0 text-xs font-medium text-primary transition hover:text-[#009200]"
                  >
                    Reset currency to {COUNTRY_META[form.country]?.currency || 'KES'}
                  </button>
                </div>
                {CORE_ACCOUNTS.map((core) => (
                  <AccountCard
                    key={core.key}
                    core={core}
                    draft={form.accounts[core.key]}
                    onChange={(patch) => setAccount(core.key, patch)}
                  />
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bank</p>
                    <button type="button" onClick={() => setStep(0)} className="text-xs font-medium text-primary hover:text-[#009200]">
                      Edit
                    </button>
                  </div>
                  <div className="grid gap-2.5 p-4 text-sm sm:grid-cols-2">
                    <ReviewRow label="Name" value={form.name} />
                    <ReviewRow label="Partner" value={BANK_PARTNERS.find((p) => p.code === form.provider_code)?.short || form.provider_code} />
                    <ReviewRow label="Coverage" value={`${COUNTRY_META[form.country]?.label || form.country}${form.region ? ` · ${form.region}` : ' · Country-wide'}`} />
                    <ReviewRow label="Environment" value={<span className="capitalize">{form.environment}</span>} />
                    <ReviewRow label="Base URL" value={form.base_url || 'Not set'} />
                    <ReviewRow label="Credentials" value={form.api_key || form.id ? 'Provided' : 'None yet'} />
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Accounts · {filledAccounts.length} of {CORE_ACCOUNTS.length}
                    </p>
                    <button type="button" onClick={() => setStep(2)} className="text-xs font-medium text-primary hover:text-[#009200]">
                      Edit
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {CORE_ACCOUNTS.map((core) => {
                      const Icon = core.icon
                      const draft = form.accounts[core.key]
                      const filled = Boolean(draft.account_number.trim())
                      return (
                        <div key={core.key} className="flex items-center gap-3 px-4 py-2.5">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${filled ? 'bg-[#ecfdf3] text-[#039855]' : 'bg-slate-50 text-slate-300'}`}>
                            <Icon size={15} />
                          </span>
                          <span className="flex-1 text-sm text-navy">{core.label}</span>
                          {filled ? (
                            <span className="text-sm tabular-nums text-slate-500">
                              {maskAccount(draft.account_number)} · {draft.currency}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">Skipped</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <WizardField label="Status on save" hint="Inactive keeps the bank off the rails. Testing lets you run a connection test. Active puts it live for its region.">
                  <Segmented
                    value={form.status}
                    onChange={(v) => set({ status: v })}
                    options={[
                      { value: 'inactive', label: 'Inactive' },
                      { value: 'testing', label: 'Testing' },
                      { value: 'active', label: 'Active' },
                    ]}
                  />
                </WizardField>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:px-8">
            <button
              onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-medium text-slate-500 transition hover:text-navy"
            >
              {step === 0 ? 'Cancel' : (<><ArrowLeft size={15} /> Back</>)}
            </button>
            {isLast ? (
              <button
                onClick={() => onSubmit(form)}
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                {form.id ? 'Save bank' : 'Add bank'}
              </button>
            ) : (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canContinue}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PartnerCard({
  partner,
  selected,
  onSelect,
}: {
  partner: (typeof BANK_PARTNERS)[number]
  selected: boolean
  onSelect: () => void
}) {
  const KindIcon = partner.kind === 'wallet' ? Smartphone : partner.kind === 'custom' ? Plus : Landmark
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition ${
        selected
          ? 'border-primary bg-primary/[0.04] shadow-[0_1px_2px_rgba(10,37,64,0.04)] ring-1 ring-primary'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-[0_2px_8px_-2px_rgba(10,37,64,0.1)]'
      }`}
    >
      {selected && (
        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
          <Check size={11} />
        </span>
      )}
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-bold ${
          partner.kind === 'custom' ? 'bg-slate-100 text-slate-400' : 'bg-navy/[0.06] text-navy'
        }`}
      >
        {partner.kind === 'custom' ? <KindIcon size={16} /> : partner.initials}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-navy">{partner.short}</p>
        <p className="flex items-center gap-1 truncate text-[11px] text-slate-400">
          <KindIcon size={10} />
          {COUNTRY_META[partner.country]?.label || partner.country}
        </p>
      </div>
    </button>
  )
}

function FieldGroup({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
        {hint && <InfoHint text={hint} />}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function AccountCard({
  core,
  draft,
  onChange,
}: {
  core: (typeof CORE_ACCOUNTS)[number]
  draft: BankAccountDraft
  onChange: (patch: Partial<BankAccountDraft>) => void
}) {
  const Icon = core.icon
  const filled = Boolean(draft.account_number.trim())
  const badge = core.defaultFlag ? DEFAULT_BADGE[core.defaultFlag] : null
  return (
    <div className={`rounded-2xl border p-4 transition ${filled ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/40'}`}>
      <div className="mb-3.5 flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${filled ? 'bg-[#ecfdf3] text-[#039855]' : 'bg-white text-slate-400 ring-1 ring-slate-200'}`}>
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-navy">{core.label}</p>
            {badge && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{badge}</span>
            )}
          </div>
          <p className="mt-0.5 text-xs leading-snug text-slate-400">{core.hint}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={draft.account_number}
          onChange={(e) => onChange({ account_number: e.target.value })}
          className="input-shell"
          placeholder="Account number"
          inputMode="numeric"
        />
        <input
          value={draft.account_name}
          onChange={(e) => onChange({ account_name: e.target.value })}
          className="input-shell"
          placeholder="Account name"
        />
        <input
          value={draft.currency}
          onChange={(e) => onChange({ currency: e.target.value.toUpperCase() })}
          className="input-shell"
          placeholder="Currency"
          maxLength={5}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={draft.bank_code}
            onChange={(e) => onChange({ bank_code: e.target.value })}
            className="input-shell"
            placeholder="Bank code"
          />
          <input
            value={draft.branch_code}
            onChange={(e) => onChange({ branch_code: e.target.value })}
            className="input-shell"
            placeholder="Branch"
          />
        </div>
      </div>
    </div>
  )
}

function InfoHint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <Info className="h-3.5 w-3.5 cursor-help text-slate-400" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 w-56 -translate-x-1/2 rounded-lg bg-navy px-3 py-2 text-[11px] font-medium leading-snug text-white opacity-0 shadow-lg transition group-hover:opacity-100">
        {text}
      </span>
    </span>
  )
}

function WizardField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        {label}
        {hint && <InfoHint text={hint} />}
      </span>
      {children}
    </label>
  )
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            value === opt.value ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-navy'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        checked ? 'border-primary/30 bg-primary/5 text-primary' : 'border-slate-200 bg-white text-slate-500'
      }`}
    >
      <span className={`flex h-4 w-4 items-center justify-center rounded ${checked ? 'bg-primary text-white' : 'bg-slate-200'}`}>
        {checked && <Check size={11} />}
      </span>
      {label}
    </button>
  )
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-400">{label}</span>
      <span className="max-w-[60%] truncate text-right font-medium text-navy">{value}</span>
    </div>
  )
}
