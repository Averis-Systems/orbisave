import { AuthImage } from "@/components/auth/AuthImage"
import { RegisterForm } from "@/components/auth/RegisterForm"
import Link from "next/link"
import { Suspense } from "react"
import { Shield } from "lucide-react"

export const metadata = {
  title: "Create Account — OrbiSave",
  description: "Join OrbiSave to save collectively and grow your community's wealth.",
}

export default function RegisterPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f9faf6]">
      {/* Global Topbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 sm:px-8 py-6 w-full bg-[#f9faf6] absolute top-0 z-50 gap-4 sm:gap-0">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[#0a2540] tracking-tight self-start sm:self-center">
          <div className="w-8 h-8 rounded-lg bg-[#00ab00] flex items-center justify-center text-white text-sm tracking-normal flex-shrink-0">O</div>
          OrbiSave
        </Link>
        <div className="text-sm font-medium text-[#4a5c6a] self-end sm:self-center">
          Already have an account? <Link href="/login" className="text-[#00ab00] font-bold ml-1 hover:text-[#008a00] transition-colors whitespace-nowrap">Log In</Link>
        </div>
      </div>

      <div className="flex flex-1 pt-[140px] sm:pt-[88px]">
        {/* Left Image Panel */}
        <div className="hidden lg:block relative w-[48%] bg-[#f3f4f1]">
          <AuthImage />
        </div>
        
        {/* Right Panel */}
        <div className="flex-1 flex flex-col items-center p-8 overflow-y-auto">
            <div className="w-full max-w-md mt-12 pb-12">
                <h1 className="text-3xl font-bold text-[#0a2540] mb-3 tracking-tight">Join the Collective</h1>
                <p className="text-[#4a5c6a] mb-10 text-[0.95rem] font-medium">Enter your credentials to begin your journey with OrbiSave.</p>
                <Suspense fallback={<div className="h-40 flex items-center justify-center text-sm text-[#4a5c6a]">Loading form...</div>}>
                  <RegisterForm />
                </Suspense>
              </div>
            
            {/* Simple Global Footer */}
            <div className="w-full max-w-md mt-auto pt-12">
               <div className="flex flex-col items-center gap-4 border-t border-black/5 pt-8">
                  <div className="flex justify-between w-full text-[11px] text-[#a0a5a1] font-bold tracking-tight">
                    <span>© {new Date().getFullYear()} OrbiSave</span>
                    <div className="flex gap-4">
                      <Link href="/privacy" className="hover:text-[#0a2540] transition-colors">Privacy Policy</Link>
                      <Link href="/terms" className="hover:text-[#0a2540] transition-colors">Terms of Service</Link>
                    </div>
                  </div>
               </div>
            </div>
        </div>
      </div>
    </div>
  )
}
