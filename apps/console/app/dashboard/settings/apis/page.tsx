'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Building2,
  Check,
  CheckCircle,
  Clock,
  Coins,
  Database,
  Fingerprint,
  Info,
  Key,
  Landmark,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  PiggyBank,
  Plus,
  Smartphone,
  RefreshCcw,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  Trash2,
  Video,
  X,
  Zap,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'

import { api } from '@/lib/api'

type TabKey = 'kyc' | 'payments' | 'sms' | 'meetings' | 'platform' | 'logs'

interface Config {
  id: string
  key: string
  value: string
  category: string
  description: string
  is_encrypted: boolean
  updated_at: string
}

interface BankAccount {
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

interface Provider {
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
  last_test_status?: string
  last_test_message?: string
}

/** The four accounts every partner bank holds for OrbiSave, in wizard order. */
const CORE_ACCOUNTS = [
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

interface BankAccountDraft {
  id?: string
  account_number: string
  account_name: string
  currency: string
  bank_code: string
  branch_code: string
}

interface BankWizardForm {
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

/**
 * Partner rails we can plug in. Selecting one prefills name, country and base
 * URL. `short` is the card title, `kind` groups them (bank vs wallet vs custom)
 * and `initials` renders the logo tile when we have no brand mark.
 */
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

const COUNTRY_META: Record<string, { label: string; currency: string; code: string }> = {
  kenya: { label: 'Kenya', currency: 'KES', code: 'KE' },
  rwanda: { label: 'Rwanda', currency: 'RWF', code: 'RW' },
  ghana: { label: 'Ghana', currency: 'GHS', code: 'GH' },
}

const emptyAccountDraft = (currency: string): BankAccountDraft => ({
  account_number: '',
  account_name: '',
  currency,
  bank_code: '',
  branch_code: '',
})

const buildEmptyBankForm = (): BankWizardForm => ({
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

interface KycProvider {
  id: string
  name: string
  provider_code: 'didit' | 'custom'
  environment: 'sandbox' | 'live'
  status: string
  base_url: string
  workflow_id: string
  client_id: string
  webhook_url: string
  allowed_events: string[]
  notes: string
  has_client_secret: boolean
  has_webhook_secret: boolean
  last_tested_at?: string | null
  last_test_status?: string
  last_test_message?: string
  updated_at: string
}

interface KycProviderForm {
  id?: string
  name: string
  provider_code: 'didit' | 'custom'
  environment: 'sandbox' | 'live'
  status: string
  base_url: string
  workflow_id: string
  client_id: string
  client_secret: string
  webhook_url: string
  webhook_secret: string
  allowed_events: string
  notes: string
}

interface MeetingProvider {
  id: string
  name: string
  provider_code: 'daily'
  environment: 'sandbox' | 'live'
  status: string
  base_url: string
  webhook_url: string
  allowed_events: string[]
  notes: string
  has_api_key: boolean
  has_webhook_secret: boolean
  last_tested_at?: string | null
  last_test_status?: string
  last_test_message?: string
  updated_at: string
}

interface MeetingProviderForm {
  id?: string
  name: string
  provider_code: 'daily'
  environment: 'sandbox' | 'live'
  status: string
  base_url: string
  api_key: string
  webhook_url: string
  webhook_secret: string
  allowed_events: string
  notes: string
}

interface SmsProvider {
  id: string
  name: string
  provider_code: 'africastalking' | 'custom'
  environment: 'sandbox' | 'live'
  status: string
  username: string
  sender_id: string
  notes: string
  has_api_key: boolean
  last_tested_at?: string | null
  last_test_status?: string
  last_test_message?: string
  updated_at: string
}

interface SmsProviderForm {
  id?: string
  name: string
  provider_code: 'africastalking' | 'custom'
  environment: 'sandbox' | 'live'
  status: string
  username: string
  api_key: string
  sender_id: string
  notes: string
}

interface LogEntry {
  id: string
  provider_name: string
  direction: string
  endpoint: string
  method: string
  response_code: number
  success: boolean
  duration_ms: number
  created_at: string
}

const emptyKycForm: KycProviderForm = {
  name: 'Didit Identity Verification',
  provider_code: 'didit',
  environment: 'sandbox',
  status: 'inactive',
  base_url: 'https://verification.didit.me',
  workflow_id: '',
  client_id: '',
  client_secret: '',
  webhook_url: '',
  webhook_secret: '',
  allowed_events: 'verification.completed, verification.failed, verification.review_required',
  notes: '',
}

const emptyMeetingForm: MeetingProviderForm = {
  name: 'Daily Embedded Meetings',
  provider_code: 'daily',
  environment: 'sandbox',
  status: 'inactive',
  base_url: 'https://api.daily.co/v1',
  api_key: '',
  webhook_url: '',
  webhook_secret: '',
  allowed_events: 'room.started, room.ended, participant.joined, participant.left',
  notes: '',
}

const emptySmsForm: SmsProviderForm = {
  name: "Africa's Talking SMS",
  provider_code: 'africastalking',
  environment: 'sandbox',
  status: 'inactive',
  username: 'sandbox',
  api_key: '',
  sender_id: '',
  notes: '',
}

export default function ApiOperationsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('payments')
  const [configs, setConfigs] = useState<Config[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [kycProviders, setKycProviders] = useState<KycProvider[]>([])
  const [meetingProviders, setMeetingProviders] = useState<MeetingProvider[]>([])
  const [smsProviders, setSmsProviders] = useState<SmsProvider[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [savingKyc, setSavingKyc] = useState(false)
  const [savingMeetingProvider, setSavingMeetingProvider] = useState(false)
  const [savingSms, setSavingSms] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [showKycDialog, setShowKycDialog] = useState(false)
  const [showMeetingDialog, setShowMeetingDialog] = useState(false)
  const [showSmsDialog, setShowSmsDialog] = useState(false)
  const [showBankWizard, setShowBankWizard] = useState(false)
  const [savingBank, setSavingBank] = useState(false)
  const [bankForm, setBankForm] = useState<BankWizardForm>(buildEmptyBankForm)
  const [kycForm, setKycForm] = useState<KycProviderForm>(emptyKycForm)
  const [meetingForm, setMeetingForm] = useState<MeetingProviderForm>(emptyMeetingForm)
  const [smsForm, setSmsForm] = useState<SmsProviderForm>(emptySmsForm)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [configRes, providerRes, kycRes, meetingRes, smsRes, logRes, metricRes] = await Promise.all([
        api.get('/admin-portal/superadmin/settings/?category=api_data'),
        api.get('/admin-portal/superadmin/payment-providers/'),
        api.get('/admin-portal/superadmin/kyc-providers/'),
        api.get('/admin-portal/superadmin/meeting-providers/'),
        api.get('/admin-portal/superadmin/notification-providers/'),
        api.get('/admin-portal/superadmin/monitoring/logs/'),
        api.get('/admin-portal/superadmin/monitoring/metrics/'),
      ])
      setConfigs(configRes.data || [])
      setProviders(providerRes.data.results || [])
      setKycProviders(kycRes.data.results || [])
      setMeetingProviders(meetingRes.data.results || [])
      setSmsProviders(smsRes.data.results || [])
      // Paginated envelope: { count, page, results }. The old endpoint
      // returned a bare array, so accept both while anything is in flight.
      setLogs(logRes.data?.results || (Array.isArray(logRes.data) ? logRes.data : []))
      setMetrics(metricRes.data || null)
    } catch (error) {
      toast.error('API operations data could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  const health = metrics?.summary?.success_rate ?? 100
  const meetingProvidersConfigured = meetingProviders.length
  const connectedServices =
    configs.length + providers.length + kycProviders.length + meetingProvidersConfigured + smsProviders.length

  const tabs = useMemo(
    () => [
      { key: 'payments' as const, label: 'Banks & Payments', count: providers.length },
      { key: 'kyc' as const, label: 'KYC Identity', count: kycProviders.length },
      { key: 'sms' as const, label: 'SMS / OTP', count: smsProviders.length },
      { key: 'meetings' as const, label: 'Meetings', count: meetingProvidersConfigured },
      { key: 'platform' as const, label: 'Platform APIs', count: configs.length },
      { key: 'logs' as const, label: 'Audit Logs', count: logs.length },
    ],
    [configs.length, kycProviders.length, logs.length, meetingProvidersConfigured, providers.length, smsProviders.length],
  )

  const openSmsDialog = (provider?: SmsProvider) => {
    if (provider) {
      setSmsForm({
        id: provider.id,
        name: provider.name,
        provider_code: provider.provider_code,
        environment: provider.environment,
        status: provider.status,
        username: provider.username || '',
        api_key: '',
        sender_id: provider.sender_id || '',
        notes: provider.notes || '',
      })
    } else {
      setSmsForm(emptySmsForm)
    }
    setShowSmsDialog(true)
  }

  const saveSmsProvider = async (event: FormEvent) => {
    event.preventDefault()
    setSavingSms(true)
    try {
      if (smsForm.id) {
        await api.patch(`/admin-portal/superadmin/notification-providers/${smsForm.id}/`, smsForm)
      } else {
        await api.post('/admin-portal/superadmin/notification-providers/', smsForm)
      }
      toast.success('SMS provider configuration saved.')
      setShowSmsDialog(false)
      await fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'SMS provider could not be saved.')
    } finally {
      setSavingSms(false)
    }
  }

  const testSmsProvider = async (id: string) => {
    setTestingId(id)
    try {
      // Bare field-completeness check; a Console operator can add test_phone
      // to send a real message. Kept simple here.
      const { data } = await api.post(`/admin-portal/superadmin/notification-providers/${id}/test/`)
      if (data.success) {
        toast.success(data.message || 'SMS provider configuration is ready.')
      } else {
        toast.error(data.message || 'SMS provider configuration needs attention.')
      }
      await fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'SMS provider test failed.')
    } finally {
      setTestingId(null)
    }
  }

  const toggleSmsProvider = async (id: string) => {
    try {
      await api.post(`/admin-portal/superadmin/notification-providers/${id}/toggle/`)
      toast.success('SMS provider status updated.')
      await fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'SMS provider status could not be changed.')
    }
  }

  const openBankWizard = (provider?: Provider) => {
    if (provider) {
      const currency = COUNTRY_META[provider.country]?.currency || 'KES'
      const accounts = buildEmptyBankForm().accounts
      // Load each stored account into its matching core slot (first per type).
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
      setBankForm({
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
      })
    } else {
      setBankForm(buildEmptyBankForm())
    }
    setShowBankWizard(true)
  }

  const saveBank = async (form: BankWizardForm) => {
    setSavingBank(true)
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
    // Secrets are write-only; only send them when the operator typed one, so an
    // edit that leaves them blank keeps the stored value.
    if (form.api_key.trim()) payload.api_key = form.api_key.trim()
    if (form.api_secret.trim()) payload.api_secret = form.api_secret.trim()
    if (form.webhook_secret.trim()) payload.webhook_secret = form.webhook_secret.trim()
    try {
      if (form.id) {
        await api.patch(`/admin-portal/superadmin/payment-providers/${form.id}/`, payload)
      } else {
        await api.post('/admin-portal/superadmin/payment-providers/', payload)
      }
      toast.success(`${form.name} saved.`)
      setShowBankWizard(false)
      await fetchData()
    } catch (error: any) {
      const detail = error.response?.data
      const message =
        typeof detail === 'object' && detail
          ? Object.values(detail).flat().join(' ')
          : 'Bank could not be saved.'
      toast.error(message || 'Bank could not be saved.')
    } finally {
      setSavingBank(false)
    }
  }

  const testBank = async (id: string) => {
    setTestingId(id)
    try {
      const { data } = await api.post(`/admin-portal/superadmin/payment-providers/${id}/test/`)
      if (data.success) {
        toast.success(data.message || 'Bank connection is healthy.')
      } else {
        toast.error(data.message || 'Bank connection needs attention.')
      }
      await fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Bank connection test failed.')
    } finally {
      setTestingId(null)
    }
  }

  const toggleBank = async (id: string) => {
    try {
      await api.post(`/admin-portal/superadmin/payment-providers/${id}/toggle/`)
      toast.success('Bank status updated.')
      await fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Bank status could not be changed.')
    }
  }

  const deleteBank = async (id: string, name: string) => {
    if (!window.confirm(`Remove ${name}? This cannot be undone.`)) return
    try {
      await api.delete(`/admin-portal/superadmin/payment-providers/${id}/`)
      toast.success(`${name} removed.`)
      await fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Bank could not be removed.')
    }
  }

  const openKycDialog = (provider?: KycProvider) => {
    if (provider) {
      setKycForm({
        id: provider.id,
        name: provider.name,
        provider_code: provider.provider_code,
        environment: provider.environment,
        status: provider.status,
        base_url: provider.base_url || 'https://verification.didit.me',
        workflow_id: provider.workflow_id || '',
        client_id: provider.client_id || '',
        client_secret: '',
        webhook_url: provider.webhook_url || '',
        webhook_secret: '',
        allowed_events: (provider.allowed_events || []).join(', '),
        notes: provider.notes || '',
      })
    } else {
      setKycForm(emptyKycForm)
    }
    setShowKycDialog(true)
  }

  const openMeetingDialog = (provider?: MeetingProvider) => {
    if (provider) {
      setMeetingForm({
        id: provider.id,
        name: provider.name,
        provider_code: provider.provider_code,
        environment: provider.environment,
        status: provider.status,
        base_url: provider.base_url || 'https://api.daily.co/v1',
        api_key: '',
        webhook_url: provider.webhook_url || '',
        webhook_secret: '',
        allowed_events: (provider.allowed_events || []).join(', '),
        notes: provider.notes || '',
      })
    } else {
      setMeetingForm(emptyMeetingForm)
    }
    setShowMeetingDialog(true)
  }

  const saveKycProvider = async (event: FormEvent) => {
    event.preventDefault()
    setSavingKyc(true)
    const payload = {
      ...kycForm,
      allowed_events: kycForm.allowed_events
        .split(',')
        .map((eventName) => eventName.trim())
        .filter(Boolean),
    }
    try {
      if (kycForm.id) {
        await api.patch(`/admin-portal/superadmin/kyc-providers/${kycForm.id}/`, payload)
      } else {
        await api.post('/admin-portal/superadmin/kyc-providers/', payload)
      }
      toast.success('KYC provider configuration saved.')
      setShowKycDialog(false)
      await fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'KYC provider could not be saved.')
    } finally {
      setSavingKyc(false)
    }
  }

  const testKycProvider = async (id: string) => {
    setTestingId(id)
    try {
      const { data } = await api.post(`/admin-portal/superadmin/kyc-providers/${id}/test/`)
      if (data.success) {
        toast.success(data.message || 'KYC provider configuration is ready.')
      } else {
        toast.error(data.message || 'KYC provider configuration needs attention.')
      }
      await fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'KYC provider test failed.')
    } finally {
      setTestingId(null)
    }
  }

  const toggleKycProvider = async (id: string) => {
    try {
      await api.post(`/admin-portal/superadmin/kyc-providers/${id}/toggle/`)
      toast.success('KYC provider status updated.')
      await fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'KYC provider status could not be changed.')
    }
  }

  const saveMeetingProvider = async (event: FormEvent) => {
    event.preventDefault()
    setSavingMeetingProvider(true)
    const payload = {
      ...meetingForm,
      allowed_events: meetingForm.allowed_events
        .split(',')
        .map((eventName) => eventName.trim())
        .filter(Boolean),
    }
    try {
      if (meetingForm.id) {
        await api.patch(`/admin-portal/superadmin/meeting-providers/${meetingForm.id}/`, payload)
      } else {
        await api.post('/admin-portal/superadmin/meeting-providers/', payload)
      }
      toast.success('Meeting provider configuration saved.')
      setShowMeetingDialog(false)
      await fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Meeting provider could not be saved.')
    } finally {
      setSavingMeetingProvider(false)
    }
  }

  const testMeetingProvider = async (id: string) => {
    setTestingId(id)
    try {
      const { data } = await api.post(`/admin-portal/superadmin/meeting-providers/${id}/test/`)
      if (data.success) {
        toast.success(data.message || 'Meeting provider configuration is ready.')
      } else {
        toast.error(data.message || 'Meeting provider configuration needs attention.')
      }
      await fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Meeting provider test failed.')
    } finally {
      setTestingId(null)
    }
  }

  const toggleMeetingProvider = async (id: string) => {
    try {
      await api.post(`/admin-portal/superadmin/meeting-providers/${id}/toggle/`)
      toast.success('Meeting provider status updated.')
      await fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Meeting provider status could not be changed.')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-navy">Integrations</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-500">
            Partner banks and their accounts, identity, messaging and meeting providers. Credentials are encrypted at
            rest and never returned to the console.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchData}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-navy shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <RefreshCcw size={15} />
            Refresh
          </button>
          <button
            onClick={() =>
              activeTab === 'payments'
                ? openBankWizard()
                : activeTab === 'meetings'
                  ? openMeetingDialog()
                  : activeTab === 'sms'
                    ? openSmsDialog()
                    : openKycDialog()
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            <Plus size={16} />
            {activeTab === 'payments'
              ? 'Add bank'
              : activeTab === 'meetings'
                ? 'Add meeting provider'
                : activeTab === 'sms'
                  ? 'Add SMS provider'
                  : 'Add KYC provider'}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {loading ? (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        ) : (
          <>
            <MetricCard label="Provider Health" value={`${health.toFixed(1)}%`} icon={<ShieldCheck size={18} />} tone="green" />
            <MetricCard label="Connected Services" value={connectedServices} icon={<Database size={18} />} tone="slate" />
            <MetricCard label="Avg Latency" value={`${Math.round(metrics?.summary?.avg_latency || 0)}ms`} icon={<Clock size={18} />} tone="amber" />
            <MetricCard label="Operational Logs" value={logs.length} icon={<Terminal size={18} />} tone="slate" />
          </>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-navy">Provider Activity</h2>
            <p className="text-xs font-medium text-slate-500">Live API calls appear after providers begin sending traffic.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
            <Activity size={14} />
            Last 7 days
          </span>
        </div>
        <div className="h-64">
          {loading ? (
            <div className="h-full animate-pulse rounded-lg bg-slate-100" />
          ) : metrics?.history?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.history}>
                <defs>
                  <linearGradient id="apiCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ab00" stopOpacity={0.14} />
                    <stop offset="95%" stopColor="#00ab00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="total_calls" stroke="#00ab00" strokeWidth={2} fill="url(#apiCalls)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={<Activity size={22} />}
              title="No provider traffic yet"
              description="API activity will appear here after payment or KYC providers start sending requests."
            />
          )}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-center gap-5 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex h-11 items-center gap-2 text-sm font-semibold transition ${
                activeTab === tab.key ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
              {activeTab === tab.key && <span className="absolute -bottom-px left-0 h-0.5 w-full rounded-full bg-primary" />}
            </button>
          ))}
        </div>

        {activeTab === 'kyc' && (
          <KycTab
            loading={loading}
            providers={kycProviders}
            testingId={testingId}
            onAdd={() => openKycDialog()}
            onEdit={openKycDialog}
            onTest={testKycProvider}
            onToggle={toggleKycProvider}
          />
        )}
        {activeTab === 'payments' && (
          <BanksTab
            loading={loading}
            providers={providers}
            testingId={testingId}
            onAdd={() => openBankWizard()}
            onEdit={openBankWizard}
            onTest={testBank}
            onToggle={toggleBank}
            onDelete={deleteBank}
          />
        )}
        {activeTab === 'sms' && (
          <SmsProvidersTab
            loading={loading}
            providers={smsProviders}
            testingId={testingId}
            onAdd={() => openSmsDialog()}
            onEdit={openSmsDialog}
            onTest={testSmsProvider}
            onToggle={toggleSmsProvider}
          />
        )}
        {activeTab === 'meetings' && (
          <MeetingProvidersTab
            loading={loading}
            providers={meetingProviders}
            testingId={testingId}
            onAdd={() => openMeetingDialog()}
            onEdit={openMeetingDialog}
            onTest={testMeetingProvider}
            onToggle={toggleMeetingProvider}
          />
        )}
        {activeTab === 'platform' && <PlatformTab loading={loading} configs={configs} />}
        {activeTab === 'logs' && <LogsTab loading={loading} logs={logs} />}
      </section>

      {showBankWizard && (
        <BankWizard
          form={bankForm}
          saving={savingBank}
          onChange={setBankForm}
          onClose={() => setShowBankWizard(false)}
          onSubmit={saveBank}
        />
      )}
      {showKycDialog && (
        <KycDialog
          form={kycForm}
          saving={savingKyc}
          onChange={setKycForm}
          onClose={() => setShowKycDialog(false)}
          onSubmit={saveKycProvider}
        />
      )}
      {showMeetingDialog && (
        <MeetingProviderDialog
          form={meetingForm}
          saving={savingMeetingProvider}
          onChange={setMeetingForm}
          onClose={() => setShowMeetingDialog(false)}
          onSubmit={saveMeetingProvider}
        />
      )}
      {showSmsDialog && (
        <SmsProviderDialog
          form={smsForm}
          saving={savingSms}
          onChange={setSmsForm}
          onClose={() => setShowSmsDialog(false)}
          onSubmit={saveSmsProvider}
        />
      )}
    </div>
  )
}

