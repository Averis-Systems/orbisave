"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import {
  X, Camera, Upload, CheckCircle, AlertCircle,
  ChevronRight, FileText, ShieldCheck,
  Loader2
} from "lucide-react"

interface KYCModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 'intro' | 'select-type' | 'front-id' | 'back-id' | 'selfie' | 'review' | 'success'

export function KYCModal({ isOpen, onClose }: KYCModalProps) {
  const { updateKycStatus } = useAuthStore()
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
            <div className="w-20 h-20 bg-[#ecfdf3] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={40} className="text-[#00ab00]" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Verify your identity</h2>
            <p className="text-sm leading-6 text-gray-500 mb-8 max-w-sm mx-auto">
              Group leaders verify their identity before the group can hold money. Have your ID
              and your phone camera ready.
            </p>
            <div className="space-y-3 mb-8">
              {[
                { icon: FileText, text: "A government ID: national ID, passport, or licence" },
                { icon: Camera, text: "A selfie taken in good light" },
                { icon: ShieldCheck, text: "Reviewed manually by OrbiSave compliance" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 justify-center text-sm text-gray-600">
                  <item.icon size={16} className="shrink-0 text-[#00ab00]" />
                  {item.text}
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep('select-type')}
              className="w-full bg-[#00ab00] text-white h-12 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#009200] transition-colors"
            >
              Get started <ChevronRight size={18} />
            </button>
          </div>
        )

      case 'select-type':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Which document will you use?</h3>
            <p className="text-sm text-gray-500 mb-6">A national ID needs both sides. A passport or licence needs the photo page only.</p>
            <div className="space-y-3">
              {[
                { id: 'national_id', label: 'National ID card' },
                { id: 'passport', label: 'International passport' },
                { id: 'drivers_license', label: "Driver's licence" }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => { setDocType(type.id); setStep('front-id') }}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                    docType === type.id ? 'border-[#00ab00] bg-[#ecfdf3]' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-medium text-gray-900">{type.label}</span>
                  <ChevronRight size={18} className="text-gray-400 group-hover:text-[#00ab00]" />
                </button>
              ))}
            </div>
          </div>
        )

      case 'front-id':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload the front of your ID</h3>
            <p className="text-sm text-gray-500 mb-6">All four corners in frame, every detail readable, no glare.</p>

            <div className="relative group">
              <input
                type="file"
                accept="image/*"
                aria-label="Upload the front of your ID"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={(e) => handleFileUpload(e, 'front')}
              />
              <div className={`aspect-[3/2] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${
                frontImage ? 'border-[#00ab00] bg-[#ecfdf3]' : 'border-gray-200 group-hover:border-gray-300'
              }`}>
                {frontImage ? (
                  <>
                    <CheckCircle size={32} className="text-[#00ab00]" />
                    <span className="text-sm font-medium text-gray-900">{frontImage.name}</span>
                    {/* Not a button: the file input above covers this area, so clicking anywhere reopens the picker. */}
                    <span className="text-xs font-medium text-[#00ab00]">Click again to replace</span>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                      <Upload size={20} className="text-gray-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Click or drag to upload</span>
                  </>
                )}
              </div>
            </div>

            <button
              disabled={!frontImage}
              onClick={() => setStep(docType === 'national_id' ? 'back-id' : 'selfie')}
              title={frontImage ? "Continue" : "Upload the front of your ID first"}
              className="w-full mt-8 bg-[#00ab00] text-white h-12 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#009200] transition-colors"
            >
              Continue
            </button>
          </div>
        )

      case 'back-id':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload the back of your ID</h3>
            <p className="text-sm text-gray-500 mb-6">The reverse side of the same card, readable and free of glare.</p>

            <div className="relative group">
              <input
                type="file"
                accept="image/*"
                aria-label="Upload the back of your ID"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={(e) => handleFileUpload(e, 'back')}
              />
              <div className={`aspect-[3/2] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${
                backImage ? 'border-[#00ab00] bg-[#ecfdf3]' : 'border-gray-200 group-hover:border-gray-300'
              }`}>
                {backImage ? (
                  <>
                    <CheckCircle size={32} className="text-[#00ab00]" />
                    <span className="text-sm font-medium text-gray-900">{backImage.name}</span>
                    {/* Not a button: the file input above covers this area, so clicking anywhere reopens the picker. */}
                    <span className="text-xs font-medium text-[#00ab00]">Click again to replace</span>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                      <Upload size={20} className="text-gray-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Click or drag to upload</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep('front-id')}
                className="flex-1 h-12 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                disabled={!backImage}
                onClick={() => setStep('selfie')}
                title={backImage ? "Continue" : "Upload the back of your ID first"}
                className="flex-1 bg-[#00ab00] text-white h-12 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#009200] transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )

      case 'selfie':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Take a selfie</h3>
            <p className="text-sm text-gray-500 mb-6">Face the camera straight on, in good light, with nothing covering your face.</p>

            <div className="relative group">
              <input
                type="file"
                accept="image/*"
                aria-label="Upload a selfie"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={(e) => handleFileUpload(e, 'selfie')}
              />
              <div className={`aspect-square max-w-[280px] mx-auto rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all overflow-hidden ${
                selfieImage ? 'border-[#00ab00] bg-[#ecfdf3]' : 'border-gray-200 group-hover:border-gray-300'
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
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                      <Camera size={28} className="text-gray-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-500 text-center px-6">Tap to open your camera or upload a photo</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(docType === 'national_id' ? 'back-id' : 'front-id')}
                className="flex-1 h-12 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                disabled={!selfieImage}
                onClick={() => setStep('review')}
                title={selfieImage ? "Review your submission" : "Add a selfie first"}
                className="flex-1 bg-[#00ab00] text-white h-12 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#009200] transition-colors"
              >
                Review
              </button>
            </div>
          </div>
        )

      case 'review':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Check this before you submit</h3>
            <p className="text-sm text-gray-500 mb-6">Once submitted, you cannot change these images until compliance reviews them.</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-[#00ab00]" />
                  <span className="text-sm font-medium text-gray-900">Document type</span>
                </div>
                <span className="text-sm capitalize text-gray-500">{docType.replace('_', ' ')}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <span className="text-xs font-medium text-gray-500">Front side</span>
                  <div className="aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {frontImage && <img src={URL.createObjectURL(frontImage)} alt="Front of your ID" className="w-full h-full object-cover" />}
                  </div>
                </div>
                {backImage && (
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-gray-500">Back side</span>
                    <div className="aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={URL.createObjectURL(backImage)} alt="Back of your ID" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-xs font-medium text-gray-500">Selfie</span>
                <div className="aspect-[16/9] bg-gray-100 rounded-2xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {selfieImage && <img src={URL.createObjectURL(selfieImage)} alt="Your selfie" className="w-full h-full object-cover" />}
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-2 text-sm text-red-600 font-medium">
                <AlertCircle size={14} className="shrink-0" /> {error}
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep('selfie')}
                disabled={isSubmitting}
                className="flex-1 h-12 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Go back and edit
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-[#00ab00] text-white h-12 rounded-lg text-sm font-semibold hover:bg-[#009200] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Submitting...
                  </>
                ) : (
                  "Submit for review"
                )}
              </button>
            </div>
          </div>
        )

      case 'success':
        return (
          <div className="text-center py-10">
            <div className="w-20 h-20 bg-[#ecfdf3] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-[#00ab00]" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Documents received</h2>
            <p className="text-sm leading-6 text-gray-500 mb-10 max-w-sm mx-auto">
              OrbiSave compliance reviews submissions manually, usually within 24 hours. Your status on the
              Profile page stays &quot;submitted&quot; until then, and you will be notified when it changes.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-[#0a2540] text-white h-12 rounded-lg text-sm font-semibold hover:bg-[#1c3a5f] transition-colors"
            >
              Back to dashboard
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
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white animate-in fade-in zoom-in duration-300 dark:border-white/10 dark:bg-gray-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#00ab00]" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-800 dark:text-white">Identity verification</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close identity verification"
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-white/10 dark:hover:text-white"
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
          <div className="h-1 bg-gray-50 dark:bg-white/10">
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
