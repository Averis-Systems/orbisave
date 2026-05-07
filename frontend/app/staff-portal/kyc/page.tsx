"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { 
  ShieldCheck, AlertCircle, Check, X, 
  ExternalLink, Calendar, User, Phone,
  Search, Filter, ChevronLeft, Loader2,
  Maximize2
} from "lucide-react"

interface KYCDoc {
  id: string
  user_id: string
  user_name: string
  user_email: string
  user_phone: string
  user_country: string
  document_type: string
  front_image_url: string
  back_image_url: string
  selfie_image_url: string
  status: string
  created_at: string
}

export default function KYCQueuePage() {
  const [queue, setQueue] = useState<KYCDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedKyc, setSelectedKyc] = useState<KYCDoc | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [showRejectInput, setShowRejectInput] = useState(false)

  const fetchQueue = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin-portal/kyc/queue/?status=submitted')
      setQueue(res.data.results)
    } catch (err) {
      console.error("Failed to fetch KYC queue", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()
  }, [])

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!selectedKyc) return
    if (action === 'reject' && !rejectionReason.trim()) {
      setShowRejectInput(true)
      return
    }

    setReviewLoading(true)
    try {
      await api.post(`/admin-portal/kyc/${selectedKyc.id}/review/`, {
        action,
        rejection_reason: rejectionReason
      })
      // Success - remove from queue and close review
      setQueue(queue.filter(k => k.id !== selectedKyc.id))
      setSelectedKyc(null)
      setShowRejectInput(false)
      setRejectionReason("")
    } catch (err) {
      console.error("Review action failed", err)
      alert("Failed to process review. Please try again.")
    } finally {
      setReviewLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="animate-spin text-[#00ab00]" size={32} />
    </div>
  )

  if (selectedKyc) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedKyc(null)}
          className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-[#0a2540] transition-colors"
        >
          <ChevronLeft size={16} /> Back to Queue
        </button>

        <div className="grid grid-cols-12 gap-8">
          {/* Document Viewer */}
          <div className="col-span-8 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
               <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                 <h3 className="font-black text-[#0a2540]">ID Document Proof</h3>
                 <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-widest">
                   {selectedKyc.document_type.replace('_', ' ')}
                 </span>
               </div>
               <div className="p-6 space-y-8">
                 <div className="space-y-4">
                   <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Front Side Image</p>
                   <div className="relative aspect-[16/10] bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                     <img 
                       src={selectedKyc.front_image_url} 
                       alt="Front ID" 
                       className="w-full h-full object-contain"
                     />
                     <button className="absolute bottom-4 right-4 bg-white/90 p-2 rounded-lg text-[#0a2540] shadow-sm hover:bg-white transition-all">
                       <Maximize2 size={18} />
                     </button>
                   </div>
                 </div>

                 {selectedKyc.back_image_url && (
                    <div className="space-y-4">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Back Side Image</p>
                      <div className="relative aspect-[16/10] bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                        <img 
                          src={selectedKyc.back_image_url} 
                          alt="Back ID" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                 )}
               </div>
            </div>
          </div>

          {/* User Info & Selfie */}
          <div className="col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6">
              <h3 className="font-black text-[#0a2540] mb-6">User Verification</h3>
              
              <div className="aspect-square rounded-2xl bg-gray-50 overflow-hidden mb-6 border border-gray-100">
                 <img 
                   src={selectedKyc.selfie_image_url} 
                   alt="User Selfie" 
                   className="w-full h-full object-cover"
                 />
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User size={16} className="text-gray-300 mt-1" />
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Full Name</p>
                    <p className="text-sm font-black text-[#0a2540]">{selectedKyc.user_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone size={16} className="text-gray-300 mt-1" />
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Phone Number</p>
                    <p className="text-sm font-black text-[#0a2540]">{selectedKyc.user_phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar size={16} className="text-gray-300 mt-1" />
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Submitted On</p>
                    <p className="text-sm font-black text-[#0a2540]">
                      {new Date(selectedKyc.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-50 my-6" />

              {showRejectInput ? (
                <div className="space-y-4">
                  <textarea 
                    placeholder="Reason for rejection..."
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-red-500 transition-all outline-none"
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleReview('reject')}
                      disabled={reviewLoading}
                      className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all"
                    >
                      Confirm Reject
                    </button>
                    <button 
                      onClick={() => setShowRejectInput(false)}
                      className="px-4 py-3 bg-gray-100 rounded-xl font-bold text-sm text-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleReview('approve')}
                    disabled={reviewLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#00ab00] text-white rounded-xl font-black text-sm hover:bg-[#008a00] transition-all shadow-sm"
                  >
                    {reviewLoading ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Approve</>}
                  </button>
                  <button 
                    onClick={() => setShowRejectInput(true)}
                    disabled={reviewLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border border-gray-200 text-red-600 rounded-xl font-black text-sm hover:bg-red-50 transition-all"
                  >
                    <X size={18} /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-[#0a2540]">KYC Review Queue</h2>
        <div className="flex gap-4">
           <div className="relative">
             <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Filter by name..." className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
           </div>
           <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-400">
             <Filter size={16} /> Filters
           </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User Details</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Doc Type</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Submitted</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Country</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {queue.map((kyc) => (
              <tr key={kyc.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs uppercase">
                      {kyc.user_name.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#0a2540]">{kyc.user_name}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{kyc.user_email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-100 px-2.5 py-1 rounded-md">
                     {kyc.document_type.replace('_', ' ')}
                   </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-bold text-gray-500">
                    {new Date(kyc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-[10px] text-gray-300 font-bold">
                    {new Date(kyc.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </td>
                <td className="px-6 py-4">
                   <span className="text-[10px] font-black text-gray-500 uppercase">{kyc.user_country}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => setSelectedKyc(kyc)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a2540] text-white rounded-lg text-xs font-bold hover:bg-[#0f3460] transition-all opacity-0 group-hover:opacity-100"
                  >
                    Start Review <ChevronLeft className="rotate-180" size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {queue.length === 0 && (
          <div className="py-20 text-center">
             <ShieldCheck size={48} className="mx-auto text-gray-100 mb-4" />
             <p className="text-sm font-bold text-gray-300">All submissions have been reviewed.</p>
          </div>
        )}
      </div>
    </div>
  )
}
