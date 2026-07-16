import { AuthIllustrationPanel } from "@/components/auth/AuthIllustrationPanel"
import { RegisterForm } from "@/components/auth/RegisterForm"
import Link from "next/link"
import { Suspense } from "react"

export const metadata = {
  title: "Create Account — OrbiSave",
  description: "Join OrbiSave to save collectively and grow your community's wealth.",
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 font-sans lg:p-10">
      <div className="flex w-full max-w-[1180px] overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/10 lg:min-h-[640px]">
        <AuthIllustrationPanel
          illustration="/illustrations/team-spirit.svg"
          caption="Every member sees the same ledger: contributions, rotation payouts, loans, and fines — recorded once, visible to all."
        />

        <div className="flex flex-1 items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-[460px] py-4">
            <div className="mb-10 text-center lg:text-left">
              <Link
                href="/"
                className="mb-8 inline-flex items-center gap-2 text-xl font-bold tracking-tight text-navy"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-white">O</span>
                OrbiSave
              </Link>
              <h1 className="mb-2 text-3xl font-bold tracking-tight text-navy">Join the Collective</h1>
              <p className="text-sm font-medium leading-relaxed text-slate-500">
                Create your account to begin your journey with OrbiSave.
              </p>
            </div>

            <Suspense
              fallback={
                <div className="flex h-40 items-center justify-center text-sm text-slate-500">Loading form…</div>
              }
            >
              <RegisterForm />
            </Suspense>

            <div className="mt-8 border-t border-slate-100 pt-8 text-center">
              <Link
                href="/login"
                className="border-b border-primary/20 pb-0.5 text-sm font-bold text-primary transition-all hover:text-primary/80"
              >
                Already have an account? Log in
              </Link>
            </div>

            <div className="mt-10 flex justify-between px-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                &copy; {new Date().getFullYear()} OrbiSave
              </p>
              <div className="flex gap-4">
                <Link
                  href="/privacy"
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-slate-600"
                >
                  Privacy
                </Link>
                <Link
                  href="/terms"
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-slate-600"
                >
                  Terms
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
