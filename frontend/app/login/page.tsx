import { AuthIllustrationPanel } from "@/components/auth/AuthIllustrationPanel"
import { AuthFooter } from "@/components/auth/AuthFooter"
import { LoginForm } from "@/components/auth/LoginForm"
import Link from "next/link"

export const metadata = {
  title: "Login — OrbiSave",
  description: "Sign in to manage your savings and group collectives.",
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 font-sans lg:p-10">
      <div className="flex w-full max-w-[1180px] overflow-hidden rounded-lg border border-slate-200 bg-white lg:min-h-[640px]">
        <AuthIllustrationPanel illustration="/illustrations/savings.svg" />

        <div className="flex flex-1 items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-[420px]">
            <div className="mb-10 text-center lg:text-left">
              {/* The logo lives on the illustration panel at lg+; keep it here
                  for small screens where that panel is hidden. */}
              <Link
                href="/"
                className="mb-8 inline-flex items-center gap-2 text-xl font-bold tracking-tight text-navy lg:hidden"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded bg-primary text-sm text-white">O</span>
                OrbiSave
              </Link>
              <h1 className="mb-2 text-3xl font-bold tracking-tight text-navy">Sign in to OrbiSave</h1>
              <p className="text-sm font-medium leading-relaxed text-slate-500">
                Access your account to coordinate collective capital and track group savings.
              </p>
            </div>

            <LoginForm />

            <div className="mt-8 border-t border-slate-100 pt-8 text-center">
              <p className="text-sm font-medium text-slate-500">
                New to OrbiSave?{" "}
                <Link
                  href="/register"
                  className="font-bold text-primary transition-all hover:text-primary/80"
                >
                  Create an account
                </Link>
              </p>
            </div>

            <AuthFooter />
          </div>
        </div>
      </div>
    </div>
  )
}