function SmsProvidersTab({
  loading,
  providers,
  testingId,
  onAdd,
  onEdit,
  onTest,
  onToggle,
}: {
  loading: boolean
  providers: SmsProvider[]
  testingId: string | null
  onAdd: () => void
  onEdit: (provider: SmsProvider) => void
  onTest: (id: string) => void
  onToggle: (id: string) => void
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProviderSkeleton />
        <ProviderSkeleton />
      </div>
    )
  }

  if (!providers.length) {
    return (
      <EmptyState
        icon={<MessageSquare size={24} />}
        title="No SMS provider configured"
        description="Add Africa's Talking to deliver signup OTPs, password-reset codes, and alerts. The active provider is used platform-wide."
        actionLabel="Add SMS Provider"
        onAction={onAdd}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {providers.map((provider) => (
        <div key={provider.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-primary">
                  <MessageSquare size={17} />
                </span>
                <div>
                  <p className="text-sm font-black text-navy">{provider.name}</p>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    {provider.provider_code} · {provider.environment}
                  </p>
                </div>
              </div>
            </div>
            <StatusBadge status={provider.status} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <DetailRow label="Username" value={provider.username || '-'} />
            <DetailRow label="Sender ID" value={provider.sender_id || '-'} />
            <DetailRow label="API Key" value={provider.has_api_key ? '•••••• set' : 'not set'} />
            <DetailRow label="Updated" value={new Date(provider.updated_at).toLocaleDateString()} />
          </div>

          {provider.last_test_message && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-500">
              {provider.last_test_message}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => onEdit(provider)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-black uppercase tracking-widest text-navy transition hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              onClick={() => onTest(provider.id)}
              disabled={testingId === provider.id}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-black uppercase tracking-widest text-navy transition hover:bg-slate-50 disabled:opacity-50"
            >
              {testingId === provider.id ? 'Testing…' : 'Test'}
            </button>
            <button
              onClick={() => onToggle(provider.id)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[11px] font-black uppercase tracking-widest text-white transition ${
                provider.status === 'active' ? 'bg-slate-400 hover:bg-slate-500' : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {provider.status === 'active' ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function SmsProviderDialog({
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  form: SmsProviderForm
  saving: boolean
  onChange: (form: SmsProviderForm) => void
  onClose: () => void
  onSubmit: (event: FormEvent) => void
}) {
  const set = (patch: Partial<SmsProviderForm>) => onChange({ ...form, ...patch })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-navy">{form.id ? 'Edit' : 'Add'} SMS Provider</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Delivers OTP and alerts. Credentials are encrypted at rest and never returned by the API.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-navy">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="md:col-span-2 space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Display name</span>
            <input value={form.name} onChange={(e) => set({ name: e.target.value })} required className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-navy outline-none focus:border-primary" />
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Provider</span>
            <select value={form.provider_code} onChange={(e) => set({ provider_code: e.target.value as SmsProviderForm['provider_code'] })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-navy outline-none focus:border-primary">
              <option value="africastalking">Africa&apos;s Talking</option>
              <option value="custom">Custom / Other</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Environment</span>
            <select value={form.environment} onChange={(e) => set({ environment: e.target.value as SmsProviderForm['environment'] })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-navy outline-none focus:border-primary">
              <option value="sandbox">Sandbox</option>
              <option value="live">Live</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Username</span>
            <input value={form.username} onChange={(e) => set({ username: e.target.value })} placeholder="sandbox" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-navy outline-none focus:border-primary" />
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Sender ID</span>
            <input value={form.sender_id} onChange={(e) => set({ sender_id: e.target.value })} placeholder="ORBISAVE" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-navy outline-none focus:border-primary" />
          </label>
          <label className="md:col-span-2 space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              API Key {form.id && <span className="text-slate-300">(leave blank to keep current)</span>}
            </span>
            <input type="password" value={form.api_key} onChange={(e) => set({ api_key: e.target.value })} placeholder="••••••••••••" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-navy outline-none focus:border-primary" />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-navy hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded-lg bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-primary/90 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Provider'}
          </button>
        </div>
      </form>
    </div>
  )
}

function KycTab({
  loading,
  providers,
  testingId,
  onAdd,
  onEdit,
  onTest,
  onToggle,
}: {
  loading: boolean
  providers: KycProvider[]
  testingId: string | null
  onAdd: () => void
  onEdit: (provider: KycProvider) => void
  onTest: (id: string) => void
  onToggle: (id: string) => void
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProviderSkeleton />
        <ProviderSkeleton />
      </div>
    )
  }

  if (!providers.length) {
    return (
      <EmptyState
        icon={<Fingerprint size={24} />}
        title="No KYC provider configured"
        description="Add Didit credentials, workflow ID, and webhook settings before automated identity verification goes live."
        actionLabel="Add Didit Provider"
        onAction={onAdd}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {providers.map((provider) => (
        <div key={provider.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-primary">
                <Fingerprint size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-navy">{provider.name}</h3>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {provider.provider_code} / {provider.environment}
                </p>
              </div>
            </div>
            <StatusBadge status={provider.status} />
          </div>

          <div className="grid gap-3 text-sm">
            <InfoRow label="Base URL" value={provider.base_url || 'Not set'} />
            <InfoRow label="Workflow ID" value={provider.workflow_id || 'Not set'} />
            <InfoRow label="Client secret" value={provider.has_client_secret ? 'Stored securely' : 'Missing'} secure={provider.has_client_secret} />
            <InfoRow label="Webhook URL" value={provider.webhook_url || 'Not set'} />
            <InfoRow label="Webhook secret" value={provider.has_webhook_secret ? 'Stored securely' : 'Missing'} secure={provider.has_webhook_secret} />
          </div>

          {provider.last_test_message && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">
              {provider.last_test_message}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              onClick={() => onTest(provider.id)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-navy transition hover:bg-slate-50"
            >
              {testingId === provider.id ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Test
            </button>
            <button
              onClick={() => onToggle(provider.id)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-navy transition hover:bg-slate-50"
            >
              <SlidersHorizontal size={14} />
              {provider.status === 'active' ? 'Disable' : 'Activate'}
            </button>
            <button
              onClick={() => onEdit(provider)}
              className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-navy/90"
            >
              Edit
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function BanksTab({
  loading,
  providers,
  testingId,
  onAdd,
  onEdit,
  onTest,
  onToggle,
  onDelete,
}: {
  loading: boolean
  providers: Provider[]
  testingId: string | null
  onAdd: () => void
  onEdit: (provider: Provider) => void
  onTest: (id: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string, name: string) => void
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ProviderSkeleton />
        <ProviderSkeleton />
      </div>
    )
  }

  if (!providers.length) {
    return (
      <EmptyState
        icon={<Landmark size={24} />}
        title="No partner banks yet"
        description="Add a partner bank (Equity, Absa, Co-operative and more) with its trust, savings, loan and company accounts. The wizard walks through it step by step."
        actionLabel="Add bank"
        onAction={onAdd}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {providers.map((provider) => (
        <BankCard
          key={provider.id}
          provider={provider}
          testing={testingId === provider.id}
          onEdit={() => onEdit(provider)}
          onTest={() => onTest(provider.id)}
          onToggle={() => onToggle(provider.id)}
          onDelete={() => onDelete(provider.id, provider.name)}
        />
      ))}
    </div>
  )
}

function maskAccount(value: string) {
  if (!value) return 'Not set'
  const tail = value.slice(-4)
  return `•••• ${tail}`
}

function BankCard({
  provider,
  testing,
  onEdit,
  onTest,
  onToggle,
  onDelete,
}: {
  provider: Provider
  testing: boolean
  onEdit: () => void
  onTest: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const activeAccounts = (provider.accounts || []).filter((a) => a.is_active !== false)
  const capabilities = [
    provider.supports_collections && 'Collections',
    provider.supports_disbursements && 'Disbursements',
    provider.supports_mobile_money && 'Mobile money',
  ].filter(Boolean) as string[]

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(10,37,64,0.04),0_1px_3px_rgba(10,37,64,0.06)] transition hover:border-slate-300 hover:shadow-[0_8px_24px_-8px_rgba(10,37,64,0.16)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ecfdf3] text-[#039855]">
            <Landmark size={21} />
          </span>
          <div>
            <p className="text-base font-semibold text-navy">{provider.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} className="text-slate-400" />
                {COUNTRY_META[provider.country]?.label || provider.country}
                {provider.region ? ` · ${provider.region}` : ' · Country-wide'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={provider.status} />
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              provider.environment === 'live' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {provider.environment}
          </span>
        </div>
      </div>

      {capabilities.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {capabilities.map((c) => (
            <span key={c} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              {c}
            </span>
          ))}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              provider.has_api_key ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Key size={11} />
            {provider.has_api_key ? 'Credentials set' : 'No credentials'}
          </span>
        </div>
      )}

      {/* Accounts */}
      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <Banknote size={12} /> Accounts ({activeAccounts.length})
        </p>
        {activeAccounts.length === 0 ? (
          <p className="text-xs text-slate-400">No accounts recorded yet. Edit to add them.</p>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {CORE_ACCOUNTS.map((core) => {
              const acc = activeAccounts.find((a) => a.account_type === core.key)
              if (!acc) return null
              const Icon = core.icon
              return (
                <div key={core.key} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5">
                  <Icon size={14} className="shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-navy">{core.label}</p>
                    <p className="truncate text-[11px] tabular-nums text-slate-400">
                      {maskAccount(acc.account_number)} · {acc.currency}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {provider.last_test_message && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">{provider.last_test_message}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={onTest}
          disabled={testing}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-navy transition hover:bg-slate-50 disabled:opacity-50"
        >
          {testing ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
          Test
        </button>
        <button
          onClick={onToggle}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-navy transition hover:bg-slate-50"
        >
          <SlidersHorizontal size={13} />
          {provider.status === 'active' ? 'Disable' : 'Enable'}
        </button>
        <button
          onClick={onEdit}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-navy transition hover:bg-slate-50"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          aria-label="Remove bank"
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Add / edit bank wizard ─────────────────────────────────────────────────

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

function WizardField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
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

function BankWizard({
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
      <div className="relative grid max-h-[92vh] w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_-15px_rgba(10,37,64,0.4)] md:grid-cols-[250px_1fr]">
        {/* Step rail */}
        <aside className="hidden flex-col justify-between bg-gradient-to-b from-navy to-[#0b2947] p-6 text-white md:flex">
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
        <div className="flex min-h-0 flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-8">
            <div className="min-w-0">
              {/* Mobile progress */}
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

function MeetingProvidersTab({
  loading,
  providers,
  testingId,
  onAdd,
  onEdit,
  onTest,
  onToggle,
}: {
  loading: boolean
  providers: MeetingProvider[]
  testingId: string | null
  onAdd: () => void
  onEdit: (provider: MeetingProvider) => void
  onTest: (id: string) => void
  onToggle: (id: string) => void
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProviderSkeleton />
        <ProviderSkeleton />
      </div>
    )
  }

  if (!providers.length) {
    return (
      <EmptyState
        icon={<Video size={24} />}
        title="No meeting provider configured"
        description="Add Daily.co credentials and webhook settings before embedded OrbiSave meeting rooms go live."
        actionLabel="Add Meeting Provider"
        onAction={onAdd}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {providers.map((provider) => (
        <div key={provider.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-primary">
                <Video size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-navy">{provider.name}</h3>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {provider.provider_code} / {provider.environment}
                </p>
              </div>
            </div>
            <StatusBadge status={provider.status} />
          </div>
          <div className="grid gap-3 text-sm">
            <InfoRow label="Base URL" value={provider.base_url || 'Not set'} />
            <InfoRow label="API key" value={provider.has_api_key ? 'Stored securely' : 'Missing'} secure={provider.has_api_key} />
            <InfoRow label="Webhook URL" value={provider.webhook_url || 'Not set'} />
            <InfoRow label="Webhook secret" value={provider.has_webhook_secret ? 'Stored securely' : 'Missing'} secure={provider.has_webhook_secret} />
            <InfoRow label="Allowed events" value={(provider.allowed_events || []).join(', ') || 'Not set'} />
          </div>
          {provider.last_test_message && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">
              {provider.last_test_message}
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              onClick={() => onTest(provider.id)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-navy transition hover:bg-slate-50"
            >
              {testingId === provider.id ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Test
            </button>
            <button
              onClick={() => onToggle(provider.id)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-navy transition hover:bg-slate-50"
            >
              <SlidersHorizontal size={14} />
              {provider.status === 'active' ? 'Disable' : 'Activate'}
            </button>
            <button
              onClick={() => onEdit(provider)}
              className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-navy/90"
            >
              Edit
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function PlatformTab({ loading, configs }: { loading: boolean; configs: Config[] }) {
  if (loading) {
    return <TableSkeleton />
  }

  if (!configs.length) {
    return (
      <EmptyState
        icon={<Key size={24} />}
        title="No platform API keys yet"
        description="Translation, messaging, and other shared API settings will appear here when configured."
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Service</th>
            <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Secret</th>
            <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {configs.map((config) => (
            <tr key={config.id} className="hover:bg-slate-50">
              <td className="px-5 py-4">
                <p className="text-sm font-black text-navy">{config.key.replace(/_/g, ' ')}</p>
                <p className="mt-1 text-xs text-slate-500">{config.description || 'Platform API configuration'}</p>
              </td>
              <td className="px-5 py-4 text-sm font-bold text-slate-600">
                {config.is_encrypted ? 'Stored securely' : config.value || 'Not set'}
              </td>
              <td className="px-5 py-4 text-xs font-bold text-slate-400">{formatDate(config.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LogsTab({ loading, logs }: { loading: boolean; logs: LogEntry[] }) {
  if (loading) {
    return <TableSkeleton />
  }

  if (!logs.length) {
    return (
      <EmptyState
        icon={<Terminal size={24} />}
        title="No provider logs yet"
        description="Provider callbacks and API test results will be listed here as soon as traffic begins."
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Time</th>
            <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Provider</th>
            <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Endpoint</th>
            <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-widest text-slate-400">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-slate-50">
              <td className="px-5 py-4 text-xs font-bold text-slate-400">{formatDate(log.created_at)}</td>
              <td className="px-5 py-4 text-sm font-black text-navy">{log.provider_name}</td>
              <td className="px-5 py-4">
                <span className="mr-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{log.method}</span>
                <span className="text-xs font-bold text-slate-500">{log.endpoint}</span>
              </td>
              <td className="px-5 py-4 text-right">
                <span className={`inline-flex items-center gap-2 rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest ${log.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  {log.success ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                  {log.response_code || 'N/A'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function KycDialog({
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  form: KycProviderForm
  saving: boolean
  onChange: (form: KycProviderForm) => void
  onClose: () => void
  onSubmit: (event: FormEvent) => void
}) {
  const update = (field: keyof KycProviderForm, value: string) => onChange({ ...form, [field]: value })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close dialog" className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={onSubmit} className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-primary">
              <Fingerprint size={21} />
            </div>
            <div>
              <h2 className="text-lg font-black text-navy">{form.id ? 'Edit KYC Provider' : 'Add Didit Provider'}</h2>
              <p className="text-xs font-medium text-slate-500">Secrets are stored write-only and are never returned to the console.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy">
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2">
          <Field label="Provider name">
            <input required value={form.name} onChange={(event) => update('name', event.target.value)} className="input-shell" />
          </Field>
          <Field label="Provider">
            <select value={form.provider_code} onChange={(event) => update('provider_code', event.target.value)} className="input-shell">
              <option value="didit">Didit</option>
              <option value="custom">Custom / Other</option>
            </select>
          </Field>
          <Field label="Environment">
            <select value={form.environment} onChange={(event) => update('environment', event.target.value)} className="input-shell">
              <option value="sandbox">Sandbox</option>
              <option value="live">Live</option>
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(event) => update('status', event.target.value)} className="input-shell">
              <option value="inactive">Inactive</option>
              <option value="testing">Testing</option>
              <option value="active">Active</option>
            </select>
          </Field>
          <Field label="Base URL">
            <input required value={form.base_url} onChange={(event) => update('base_url', event.target.value)} className="input-shell" />
          </Field>
          <Field label="Workflow ID">
            <input required value={form.workflow_id} onChange={(event) => update('workflow_id', event.target.value)} className="input-shell" />
          </Field>
          <Field label="Client ID">
            <input required value={form.client_id} onChange={(event) => update('client_id', event.target.value)} className="input-shell" />
          </Field>
          <Field label={form.id ? 'Client secret (leave blank to keep existing)' : 'Client secret'}>
            <input type="password" value={form.client_secret} onChange={(event) => update('client_secret', event.target.value)} className="input-shell" />
          </Field>
          <Field label="Webhook URL">
            <input required value={form.webhook_url} onChange={(event) => update('webhook_url', event.target.value)} className="input-shell" />
          </Field>
          <Field label={form.id ? 'Webhook secret (leave blank to keep existing)' : 'Webhook secret'}>
            <input type="password" value={form.webhook_secret} onChange={(event) => update('webhook_secret', event.target.value)} className="input-shell" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Allowed webhook events">
              <input value={form.allowed_events} onChange={(event) => update('allowed_events', event.target.value)} className="input-shell" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Internal notes">
              <textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} className="input-shell min-h-24 resize-y" />
            </Field>
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-lg px-5 text-xs font-black uppercase tracking-widest text-slate-500 transition hover:text-navy">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-primary/90 disabled:opacity-60">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save Provider
          </button>
        </div>
      </form>
    </div>
  )
}

function MeetingProviderDialog({
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  form: MeetingProviderForm
  saving: boolean
  onChange: (form: MeetingProviderForm) => void
  onClose: () => void
  onSubmit: (event: FormEvent) => void
}) {
  const update = (field: keyof MeetingProviderForm, value: string) => {
    onChange({ ...form, [field]: value })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close dialog" className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={onSubmit} className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-primary">
              <Video size={21} />
            </div>
            <div>
              <h2 className="text-lg font-black text-navy">{form.id ? 'Edit Meeting Provider' : 'Add Meeting Provider'}</h2>
              <p className="text-xs font-medium text-slate-500">Secrets are stored write-only and are never returned to the console.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy">
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2">
          <Field label="Provider name">
            <input required value={form.name} onChange={(event) => update('name', event.target.value)} className="input-shell" />
          </Field>
          <Field label="Provider">
            <input readOnly value="Daily.co" className="input-shell" />
          </Field>
          <Field label="Environment">
            <select value={form.environment} onChange={(event) => update('environment', event.target.value)} className="input-shell">
              <option value="sandbox">Sandbox</option>
              <option value="live">Live</option>
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(event) => update('status', event.target.value)} className="input-shell">
              <option value="inactive">Inactive</option>
              <option value="testing">Testing</option>
              <option value="active">Active</option>
            </select>
          </Field>
          <Field label="Base URL">
            <input required value={form.base_url} onChange={(event) => update('base_url', event.target.value)} className="input-shell" />
          </Field>
          <Field label={form.id ? 'Daily API key (leave blank to keep existing)' : 'Daily API key'}>
            <input type="password" value={form.api_key} onChange={(event) => update('api_key', event.target.value)} className="input-shell" />
          </Field>
          <Field label="Webhook URL">
            <input required value={form.webhook_url} onChange={(event) => update('webhook_url', event.target.value)} className="input-shell" />
          </Field>
          <Field label={form.id ? 'Webhook secret (leave blank to keep existing)' : 'Webhook secret'}>
            <input type="password" value={form.webhook_secret} onChange={(event) => update('webhook_secret', event.target.value)} className="input-shell" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Allowed webhook events">
              <input value={form.allowed_events} onChange={(event) => update('allowed_events', event.target.value)} className="input-shell" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Internal notes">
              <textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} className="input-shell min-h-24 resize-y" />
            </Field>
          </div>
        </div>

        <div className="mx-6 mb-5 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold leading-5 text-emerald-700">
          Daily.co is the production meeting provider for OrbiSave. It powers embedded rooms, member-only access, attendance events, and webhook-driven meeting automation.
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-lg px-5 text-xs font-black uppercase tracking-widest text-slate-500 transition hover:text-navy">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-primary/90 disabled:opacity-60">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save Provider
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function MetricCard({ label, value, icon, tone }: { label: string; value: string | number; icon: React.ReactNode; tone: 'green' | 'slate' | 'amber' }) {
  const toneClass = tone === 'green' ? 'bg-emerald-50 text-primary' : tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-navy'
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-black text-navy">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>{icon}</div>
      </div>
    </div>
  )
}

function MetricSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="h-3 w-28 rounded bg-slate-100" />
      <div className="mt-4 h-8 w-20 rounded bg-slate-100" />
    </div>
  )
}

function ProviderSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-lg bg-slate-100" />
        <div className="space-y-2">
          <div className="h-4 w-44 rounded bg-slate-100" />
          <div className="h-3 w-28 rounded bg-slate-100" />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <div className="h-4 rounded bg-slate-100" />
        <div className="h-4 rounded bg-slate-100" />
        <div className="h-4 rounded bg-slate-100" />
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="h-4 w-40 rounded bg-slate-100" />
      <div className="mt-6 space-y-4">
        <div className="h-5 rounded bg-slate-100" />
        <div className="h-5 rounded bg-slate-100" />
        <div className="h-5 rounded bg-slate-100" />
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-primary">{icon}</div>
      <h3 className="text-base font-black text-navy">{title}</h3>
      <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-primary/90">
          <Plus size={15} />
          {actionLabel}
        </button>
      )}
    </div>
  )
}

function InfoRow({ label, value, secure }: { label: string; value: string; secure?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-xs font-bold text-slate-400">{label}</span>
      <span className={`max-w-[60%] truncate text-right text-xs font-black ${secure ? 'text-primary' : 'text-navy'}`}>{value}</span>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-0.5 font-bold text-navy">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusClass =
    status === 'active'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'error'
        ? 'bg-red-50 text-red-600'
        : status === 'testing'
          ? 'bg-amber-50 text-amber-700'
          : 'bg-slate-100 text-slate-500'
  return <span className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusClass}`}>{status}</span>
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
