import { Navbar } from "@/components/landing/Navbar"
import { Footer } from "@/components/landing/Footer"

export const metadata = {
  title: "KYC Policy — OrbiSave",
  description: "OrbiSave's Know Your Customer (KYC) policy — how we verify identities and protect group members.",
}

export default function KycPolicyPage() {
  return (
    <div className="min-h-screen font-sans" style={{ background: "#f7f9f8" }}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24">
        <div
          className="inline-flex items-center text-xs font-bold tracking-[0.15em] uppercase mb-6 px-3 py-1.5"
          style={{ color: "#00ab00", background: "#e9f3ed", borderRadius: "4px", border: "1px solid #d6e4df" }}
        >
          Legal
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-4" style={{ color: "#0a2540" }}>
          KYC Policy
        </h1>
        <p className="text-base font-medium leading-relaxed mb-12" style={{ color: "#4a5c6a" }}>
          Last updated: May 2026
        </p>

        <div className="prose prose-slate max-w-none" style={{ color: "#4a5c6a" }}>
          <p className="text-base leading-relaxed mb-6">
            OrbiSave is committed to maintaining a safe and trustworthy platform. Our Know Your Customer (KYC) policy
            ensures that group leaders are verified before managing any financial activity.
          </p>
          <p className="text-base leading-relaxed mb-6">
            The full KYC policy document is currently being finalized. Please contact our support team for any
            verification-related questions at{" "}
            <a href="/support" style={{ color: "#00ab00", fontWeight: 700, textDecoration: "none" }}>
              support
            </a>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
