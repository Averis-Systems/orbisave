'use client'

import { useState, useEffect, useRef } from 'react'
import { ImageIcon, Loader2, Upload } from 'lucide-react'
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

const LOGO_SLOTS: { field: LogoField; label: string }[] = [
  { field: 'member_logo', label: 'Member app' },
  { field: 'console_logo', label: 'Console' },
  { field: 'manager_logo', label: 'Manager' },
]

function LogoSlot({
  label,
  url,
  uploading,
  onPick,
}: {
  label: string
  url: string | null
  uploading: boolean
  onPick: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="flex min-w-0 flex-col">
      <p className="text-sm font-medium text-navy">{label}</p>
      <div className="mt-2 flex h-24 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`${label} logo`} className="max-h-14 max-w-[80%] object-contain" />
        ) : (
          <span className="text-center text-xs text-slate-400">Built-in mark</span>
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
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-navy transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Upload className="h-4 w-4 text-primary" />}
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
      const label = field === 'favicon' ? 'Favicon' : LOGO_SLOTS.find((s) => s.field === field)?.label
      toast.success(`${label} updated.`)
    } catch (err) {
      const detail = (err as { response?: { data?: { error?: string } } })?.response?.data
      toast.error(detail?.error || 'Upload failed. Please try again.')
    } finally {
      setUploading(null)
    }
  }

  return (
    <SectionCard title="Branding" description="One logo per dashboard, plus a favicon shared everywhere. Empty keeps the built-in mark.">
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {LOGO_SLOTS.map((slot) => (
              <LogoSlot
                key={slot.field}
                label={slot.label}
                url={urls[`${slot.field}_url` as keyof BrandingUrls]}
                uploading={uploading === slot.field}
                onPick={(file) => handleUpload(slot.field, file)}
              />
            ))}
          </div>

          <div className="mt-6 flex items-center gap-4 border-t border-slate-100 pt-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
              {urls.favicon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls.favicon_url} alt="Favicon" className="h-8 w-8 object-contain" />
              ) : (
                <ImageIcon className="h-5 w-5 text-slate-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-navy">Favicon</p>
              <p className="text-xs text-slate-500">Shared across every surface.</p>
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
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-navy transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
            >
              {uploading === 'favicon' ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Upload className="h-4 w-4 text-primary" />}
              {urls.favicon_url ? 'Replace' : 'Upload'}
            </button>
          </div>
        </>
      )}
    </SectionCard>
  )
}

interface Config {
  id: string
  key: string
  value: string
}

const IDENTITY_FIELDS: { key: string; label: string; placeholder: string; type: string }[] = [
  { key: 'platform_name', label: 'Platform name', placeholder: 'OrbiSave', type: 'text' },
  { key: 'support_email', label: 'Support email', placeholder: 'support@orbisave.com', type: 'email' },
  { key: 'support_phone', label: 'Support phone', placeholder: '+254 700 000 000', type: 'tel' },
]

/**
 * Platform identity — name and support contacts, stored as SystemConfiguration
 * keys (category 'platform') via the real config API. Persisted on blur;
 * these feed member-facing surfaces (email footers, help links) as they get
 * wired to read them.
 */
function IdentityCard() {
  const [byKey, setByKey] = useState<Record<string, Config>>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  useEffect(() => {
    api
      .get('/admin-portal/superadmin/settings/?category=platform')
      .then(({ data }: { data: Config[] }) => {
        const map: Record<string, Config> = {}
        data.forEach((c) => (map[c.key] = c))
        setByKey(map)
      })
      .catch(() => toast.error('Could not load platform identity.'))
      .finally(() => setLoading(false))
  }, [])

  const save = async (key: string, value: string, label: string) => {
    const existing = byKey[key]
    if ((existing?.value ?? '') === value) return
    setSavingKey(key)
    try {
      if (existing) {
        const { data } = await api.patch(`/admin-portal/superadmin/settings/${existing.id}/`, { value })
        setByKey((m) => ({ ...m, [key]: data }))
      } else {
        const { data } = await api.post('/admin-portal/superadmin/settings/create/', {
          key,
          value,
          category: 'platform',
          description: label,
        })
        setByKey((m) => ({ ...m, [key]: data }))
      }
      toast.success(`${label} saved.`)
    } catch {
      toast.error(`Could not save ${label.toLowerCase()}.`)
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <SectionCard title="Platform identity" description="Name and support contacts used across member-facing surfaces.">
      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {IDENTITY_FIELDS.map((field) => (
            <label key={field.key} className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">{field.label}</span>
              <div className="relative">
                <input
                  type={field.type}
                  defaultValue={byKey[field.key]?.value ?? ''}
                  placeholder={field.placeholder}
                  onBlur={(e) => save(field.key, e.target.value.trim(), field.label)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
                {savingKey === field.key && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
                )}
              </div>
            </label>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

export default function PlatformSettingsPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1100px] space-y-6 pb-10">
      <PageHeader title="Platform settings" />
      <BrandingCard />
      <IdentityCard />
    </div>
  )
}
