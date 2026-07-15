'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Settings,
  Shield,
  Cpu,
  Save,
  Loader2,
  CheckCircle2,
  Info,
  Activity,
  History,
  ImageIcon,
  Upload
} from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

function BrandingCard() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<'logo' | 'favicon' | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get('/platform-branding/')
      .then(({ data }) => {
        setLogoUrl(data.logo_url)
        setFaviconUrl(data.favicon_url)
      })
      .catch(() => toast.error('Could not load current branding.'))
      .finally(() => setLoading(false))
  }, [])

  const handleUpload = async (field: 'logo' | 'favicon', file: File) => {
    setUploading(field)
    try {
      const formData = new FormData()
      formData.append(field, file)
      const { data } = await api.patch('/admin-portal/platform-branding/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setLogoUrl(data.logo_url)
      setFaviconUrl(data.favicon_url)
      toast.success(`Platform ${field} updated — live across all three apps.`)
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Failed to update ${field}.`)
    } finally {
      setUploading(null)
    }
  }

  return (
    <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center gap-2">
        <ImageIcon size={16} className="text-primary" />
        <h3 className="font-black text-navy uppercase tracking-widest text-[10px]">Platform Branding</h3>
      </div>
      <p className="text-sm font-bold text-navy/80 -mt-4">
        Applies immediately across the member app, Console, and Manager. Leave a slot empty to keep the built-in default.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Logo */}
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Logo</p>
          <div className="h-20 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-md">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
            ) : logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Current logo" className="h-12 w-auto max-w-[80%] object-contain" />
            ) : (
              <span className="text-[10px] font-bold text-slate-400">Using built-in "O" mark</span>
            )}
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload('logo', e.target.files[0])}
          />
          <button
            onClick={() => logoInputRef.current?.click()}
            disabled={uploading === 'logo'}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-[10px] font-black uppercase tracking-widest text-navy transition-all disabled:opacity-50"
          >
            {uploading === 'logo' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload Logo
          </button>
        </div>

        {/* Favicon */}
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Favicon</p>
          <div className="h-20 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-md">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
            ) : faviconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={faviconUrl} alt="Current favicon" className="h-8 w-8 object-contain" />
            ) : (
              <span className="text-[10px] font-bold text-slate-400">Using built-in favicon</span>
            )}
          </div>
          <input
            ref={faviconInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload('favicon', e.target.files[0])}
          />
          <button
            onClick={() => faviconInputRef.current?.click()}
            disabled={uploading === 'favicon'}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-[10px] font-black uppercase tracking-widest text-navy transition-all disabled:opacity-50"
          >
            {uploading === 'favicon' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload Favicon
          </button>
        </div>
      </div>
    </div>
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

export default function PlatformSettingsPage() {
  const [configs, setConfigs] = useState<Config[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      const { data } = await api.get('/admin-portal/superadmin/settings/?category=platform')
      setConfigs(data)
    } catch (err) {
      toast.error('System Error: Configuration service unavailable.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (id: string, value: string) => {
    setSaving(id)
    try {
      await api.patch(`/admin-portal/superadmin/settings/${id}/`, { value })
      toast.success('System: Parameter updated successfully.')
    } catch (err) {
      toast.error('Configuration update failed.')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin text-[#00ab00]" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-8">
        <h1 className="text-3xl font-black text-navy tracking-tight">Platform Core Settings</h1>
        <p className="text-sm font-bold text-slate-500 mt-1">Manage global feature flags, operational modes, and platform behavior.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Settings Body */}
        <div className="lg:col-span-8 space-y-6">
          <BrandingCard />

          {configs.length === 0 ? (
            <div className="bg-white rounded-lg p-20 border border-slate-100 text-center space-y-4">
              <Cpu className="w-12 h-12 text-slate-200 mx-auto" />
              <p className="text-slate-400 font-bold">No active platform parameters discovered.</p>
            </div>
          ) : (
            configs.map((config) => (
              <div key={config.id} className="bg-white rounded-lg p-6 border border-slate-200 hover:border-slate-300 transition-all shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-navy uppercase tracking-widest text-[10px]">{config.key.replace(/_/g, ' ')}</h3>
                      {config.is_public ? (
                        <span className="px-2 py-0.5 bg-green-50 text-[#00ab00] text-[8px] font-black uppercase rounded border border-green-100">Global Read</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[8px] font-black uppercase rounded border border-slate-100">Internal Only</span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-navy/80">{config.description}</p>
                  </div>

                  <div className="w-full md:w-64 relative">
                    <input
                      type="text"
                      defaultValue={config.value}
                      onBlur={(e) => {
                        if (e.target.value !== config.value) {
                          handleUpdate(config.id, e.target.value)
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {saving === config.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Sidebar: Context & Metadata */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
            <h4 className="font-black text-navy uppercase tracking-widest text-xs flex items-center gap-2">
              <Info size={16} className="text-primary" /> System Context
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Activity size={16} className="text-slate-400 mt-1" />
                <div>
                  <p className="text-xs font-black text-navy">Propagation Delay</p>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">Changes apply globally within ~1.2s across all regional databases.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <History size={16} className="text-slate-400 mt-1" />
                <div>
                  <p className="text-xs font-black text-navy">Version Control</p>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">Platform is currently running on engine v4.2.8-stable.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
               <div className="bg-[#f8fafc] rounded-md p-4 flex items-center gap-3">
                  <Shield size={20} className="text-[#00ab00]" />
                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                    Root access authorized. You are currently editing core runtime parameters.
                  </p>
               </div>
            </div>
          </div>

          <div className="bg-navy rounded-lg p-6 text-white relative overflow-hidden">
             <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
             <div className="relative z-10 space-y-4">
                <h4 className="font-black text-sm uppercase tracking-[0.2em] text-white/40">Infrastructure</h4>
                <p className="text-xs font-medium leading-relaxed">
                  These settings manage the high-level logic gates of the OrbiSave network. Modification here directly affects financial calculation engines.
                </p>
                <button className="w-full py-3 bg-white/10 hover:bg-white/20 transition-all rounded-md text-[10px] font-black uppercase tracking-widest">
                  View System Logs
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
