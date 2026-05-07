"use client"

import { useState, useRef } from "react"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import { 
  X, Camera, Upload, CheckCircle, AlertCircle, 
  ChevronRight, FileText, User, ShieldCheck,
  Loader2
} from "lucide-react"

interface KYCModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 'intro' | 'select-type' | 'front-id' | 'back-id' | 'selfie' | 'review' | 'success'

const B = {
  navy: "#0a2540",
  green: "#00ab00",
  offWhite: "#f7f9f8",
}

export function KYCModal({ isOpen, onClose }: KYCModalProps) {
  const { user, updateKycStatus } = useAuthStore()
  const [step, setStep] = useState<Step>('intro')
  const [docType, setDocType] = useState<string>('national_id')
  const [frontImage, setFrontImage] = useState<File | null>(null)
  const [backImage, setBackImage] = useState<File | null>(null)
  const [selfieImage, setSelfieImage] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'selfie') => {
    const file = e.target.files?.[0]
    if (file) {
      if (type === 'front') setFrontImage(file)
      if (type === 'back') setBackImage(file)
      if (type === 'selfie') setSelfieImage(file)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.append('document_type', docType)
    if (frontImage) formData.append('front_image', frontImage)
    if (backImage) formData.append('back_image', backImage)
    if (selfieImage) formData.append('selfie_image', selfieImage)

    try {
      await api.post('/auth/kyc/submit/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      updateKycStatus('submitted')
      setStep('success')
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to submit KYC. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 'intro':
        return (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={40} className="text-[#00ab00]" />
            </div>
            <h2 className="text-2xl font-black text-[#0a2540] mb-3">Identity Verification</h2>
            <p className="text-[#4a5c6a] text-sm leading-relaxed mb-8 max-w-sm mx-auto">
              To ensure the security of our collective and comply with financial regulations, we need to verify your identity. This only takes 2 minutes.
            </p>
            <div className="space-y-4 mb-8">
              {[
                { icon: FileText, text: "Valid Government ID" },
                { icon: Camera, text: "Clear Selfie" },
                { icon: ShieldCheck, text: "Encrypted & Secure" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 justify-center text-sm font-semibold text-[#0a2540]">
                  <item.icon size={16} className="text-[#00ab00]" />
                  {item.text}
                </div>
              ))}
            </div>
            <button 
              onClick={() => setStep('select-type')}
              className="w-full bg-[#00ab00] text-white h-12 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#008a00] transition-colors"
            >
              Get Started <ChevronRight size={18} />
            </button>
          </div>
        )

      case 'select-type':
        return (
          <div>
            <h3 className="text-lg font-bold text-[#0a2540] mb-6">Select Document Type</h3>
            <div className="space-y-3">
              {[
                { id: 'national_id', label: 'National ID Card' },
                { id: 'passport', label: 'International Passport' },
                { id: 'drivers_license', label: "Driver's License" }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => { setDocType(type.id); setStep('front-id') }}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between group ${
                    docType === type.id ? 'border-[#00ab00] bg-green-50' : 'border-gray-100 hover:border-[#00ab00]/30'
                  }`}
                >
                  <span className="font-bold text-[#0a2540]">{type.label}</span>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-[#00ab00]" />
                </button>
              ))}
            </div>
          </div>
        )

      case 'front-id':
        return (
          <div>
            <h3 className="text-lg font-bold text-[#0a2540] mb-2">Upload Front of ID</h3>
            <p className="text-xs text-[#4a5c6a] mb-6">Ensure all details are clearly visible and no glare.</p>
            
            <div className="relative group">
              <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={(e) => handleFileUpload(e, 'front')}
              />
              <div className={`aspect-[3/2] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${
                frontImage ? 'border-[#00ab00] bg-green-50' : 'border-gray-200 group-hover:border-[#00ab00]/50'
              }`}>
                {frontImage ? (
                  <>
                    <CheckCircle size={32} className="text-[#00ab00]" />
                    <span className="text-sm font-bold text-[#0a2540]">{frontImage.name}</span>
                    <button className="text-xs text-[#00ab00] font-bold">Replace Image</button>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                      <Upload size={20} className="text-gray-400" />
                    </div>
                    <span className="text-sm font-bold text-gray-400">Click or drag to upload</span>
                  </>
                )}
              </div>
            </div>

            <button 
              disabled={!frontImage}
              onClick={() => setStep(docType === 'national_id' ? 'back-id' : 'selfie')}
              className="w-full mt-8 bg-[#00ab00] text-white h-12 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#008a00] transition-colors"
            >
              Continue
            </button>
          </div>
        )

      case 'back-id':
        return (
          <div>
            <h3 className="text-lg font-bold text-[#0a2540] mb-2">Upload Back of ID</h3>
            <p className="text-xs text-[#4a5c6a] mb-6">Capture the reverse side of your identification card.</p>
            
            <div className="relative group">
              <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={(e) => handleFileUpload(e, 'back')}
              />
              <div className={`aspect-[3/2] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${
                backImage ? 'border-[#00ab00] bg-green-50' : 'border-gray-200 group-hover:border-[#00ab00]/50'
              }`}>
                {backImage ? (
                  <>
                    <CheckCircle size={32} className="text-[#00ab00]" />
                    <span className="text-sm font-bold text-[#0a2540]">{backImage.name}</span>
                    <button className="text-xs text-[#00ab00] font-bold">Replace Image</button>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                      <Upload size={20} className="text-gray-400" />
                    </div>
                    <span className="text-sm font-bold text-gray-400">Click or drag to upload</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setStep('front-id')}
                className="flex-1 h-12 rounded-lg font-bold text-[#4a5c6a] hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button 
                disabled={!backImage}
                onClick={() => setStep('selfie')}
                className="flex-1 bg-[#00ab00] text-white h-12 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#008a00] transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )

      case 'selfie':
        return (
          <div>
            <h3 className="text-lg font-bold text-[#0a2540] mb-2">Take a Selfie</h3>
            <p className="text-xs text-[#4a5c6a] mb-6">Look straight at the camera and ensure good lighting.</p>
            
            <div className="relative group">
              <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={(e) => handleFileUpload(e, 'selfie')}
              />
              <div className={`aspect-square max-w-[280px] mx-auto rounded-full border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all overflow-hidden ${
                selfieImage ? 'border-[#00ab00] bg-green-50' : 'border-gray-200 group-hover:border-[#00ab00]/50'
              }`}>
                {selfieImage ? (
                  <div className="relative w-full h-full">
                    <img src={URL.createObjectURL(selfieImage)} alt="Selfie" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={32} className="text-white" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                      <Camera size={28} className="text-gray-400" />
                    </div>
                    <span className="text-sm font-bold text-gray-400 text-center px-6">Tap to open camera or upload</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setStep(docType === 'national_id' ? 'back-id' : 'front-id')}
                className="flex-1 h-12 rounded-lg font-bold text-[#4a5c6a] hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button 
                disabled={!selfieImage}
                onClick={() => setStep('review')}
                className="flex-1 bg-[#00ab00] text-white h-12 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#008a00] transition-colors"
              >
                Review
              </button>
            </div>
          </div>
        )

      case 'review':
        return (
          <div>
            <h3 className="text-lg font-bold text-[#0a2540] mb-6">Review Submission</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#f7f9f8]">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-[#00ab00]" />
                  <span className="text-sm font-bold text-[#0a2540]">Document Type</span>
                </div>
                <span className="text-sm text-[#4a5c6a] capitalize">{docType.replace('_', ' ')}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Front Side</span>
                  <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
                    {frontImage && <img src={URL.createObjectURL(frontImage)} className="w-full h-full object-cover" />}
                  </div>
                </div>
                {backImage && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Back Side</span>
                    <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
                      <img src={URL.createObjectURL(backImage)} className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selfie Verification</span>
                <div className="aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden">
                  {selfieImage && <img src={URL.createObjectURL(selfieImage)} className="w-full h-full object-cover" />}
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-xs text-red-600 font-medium">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setStep('selfie')}
                disabled={isSubmitting}
                className="flex-1 h-12 rounded-lg font-bold text-[#4a5c6a] hover:bg-gray-50 transition-colors"
              >
                Edit
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-[#00ab00] text-white h-12 rounded-lg font-bold hover:bg-[#008a00] transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Submitting...
                  </>
                ) : (
                  "Final Submit"
                )}
              </button>
            </div>
          </div>
        )

      case 'success':
        return (
          <div className="text-center py-10">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-[#00ab00]" />
            </div>
            <h2 className="text-2xl font-black text-[#0a2540] mb-3">Submission Received!</h2>
            <p className="text-[#4a5c6a] text-sm leading-relaxed mb-10 max-w-sm mx-auto">
              Your documents have been submitted for manual review. Our team will verify them within 24 hours. You'll receive a notification once approved.
            </p>
            <button 
              onClick={onClose}
              className="w-full bg-[#0a2540] text-white h-12 rounded-lg font-bold hover:bg-[#0f3460] transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-[#0a2540]/80 backdrop-blur-sm"
        onClick={isSubmitting ? undefined : onClose}
      />
      
      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00ab00]" />
            <span className="text-[10px] font-black text-[#0a2540] tracking-widest uppercase">Safe & Secure Verification</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {renderStep()}
        </div>

        {/* Progress bar */}
        {step !== 'success' && (
          <div className="h-1 bg-gray-50">
            <div 
              className="h-full bg-[#00ab00] transition-all duration-500"
              style={{ 
                width: step === 'intro' ? '0%' : 
                       step === 'select-type' ? '20%' :
                       step === 'front-id' ? '40%' :
                       step === 'back-id' ? '60%' :
                       step === 'selfie' ? '80%' : '100%'
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
