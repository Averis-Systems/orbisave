import { AuthSlider } from "@/components/auth/AuthSlider"
import { RegisterForm } from "@/components/auth/RegisterForm"
import Link from "next/link"

export const metadata = {
  title: "Create Account — OrbiSave",
  description: "Join OrbiSave to save collectively and grow your community's wealth.",
}

export default function RegisterPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f9faf6]">
      {/* Global Topbar */}
      <div className="flex items-center justify-between px-8 py-6 w-full bg-[#f9faf6] absolute top-0 z-50">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[#012d1d] tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-[#012d1d] flex items-center justify-center text-white text-sm tracking-normal">O</div>
          OrbiSave
        </Link>
        <div className="text-sm font-medium text-[#717973]">
          Already have an account? <Link href="/login" className="text-[#012d1d] font-bold ml-1 hover:text-[#1b4332] transition-colors">Log In</Link>
        </div>
      </div>

      <div className="flex flex-1 pt-[88px]">
        {/* Left Slider */}
        <div className="hidden lg:block relative w-[48%] bg-[#f3f4f1]">
          <AuthSlider />
        </div>
        
        {/* Right Panel */}
        <div className="flex-1 flex flex-col items-center p-8 overflow-y-auto">
           <div className="w-full max-w-md mt-12 pb-12">
             <h1 className="text-3xl font-bold text-[#012d1d] mb-3 font-serif tracking-tight">Create your vault</h1>
             <p className="text-[#717973] mb-10 text-[0.95rem]">Enter your credentials to begin your journey with OrbiSave.</p>
             <RegisterForm />
           </div>
           
           {/* Global Footer in Panel */}
           <div className="w-full max-w-md mt-auto pt-8 border-t border-black/5 flex justify-between text-[0.65rem] text-[#717973] uppercase tracking-widest font-bold">
             <span>© 2024 OrbiSave Private Banking. Member FDIC.</span>
             <div className="flex gap-4">
               <Link href="#" className="hover:text-[#012d1d] transition-colors">Privacy Policy</Link>
               <Link href="#" className="hover:text-[#012d1d] transition-colors">Terms of Service</Link>
               <Link href="#" className="hover:text-[#012d1d] transition-colors">Security Guarantee</Link>
             </div>
           </div>
        </div>
      </div>
    </div>
  )
}
