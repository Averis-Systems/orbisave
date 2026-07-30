'use client'

import { useState, useEffect, useRef } from 'react'
import { Cpu, ImageIcon, Loader2, Upload } from 'lucide-react'
import { PageHeader, SectionCard } from '@orbisave/admin-ui'
import { api } from '@/lib/api'
import { toast } from 'sonner'

type LogoField = 'member_logo' | 'console_logo' | 'manager_logo'
type BrandingField = LogoField | 'favicon'

type BrandingUrls = {
  member_logo_url: string | null
  console_logo_url: string | null
  manager_logo_url: string | null
  favicon_url: string | null
}

const EMPTY_BRANDING: BrandingUrls = {
  member_logo_url: null,
  console_logo_url: null,
  manager_logo_url: null,
  favicon_url: null,
}

const LOGO_SLOTS: { field: LogoField; label: string; hint: string }[] = [
  {
    field: 'member_logo',
    label: 'Member app',
    hint: 'Member dashboard, its sign-in/sign-up screens, and the public pages (landing, onboarding).',
  },
  {
    field: 'console_logo',
    label: 'Console',
    hint: 'This Console shell and its sign-in screen.',
  },
  {
    field: 'manager_logo',
    label: 'Manager',
    hint: 'The country Manager portal and its sign-in screen.',
  },
]

function LogoSlot({
  label,
  hint,
  url,
  uploading,
  onPick,
}: {
  label: string
  hint: string
  url: string | null
  uploading: boolean
  onPick: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="flex min-w-0 flex-col">
      <p className="text-sm font-medium text-navy">{label}</p>
      <p className="mt-0.5 text-xs leading-5 text-slate-500">{hint}</p>
      <div className="mt-3 flex h-24 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`${label} logo`} className="max-h-14 max-w-[80%] object-contain" />
        ) : (
          <span className="text-center text-xs text-slate-400">Using the built-in mark</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-navy transition-colors hover:bg-slate-50 disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {url ? 'Replace' : 'Upload'}
      </button>
    </div>
  )
}

function BrandingCard() {
  const [urls, setUrls] = useState<BrandingUrls>(EMPTY_BRANDING)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<BrandingField | null>(null)
  const faviconRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api
      .get('/platform-branding/')
      .then(({ data }) => setUrls(data))
      .catch(() => toast.error('Could not load current branding.'))
      .finally(() => setLoading(false))
  }, [])

  const handleUpload = async (field: BrandingField, file: File) => {
    setUploading(field)
    try {
      const formData = new FormData()
      formData.append(field, file)
      const { data } = await api.patch('/admin-portal/platform-branding/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUrls(data)
      const label =
        field === 'favicon' ? 'Favicon' : LOGO_SLOTS.find((s) => s.field === field)?.label
      toast.success(`${label} updated — live on next load.`)
    } catch (err) {
      const detail = (err as { response?: { data?: { error?: string } } })?.response?.data
      toast.error(detail?.error || 'Upload failed. Please try again.')
    } finally {
      setUploading(null)
    }
  }

  if (loading) {
    return (
      <SectionCard title="Platform branding">
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title="Platform branding"
      description="Each dashboard carries its own logo, shown in that app's shell and on its sign-in screen. Leave a slot empty to keep that app's built-in mark. Changes go live the next time an app loads — no redeploy."
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {LOGO_SLOTS.map((slot) => (
          <LogoSlot
            key={slot.field}
            label={slot.label}
            hint={slot.hint}
            url={urls[`${slot.field}_url` as keyof BrandingUrls]}
            uploading={uploading === slot.field}
            onPick={(file) => handleUpload(slot.field, file)}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
          {urls.favicon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urls.favicon_url} alt="Favicon" className="h-8 w-8 object-contain" />
          ) : (
            <ImageIcon className="h-5 w-5 text-slate-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-navy">Favicon (global)</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            One browser-tab icon shared by every surface — member, Console, Manager, and the public pages.
          </p>
        </div>
        <input
          ref={faviconRef}
          type="file"
          accept="image/png,image/x-icon,image/svg+xml,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleUpload('favicon', e.target.files[0])}
        />
        <button
          onClick={() => faviconRef.current?.click()}
          disabled={uploading === 'favicon'}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-navy transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          {uploading === 'favicon' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {urls.favicon_url ? 'Replace' : 'Upload'}
        </button>
      </div>
    </SectionCard>
  )
}

interface Config {
  id: string
  key: string
  value: string
  category: string
  description: string
  is_public: boolean
  updated_at: string
}

function ConfigCard() {
  const [configs, setConfigs] = useState<Config[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    api
      .get('/admin-portal/superadmin/settings/?category=platform')
      .then(({ data }) => setConfigs(data))
      .catch(() => toast.error('Configuration service unavailable.'))
      .finally(() => setLoading(false))
  }, [])

  const handleUpdate = async (id: string, value: string) => {
    setSaving(id)
    try {
      await api.patch(`/admin-portal/superadmin/settings/${id}/`, { value })
      toast.success('Parameter updated.')
    } catch {
      toast.error('Update failed. Please try again.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <SectionCard
      title="Feature flags & parameters"
      description="Global operational parameters. Changes apply platform-wide."
    >
      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : configs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <Cpu className="h-8 w-8 text-slate-200" />
          <p className="text-sm text-slate-400">No platform parameters configured yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {configs.map((config) => (
            <li
              key={config.id}
              className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium capitalize text-navy">{config.key.replace(/_/g, ' ')}</h4>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      config.is_public ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {config.is_public ? 'Public' : 'Internal'}
                  </span>
                </div>
                {config.description && <p className="mt-1 text-sm text-slate-500">{config.description}</p>}
              </div>
              <div className="relative w-full md:w-64">
                <input
                  type="text"
                  defaultValue={config.value}
                  onBlur={(e) => {
                    if (e.target.value !== config.value) handleUpdate(config.id, e.target.value)
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
                {saving === config.id && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

export default function PlatformSettingsPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1100px] space-y-6 pb-10">
      <PageHeader
        title="Platform settings"
        description="Branding and global configuration for every OrbiSave surface."
      />
      <BrandingCard />
      <ConfigCard />
    </div>
  )
}
