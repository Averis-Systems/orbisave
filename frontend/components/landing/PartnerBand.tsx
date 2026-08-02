"use client"

/**
 * Partner enquiry band.
 *
 * The one place on the site aimed at banks, distributors and investors rather
 * than members. A real, working form: it posts to the public
 * /api/v1/partner-enquiries/ endpoint (anonymous, throttled) and confirms on
 * success. Content-first scroll reveal, professional voice.
 */

import { useRef, useState } from "react"
import { useGSAP } from "@gsap/react"
import { gsap, ScrollTrigger } from "@/lib/gsap-init"
import { api } from "@/lib/api"
import { CheckCircle2, Landmark, Loader2, Network, TrendingUp } from "lucide-react"

const PARTNER_TYPES = [
  { value: "bank", label: "Bank or financial institution" },
  { value: "distributor", label: "Distributor or agent network" },
  { value: "investor", label: "Investor" },
  { value: "other", label: "Other" },
]

const POINTS = [
  { icon: Landmark, text: "Hold member funds in your trust accounts and earn on the float" },
  { icon: Network, text: "Reach organised, already-saving groups through one platform" },
  { icon: TrendingUp, text: "Lend to groups with a verifiable savings track record" },
]

type Form = {
  organization: string
  contact_name: string
  email: string
  phone: string
  partner_type: string
  message: string
}

const EMPTY: Form = { organization: "", contact_name: "", email: "", phone: "", partner_type: "bank", message: "" }

export function PartnerBand() {
  const scope = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
      gsap.from(".pb-el", {
        y: 28,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: scope.current, start: "top 80%", once: true },
      })
      ScrollTrigger.refresh()
    },
    { scope },
  )

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }))

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  const canSubmit = form.organization.trim() && form.contact_name.trim() && emailValid && !submitting

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await api.post("partner-enquiries/", {
        organization: form.organization.trim(),
        contact_name: form.contact_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        partner_type: form.partner_type,
        message: form.message.trim(),
      })
      setDone(true)
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response?.data
      const firstFieldError = data?.errors ? Object.values(data.errors).flat()[0] : undefined
      setError(firstFieldError || data?.message || "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section ref={scope} className="relative bg-white py-16 lg:py-24">
      <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8">
        {/* Pitch */}
        <div>
          <p className="pb-el text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#00ab00" }}>
            Partner with OrbiSave
          </p>
          <h2 className="pb-el mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ color: "#0a2540" }}>
            Bring OrbiSave to the groups you serve
          </h2>
          <p className="pb-el mt-4 text-base leading-relaxed" style={{ color: "#46586a" }}>
            We work with banks, distributors and investors who want to reach Africa&apos;s savings groups. Tell us who
            you are and our partnerships team will be in touch.
          </p>

          <div className="pb-el mt-8 space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: "#ecfdf3", color: "#039855" }}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <p className="pt-1.5 text-sm leading-snug" style={{ color: "#334656" }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="pb-el rounded-2xl border bg-white p-6 sm:p-8" style={{ borderColor: "#e6ede9", boxShadow: "0 10px 40px -18px rgba(10,37,64,0.25)" }}>
          {done ? (
            <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "#ecfdf3", color: "#039855" }}>
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <h3 className="mt-4 text-xl font-bold" style={{ color: "#0a2540" }}>
                Thank you
              </h3>
              <p className="mt-2 max-w-sm text-sm" style={{ color: "#46586a" }}>
                Your enquiry is in. Our partnerships team will reach out to {form.contact_name || "you"} shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Organization" required>
                  <input value={form.organization} onChange={(e) => set({ organization: e.target.value })} className="pb-input" placeholder="Equity Bank" />
                </Field>
                <Field label="Your name" required>
                  <input value={form.contact_name} onChange={(e) => set({ contact_name: e.target.value })} className="pb-input" placeholder="Jane Doe" />
                </Field>
                <Field label="Work email" required>
                  <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} className="pb-input" placeholder="you@company.com" />
                </Field>
                <Field label="Phone">
                  <input value={form.phone} onChange={(e) => set({ phone: e.target.value })} className="pb-input" placeholder="+254 700 000 000" />
                </Field>
              </div>
              <Field label="I am a">
                <select value={form.partner_type} onChange={(e) => set({ partner_type: e.target.value })} className="pb-input">
                  {PARTNER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="How would you like to work together?">
                <textarea value={form.message} onChange={(e) => set({ message: e.target.value })} rows={4} className="pb-input resize-none" placeholder="A sentence or two is plenty." />
              </Field>

              {error && (
                <p role="alert" className="rounded-lg px-3.5 py-2.5 text-sm" style={{ background: "#fef3f2", color: "#d92d20" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "#00ab00" }}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Send enquiry
              </button>
              <p className="text-center text-[11px]" style={{ color: "#9aa8b2" }}>
                We only use these details to respond to your enquiry.
              </p>
            </form>
          )}
        </div>
      </div>

      <style jsx>{`
        .pb-input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #d6e4df;
          background: #ffffff;
          padding: 0.7rem 0.85rem;
          font-size: 0.875rem;
          color: #0a2540;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .pb-input::placeholder {
          color: #9aa8b2;
        }
        .pb-input:focus {
          border-color: #00ab00;
          box-shadow: 0 0 0 3px rgba(0, 171, 0, 0.12);
        }
      `}</style>
    </section>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold" style={{ color: "#46586a" }}>
        {label}
        {required && <span style={{ color: "#00ab00" }}> *</span>}
      </span>
      {children}
    </label>
  )
}
