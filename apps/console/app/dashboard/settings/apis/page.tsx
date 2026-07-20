'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Clock,
  CreditCard,
  Database,
  ExternalLink,
  Fingerprint,
  Globe,
  Key,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  RefreshCcw,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
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

interface Provider {
  id: string
  name: string
  provider_code: string
  country: string
  environment: string
  status: string
  base_url: string
  last_tested_at?: string | null
  last_test_status?: string
  last_test_message?: string
}

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
  const [activeTab, setActiveTab] = useState<TabKey>('kyc')
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
      { key: 'kyc' as const, label: 'KYC Identity', count: kycProviders.length },
      { key: 'payments' as const, label: 'Payment Providers', count: providers.length },
      { key: 'sms' as const, label: 'SMS / OTP', count: smsProviders.length },
      { key: 'meetings' as const, label: 'Meeting Providers', count: meetingProvidersConfigured },
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
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Provider operations
          </div>
          <h1 className="text-3xl font-black tracking-tight text-navy md:text-4xl">API & Identity Settings</h1>
          <p className="max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Manage KYC provider credentials, webhooks, payment APIs, and platform service settings from the console.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchData}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-navy shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <RefreshCcw size={15} />
            Refresh
          </button>
          <button
            onClick={() =>
              activeTab === 'meetings'
                ? openMeetingDialog()
                : activeTab === 'sms'
                  ? openSmsDialog()
                  : openKycDialog()
            }
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-primary/90"
          >
            <Plus size={16} />
            {activeTab === 'meetings' ? 'Add Meeting Provider' : activeTab === 'sms' ? 'Add SMS Provider' : 'Add Didit'}
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
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex h-12 items-center gap-2 px-2 text-xs font-black uppercase tracking-widest transition ${
                activeTab === tab.key ? 'text-navy' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{tab.count}</span>
              {activeTab === tab.key && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-primary" />}
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
        {activeTab === 'payments' && <PaymentTab loading={loading} providers={providers} />}
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
            <DetailRow label="Username" value={provider.username || '—'} />
            <DetailRow label="Sender ID" value={provider.sender_id || '—'} />
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

function PaymentTab({ loading, providers }: { loading: boolean; providers: Provider[] }) {
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
        icon={<CreditCard size={24} />}
        title="No payment providers configured"
        description="Bank and mobile money providers will appear here after they are created from the provider workflow."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {providers.map((provider) => (
        <div key={provider.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-50 text-navy">
                <Globe size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-navy">{provider.name}</h3>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {provider.country} / {provider.environment}
                </p>
              </div>
            </div>
            <StatusBadge status={provider.status} />
          </div>
          <InfoRow label="Provider code" value={provider.provider_code} />
          <InfoRow label="Base URL" value={provider.base_url || 'Not set'} />
          <InfoRow label="Last test" value={provider.last_test_status || 'Not tested'} />
        </div>
      ))}
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
