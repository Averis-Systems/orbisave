'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { 
  Users, 
  Globe, 
  Mail, 
  Phone,
  Search,
  Filter,
  MoreVertical,
  UserPlus,
  ShieldCheck,
  MapPin,
  Loader2
} from 'lucide-react'

interface AdminUser {
  id: string
  email: string
  full_name: string
  phone: string
  country: string
  created_at: string
  last_login?: string
}

export default function RegionalAdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCountry, setFilterCountry] = useState('')

  const fetchAdmins = async () => {
    setLoading(true)
    try {
      const url = filterCountry 
        ? `/admin-portal/platform-admins/?country=${filterCountry}` 
        : '/admin-portal/platform-admins/'
      const { data } = await api.get(url)
      setAdmins(data.results)
    } catch (err) {
      console.error('Failed to fetch admins', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [filterCountry])

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-navy tracking-tight">Regional Admins</h1>
          <p className="text-slate/60 text-sm mt-1">Manage country-level platform administrators and access permissions.</p>
        </div>

        <button className="bg-primary text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-[#009200] transition-all shadow-lg shadow-primary/20 active:scale-95">
          <UserPlus className="w-4 h-4" />
          Provision Admin
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate/40" />
              <input 
                type="text" 
                placeholder="Search administrators..." 
                className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <select 
              value={filterCountry} 
              onChange={(e) => setFilterCountry(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl py-2 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none pr-8 relative"
            >
              <option value="">All Regions</option>
              <option value="kenya">Kenya</option>
              <option value="rwanda">Rwanda</option>
              <option value="ghana">Ghana</option>
            </select>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate/40 uppercase tracking-widest">Active nodes: {admins.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-8 py-5 text-[10px] font-black text-slate/40 uppercase tracking-[0.2em]">Administrator</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate/40 uppercase tracking-[0.2em]">Jurisdiction</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate/40 uppercase tracking-[0.2em]">Security Info</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate/40 uppercase tracking-[0.2em]">Session Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate/40 uppercase tracking-[0.2em] text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
                    </div>
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate/40">No regional administrators found.</td>
                </tr>
              ) : admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-navy text-white rounded-2xl flex items-center justify-center font-black shadow-lg">
                        {admin.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-base font-black text-navy leading-none mb-1">{admin.full_name}</p>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 text-slate/30" />
                          <span className="text-xs text-slate/40">{admin.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 text-primary rounded-full w-fit">
                      <Globe className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{admin.country}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate/60">
                        <Phone className="w-3 h-3" />
                        <span className="text-xs">{admin.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate/30">
                        <ShieldCheck className="w-3 h-3" />
                        <span className="text-[10px]">Verified Device</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-navy">Created: {new Date(admin.created_at).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate/40 italic">Last Active: {admin.last_login ? new Date(admin.last_login).toLocaleString() : 'Never'}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-3 hover:bg-gray-200 rounded-2xl transition-all text-slate/40 hover:text-navy active:scale-90">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
