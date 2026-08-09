"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { HelpCircle, X, Paperclip, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react"
import { api } from "@/lib/api"

type Category = "bug" | "payment" | "account" | "question" | "suggestion" | "other"
type Severity = "normal" | "serious"

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "bug", label: "Something is broken" },
  { value: "payment", label: "Payment or money issue" },
  { value: "account", label: "Account or login" },
  { value: "question", label: "General question" },
  { value: "suggestion", label: "Suggestion" },
  { value: "other", label: "Other" },
]

const MAX_SCREENSHOT_MB = 5

/**
 * Floating help button (bottom-right of every dashboard page) + a support form.
 * A member can describe an issue, attach a screenshot, and flag it as serious
 * (which escalates it straight to the super admin). Posts to /feedback/.
 */
export function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const [category, setCategory] = useState<Category>("bug")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [severity, setSeverity] = useState<Severity>("normal")
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dialogRef = useRef<HTMLDivElement>(null)
  const firstFieldRef = useRef<HTMLSelectElement>(null)

  useEffect(() => setMounted(true), [])

  // Move focus into the panel on open, close on Escape, lock body scroll.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => firstFieldRef.current?.focus(), 60)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      clearTimeout(t)
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function reset() {
    setCategory("bug")
    setSubject("")
    setMessage("")
    setSeverity("normal")
    setScreenshot(null)
    setPreview(null)
    setError(null)
    setDone(false)
    setSubmitting(false)
  }

  function close() {
    setOpen(false)
    // Give the close transition a moment before wiping the form.
    setTimeout(reset, 200)
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setError(null)
    if (!file) {
      setScreenshot(null)
      setPreview(null)
      return
    }
    if (file.size > MAX_SCREENSHOT_MB * 1024 * 1024) {
      setError(`Screenshot must be under ${MAX_SCREENSHOT_MB} MB.`)
      return
    }
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      setError("Screenshot must be a PNG, JPG or WebP image.")
      return
    }
    setScreenshot(file)
    setPreview(URL.createObjectURL(file))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (!subject.trim() || !message.trim()) {
      setError("Please add a subject and a short description.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const form = new FormData()
      form.append("category", category)
      form.append("subject", subject.trim())
      form.append("message", message.trim())
      form.append("severity", severity)
      form.append("page_url", typeof window !== "undefined" ? window.location.pathname : "")
      if (screenshot) form.append("screenshot", screenshot)
      await api.post("/feedback/", form, { headers: { "Content-Type": "multipart/form-data" } })
      setDone(true)
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { message?: string; errors?: { detail?: string[] } } } })?.response?.data
      setError(detail?.message || detail?.errors?.detail?.[0] || "Could not send your feedback. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) return null

  return (
    <>
      {/* Floating trigger — bottom-right, clears the mobile safe area. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Get help or send feedback"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#00ab00] text-white shadow-lg shadow-[#00ab00]/30 transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00ab00]/40 active:scale-95"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <HelpCircle className="h-7 w-7" strokeWidth={2} />
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
          >
            {/* Scrim */}
            <div
              className="absolute inset-0 bg-[#0a2540]/60 backdrop-blur-sm transition-opacity duration-200"
              onClick={close}
            />

            <div
              ref={dialogRef}
              className="relative flex w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-[#0f1b2d] max-h-[92vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/10">
                <div>
                  <h2 id="feedback-title" className="text-lg font-semibold text-[#0a2540] dark:text-white">
                    Help &amp; feedback
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    Tell us what is going on and we will look into it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {done ? (
                <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                  <CheckCircle2 className="h-14 w-14 text-[#00ab00]" strokeWidth={1.75} />
                  <h3 className="text-lg font-semibold text-[#0a2540] dark:text-white">Thank you</h3>
                  <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
                    Your feedback has reached our team{severity === "serious" ? " and has been escalated for priority review" : ""}.
                    You can track it in your notifications.
                  </p>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-2 rounded-lg bg-[#00ab00] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#009100]"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
                  {/* Category */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="fb-category" className="text-sm font-medium text-[#0a2540] dark:text-slate-200">
                      What is this about?
                    </label>
                    <select
                      id="fb-category"
                      ref={firstFieldRef}
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                      className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#0a2540] focus:border-[#00ab00] focus:outline-none focus:ring-2 focus:ring-[#00ab00]/30 dark:border-white/15 dark:bg-white/5 dark:text-white"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="fb-subject" className="text-sm font-medium text-[#0a2540] dark:text-slate-200">
                      Subject <span className="text-[#00ab00]">*</span>
                    </label>
                    <input
                      id="fb-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      maxLength={200}
                      placeholder="A short summary"
                      className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#0a2540] placeholder:text-slate-400 focus:border-[#00ab00] focus:outline-none focus:ring-2 focus:ring-[#00ab00]/30 dark:border-white/15 dark:bg-white/5 dark:text-white"
                    />
                  </div>

                  {/* Message */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="fb-message" className="text-sm font-medium text-[#0a2540] dark:text-slate-200">
                      Describe what happened <span className="text-[#00ab00]">*</span>
                    </label>
                    <textarea
                      id="fb-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      placeholder="What were you trying to do, and what went wrong?"
                      className="resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#0a2540] placeholder:text-slate-400 focus:border-[#00ab00] focus:outline-none focus:ring-2 focus:ring-[#00ab00]/30 dark:border-white/15 dark:bg-white/5 dark:text-white"
                    />
                  </div>

                  {/* Severity */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-[#0a2540] dark:text-slate-200">Priority</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSeverity("normal")}
                        aria-pressed={severity === "normal"}
                        className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                          severity === "normal"
                            ? "border-[#00ab00] bg-[#00ab00]/10 text-[#0a2540] dark:text-white"
                            : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-white/15 dark:text-slate-400"
                        }`}
                      >
                        Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => setSeverity("serious")}
                        aria-pressed={severity === "serious"}
                        className={`flex h-11 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors ${
                          severity === "serious"
                            ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                            : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-white/15 dark:text-slate-400"
                        }`}
                      >
                        <AlertTriangle className="h-4 w-4" /> Serious
                      </button>
                    </div>
                    {severity === "serious" && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Serious issues are escalated to our head office for priority review.
                      </p>
                    )}
                  </div>

                  {/* Screenshot */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-[#0a2540] dark:text-slate-200">
                      Screenshot <span className="font-normal text-slate-400">(optional)</span>
                    </span>
                    {preview ? (
                      <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 dark:border-white/15">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt="Screenshot preview" className="h-14 w-14 rounded object-cover" />
                        <span className="flex-1 truncate text-sm text-slate-500">{screenshot?.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setScreenshot(null)
                            setPreview(null)
                          }}
                          className="rounded-md px-2 py-1 text-sm text-slate-400 hover:text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 text-sm text-slate-500 transition-colors hover:border-[#00ab00] hover:text-[#00ab00] dark:border-white/20">
                        <Paperclip className="h-4 w-4" /> Attach a screenshot
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onPickFile} className="sr-only" />
                      </label>
                    )}
                  </div>

                  {error && (
                    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-1 flex h-12 items-center justify-center gap-2 rounded-lg bg-[#00ab00] text-sm font-semibold text-white transition-colors hover:bg-[#009100] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                      </>
                    ) : (
                      "Send feedback"
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
