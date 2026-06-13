'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { 
  UserCheck, 
  Search, 
  Filter, 
  MoreHorizontal, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Clock,
  ArrowLeft,
  X,
  FileText,
  AlertCircle,
  Loader2,
  ShieldCheck
} from 'lucide-react'

interface KYCDocument {
  id: string
  user: {
    full_name: string
    email: string
    country: string
  }
  document_type: string
  front_image: string
  back_image: string
  selfie_image: string
  status: string
  created_at: string
}

export default function KYCReviewsPage() {
  const [submissions, setSubmissions] = useState<KYCDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState<KYCDocument | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchSubmissions = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin-portal/kyc/queue/')
      setSubmissions(data.results || [])
    } catch (err) {
      console.error('Failed to fetch KYC submissions', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) {
      alert('Please provide a reason for rejection.')
      return
    }

    setActionLoading(true)
    try {
      await api.post(`/admin-portal/kyc/${id}/review/`, {
        action,
        rejection_reason: rejectionReason
      })
      setSelectedDoc(null)
      setRejectionReason('')
      fetchSubmissions()
    } catch (err) {
      console.error('KYC action failed', err)
      alert('Action failed. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-navy tracking-tight">Identity Verification</h1>
          <p className="text-slate-400 text-lg mt-2 font-medium">Review and authorize member KYC submissions.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search members..." 
              className="bg-white border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all w-64"
            />
          </div>
        </div>
      </div>

      {/* Submissions Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="font-bold text-sm uppercase tracking-widest">Hydrating Queue...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="py-24 text-center bg-white border border-dashed border-slate-200 rounded-lg">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-slate-200" />
          </div>
          <h3 className="text-xl font-bold text-navy tracking-tight">All Caught Up</h3>
          <p className="text-slate-400 text-sm font-medium mt-1">There are no pending KYC reviews in your jurisdiction.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {submissions.map((doc) => (
            <div 
              key={doc.id} 
              className="bg-white rounded-lg border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all group flex flex-col overflow-hidden"
            >
              <div className="p-6 flex-1">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {doc.user.full_name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-navy truncate max-w-[140px]">{doc.user.full_name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{doc.document_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="bg-amber-50 text-amber-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                    Pending
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-400">Submitted</span>
                    <span className="text-navy">{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-400">Email</span>
                    <span className="text-navy truncate max-w-[120px]">{doc.user.email}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button 
                  onClick={() => setSelectedDoc(doc)}
                  className="flex-1 bg-white border border-slate-200 py-2 rounded-lg text-xs font-bold text-navy hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Review Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-navy/20 animate-in fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-lg shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95">
            <button 
              onClick={() => setSelectedDoc(null)}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-navy z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-navy tracking-tight">Review Identity Document</h2>
              <p className="text-sm text-slate-400 font-medium mt-1">
                Submitted by <span className="text-navy font-bold">{selectedDoc.user.full_name}</span> &bull; {selectedDoc.user.email}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Document Images */}
              <div className="space-y-8">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Front of Document</h4>
                  <div className="aspect-[1.6/1] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative group">
                    {selectedDoc.front_image ? (
                      <img src={selectedDoc.front_image} alt="Document Front" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                        <AlertCircle className="w-8 h-8 mb-2" />
                        <span className="text-xs font-bold uppercase">Image Missing</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedDoc.back_image && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Back of Document</h4>
                    <div className="aspect-[1.6/1] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative group">
                      <img src={selectedDoc.back_image} alt="Document Back" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    </div>
                  </div>
                )}

                {selectedDoc.selfie_image && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Identity Selfie</h4>
                    <div className="aspect-square w-32 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative group mx-auto md:mx-0">
                      <img src={selectedDoc.selfie_image} alt="Selfie" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Area */}
              <div className="space-y-8 h-full flex flex-col">
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Verification Guidelines</h4>
                  <ul className="space-y-3">
                    {[
                      'Full name matches the document exactly.',
                      'Document is valid and not expired.',
                      'Photos are clear and not blurry.',
                      'Selfie matches the document photo.'
                    ].map((text, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs font-medium text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5" />
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Rejection Reason (Required if rejecting)</label>
                  <textarea 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Document is blurry, name mismatch..."
                    className="w-full h-32 bg-white border border-slate-200 rounded-lg p-4 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => handleAction(selectedDoc.id, 'reject')}
                    disabled={actionLoading}
                    className="bg-white border border-red-200 text-red-600 py-4 rounded-lg font-bold text-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Reject Submission
                  </button>
                  <button 
                    onClick={() => handleAction(selectedDoc.id, 'approve')}
                    disabled={actionLoading}
                    className="bg-primary text-white py-4 rounded-lg font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Approve Member
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
