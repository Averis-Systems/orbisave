'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { 
  ChevronLeft, 
  ShieldCheck, 
  Database, 
  Lock, 
  Globe, 
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

export default function NewProvider() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    provider_code: 'jenga_ke',
    country: 'kenya',
    environment: 'sandbox',
    api_key: '',
    api_secret: '',
    merchant_code: '',
    base_url: 'https://uat.finserve.africa',
    webhook_url: '',
    webhook_secret: '',
    extra_config: {
      currency: 'KES',
      country_code: 'KE',
      rsa_private_key_pem: ''
    },
    accounts: [
      {
        label: 'Collections',
        account_type: 'collection',
        account_number: '',
        account_name: 'OrbiSave Collections',
        country_code: 'KE',
        currency: 'KES',
        bank_code: '68',
        is_default_for_collections: true,
        is_default_for_disbursements: false,
        is_default_for_reconciliation: true,
      },
      {
        label: 'Payouts',
        account_type: 'payout',
        account_number: '',
        account_name: 'OrbiSave Payouts',
        country_code: 'KE',
        currency: 'KES',
        bank_code: '68',
        is_default_for_collections: false,
        is_default_for_disbursements: true,
        is_default_for_reconciliation: false,
      },
      {
        label: 'Settlement / Clearing',
        account_type: 'settlement',
        account_number: '',
        account_name: 'OrbiSave Settlement',
        country_code: 'KE',
        currency: 'KES',
        bank_code: '68',
        is_default_for_collections: false,
        is_default_for_disbursements: false,
        is_default_for_reconciliation: false,
      },
    ]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      await api.post('/admin-portal/superadmin/payment-providers/', formData)
      router.push('/dashboard/payments')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create provider. Check your input.')
    } finally {
      setLoading(false)
    }
  }

  const handleExtraChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      extra_config: {
        ...prev.extra_config,
        [key]: value
      }
    }))
  }

  const handleAccountChange = (index: number, key: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      accounts: prev.accounts.map((account, accountIndex) => (
        accountIndex === index ? { ...account, [key]: value } : account
      ))
    }))
  }

  return (
    <div className="max-w-[1000px] mx-auto pb-20">
      <Link 
        href="/dashboard/payments" 
        className="inline-flex items-center gap-2 text-slate-400 hover:text-navy font-bold text-sm mb-8 group transition-all"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Hub
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold text-navy tracking-tight">Onboard Banking Rail</h1>
          <p className="text-slate-500 text-lg mt-3 font-medium">Configure secure API credentials for a new jurisdictional payment gateway.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* General Config */}
          <div className="bg-white rounded-lg border border-slate-100 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
            <h3 className="text-xl font-bold text-navy mb-8 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              General Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Display Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Equity Bank Kenya (Jenga)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Provider Engine</label>
                <select 
                  value={formData.provider_code}
                  onChange={e => setFormData({...formData, provider_code: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="jenga_ke">Jenga HQ (Kenya)</option>
                  <option value="jenga_rw">Jenga HQ (Rwanda)</option>
                  <option value="ecobank_gh">Ecobank (Ghana)</option>
                  <option value="mtn_momo">MTN Direct</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Jurisdiction</label>
                <select 
                  value={formData.country}
                  onChange={e => setFormData({...formData, country: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="kenya">Kenya</option>
                  <option value="rwanda">Rwanda</option>
                  <option value="ghana">Ghana</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Environment</label>
                <select 
                  value={formData.environment}
                  onChange={e => setFormData({
                    ...formData,
                    environment: e.target.value,
                    base_url: e.target.value === 'live' ? 'https://api.finserve.africa' : 'https://uat.finserve.africa',
                  })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="sandbox">Sandbox (UAT)</option>
                  <option value="live">Production (Live)</option>
                </select>
              </div>
            </div>
          </div>

          {/* API Credentials */}
          <div className="bg-white rounded-lg border border-slate-100 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.01)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
            <h3 className="text-xl font-bold text-navy mb-8 flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              API Security Credentials
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Consumer Key (API Key)</label>
                <input 
                  required
                  type="text" 
                  value={formData.api_key}
                  onChange={e => setFormData({...formData, api_key: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-sans focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Consumer Secret</label>
                <input 
                  required
                  type="password" 
                  value={formData.api_secret}
                  onChange={e => setFormData({...formData, api_secret: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-sans focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Merchant Code</label>
                  <input 
                    required
                    type="text" 
                    value={formData.merchant_code}
                    onChange={e => setFormData({...formData, merchant_code: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-sans focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base API URL</label>
                  <input 
                    required
                    type="url" 
                    value={formData.base_url}
                    onChange={e => setFormData({...formData, base_url: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-sans focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Jenga Specifics */}
          {formData.provider_code.startsWith('jenga') && (
            <div className="bg-white rounded-lg border border-slate-100 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
              <h3 className="text-xl font-bold text-navy mb-8 flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Jenga HQ Extra Config
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Currency</label>
                    <input 
                      type="text" 
                      value={formData.extra_config.currency}
                      onChange={e => handleExtraChange('currency', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-navy outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Country Code</label>
                    <input 
                      type="text" 
                      value={formData.extra_config.country_code}
                      onChange={e => handleExtraChange('country_code', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-navy outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-navy">Equity / Jenga Accounts</h4>
                    <p className="text-xs text-slate-400 mt-1">Configure sandbox now; swap to live account numbers later without a deployment.</p>
                  </div>
                  <div className="space-y-4">
                    {formData.accounts.map((account, index) => (
                      <div key={account.account_type} className="border border-slate-100 rounded-lg p-5 bg-slate-50/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Label</label>
                            <input
                              type="text"
                              value={account.label}
                              onChange={e => handleAccountChange(index, 'label', e.target.value)}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account Type</label>
                            <select
                              value={account.account_type}
                              onChange={e => handleAccountChange(index, 'account_type', e.target.value)}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-navy outline-none"
                            >
                              <option value="collection">Collection</option>
                              <option value="payout">Payout</option>
                              <option value="trust">Trust / Custody</option>
                              <option value="settlement">Settlement / Clearing</option>
                              <option value="wallet">Jenga Wallet</option>
                              <option value="reconciliation">Reconciliation</option>
                              <option value="fee">Fee / Revenue</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account Number</label>
                            <input
                              required={index < 2}
                              type="text"
                              value={account.account_number}
                              onChange={e => handleAccountChange(index, 'account_number', e.target.value)}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-navy outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account Name</label>
                            <input
                              type="text"
                              value={account.account_name}
                              onChange={e => handleAccountChange(index, 'account_name', e.target.value)}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Country Code</label>
                            <input
                              type="text"
                              value={account.country_code}
                              onChange={e => handleAccountChange(index, 'country_code', e.target.value)}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-navy outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bank Code</label>
                            <input
                              type="text"
                              value={account.bank_code}
                              onChange={e => handleAccountChange(index, 'bank_code', e.target.value)}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-navy outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-4">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <input
                              type="checkbox"
                              checked={account.is_default_for_collections}
                              onChange={e => handleAccountChange(index, 'is_default_for_collections', e.target.checked)}
                            />
                            Collections default
                          </label>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <input
                              type="checkbox"
                              checked={account.is_default_for_disbursements}
                              onChange={e => handleAccountChange(index, 'is_default_for_disbursements', e.target.checked)}
                            />
                            Payout default
                          </label>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <input
                              type="checkbox"
                              checked={account.is_default_for_reconciliation}
                              onChange={e => handleAccountChange(index, 'is_default_for_reconciliation', e.target.checked)}
                            />
                            Reconciliation default
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">RSA Private Key (PEM)</label>
                  <textarea 
                    rows={6}
                    value={formData.extra_config.rsa_private_key_pem}
                    onChange={e => handleExtraChange('rsa_private_key_pem', e.target.value)}
                    placeholder="-----BEGIN PRIVATE KEY----- ..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-navy rounded-lg p-8 text-white shadow-2xl shadow-navy/20 h-fit">
            <h4 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary fill-current" />
              Deployment Summary
            </h4>
            <div className="space-y-6">
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Provider</span>
                <span className="text-sm font-bold uppercase tracking-tight">{formData.provider_code}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Scope</span>
                <span className="text-sm font-bold uppercase tracking-tight">{formData.country}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Status</span>
                <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded text-primary">INITIALIZING</span>
              </div>
              
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-xs text-red-200 font-medium leading-relaxed">{error}</p>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50"
              >
                {loading ? 'Initializing...' : 'Authorize & Save'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-100 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
            <h4 className="text-sm font-bold text-navy mb-4">Security Note</h4>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              All credentials are encrypted at rest using AES-256 GCM. Once saved, secrets will be masked in the UI. 
              Only Super Admins with specific KMS access can rotate these keys.
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}
