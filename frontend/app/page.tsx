import { Navbar } from "@/components/landing/Navbar"
import { HeroLanding } from "@/components/landing/HeroLanding"
import { WhoItsFor } from "@/components/landing/WhoItsFor"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { PilotProof } from "@/components/landing/PilotProof"
import { CtaSection } from "@/components/landing/CtaSection"
import { Footer } from "@/components/landing/Footer"

/**
 * OrbiSave landing.
 *
 * One canonical marketing page (the home2 / landing-v2 experiments are gone).
 * Story order: what it is + product proof (hero) -> who it serves (every group,
 * not only farmers) -> how it works -> real pilot & banking-partner status ->
 * final call to action. Each section owns its own scroll motion.
 */
export default function Home() {
  return (
    <div className="min-h-screen font-sans" style={{ background: "#f7f9f8" }}>
      <Navbar />
      <HeroLanding />
      <WhoItsFor />
      <HowItWorks />
      <PilotProof />
      <CtaSection />
      <Footer />
    </div>
  )
}
