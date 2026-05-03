"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import { Scale } from "lucide-react"
import { Navbar } from "@/components/landing/Navbar"
import { Footer } from "@/components/landing/Footer"
import { gsap } from "@/lib/gsap-init"

export default function TermsPage() {
  const pageRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.fromTo(".terms-hero",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: "power2.out", delay: 0.1 }
    )
  }, { scope: pageRef })

  return (
    <div ref={pageRef} className="min-h-screen font-sans" style={{ background: "#ffffff" }}>
      <Navbar />

      <section className="pt-32 pb-24 relative overflow-hidden" style={{ background: "#e9f3ed" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(10,37,64,0.05) 1px, transparent 0)", backgroundSize: "36px 36px" }} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <Scale className="terms-hero w-10 h-10 mx-auto mb-6" style={{ color: "#00ab00" }} />
          <h1 className="terms-hero text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6" style={{ color: "#0a2540" }}>
            Terms of Use
          </h1>
          <p className="terms-hero text-lg font-medium max-w-2xl mx-auto" style={{ color: "#4a5c6a" }}>
            The rules and guidelines for using the OrbiSave governance and financial infrastructure.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-24" style={{ background: "#ffffff" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            className="prose prose-lg max-w-none"
            style={{ color: "#4a5c6a" }}
            dangerouslySetInnerHTML={{ __html: "<p><strong>ORBISAVE</strong></p><p>A Product of <a href=\"https://averissystems.com\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color: #00ab00; text-decoration: underline; font-weight: 600;\">Averis Systems Ltd</a></p><p><strong>TERMS OF USE</strong></p><p><em>Effective Date: 1 April 2026  |  Version 1.0</em></p><p><em>Last Reviewed: April 2026</em></p><p>These Terms of Use (“Terms”) govern your access to and use of the OrbiSave platform (“OrbiSave”, “Platform”, or “Service”), developed and operated by <a href=\"https://averissystems.com\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color: #00ab00; text-decoration: underline; font-weight: 600;\">Averis Systems Ltd</a>. By accessing or using the Platform, you agree to be bound by these Terms.</p><h1><strong>1. PLATFORM SERVICES</strong></h1><p>OrbiSave is a digital financial infrastructure platform designed to modernise community savings groups. We provide the software layer for group governance, ledger management, and automated contribution/payout scheduling.</p><h1><strong>2. USER OBLIGATIONS</strong></h1><p>As a User, you agree to provide accurate and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p><h1><strong>3. FINANCIAL TRANSACTIONS & TRUST ACCOUNTS</strong></h1><p>Averis Systems Ltd operates exclusively as the software and governance layer. User funds are held in country-specific Trust Accounts maintained with licensed regulated banks. You acknowledge that OrbiSave is not a deposit-taking institution.</p><h1><strong>4. GROUP GOVERNANCE</strong></h1><p>Each Group operates under its own constitution and rules. OrbiSave facilitates the enforcement of these rules but is not responsible for the internal disputes or governance failures of any Group.</p><h1><strong>5. PROHIBITED ACTIVITIES</strong></h1><p>You agree not to use the Platform for any unlawful, fraudulent, or malicious activity, including money laundering or financing of terrorism.</p><h1><strong>6. INTELLECTUAL PROPERTY</strong></h1><p>All intellectual property rights in the Platform and its underlying software are owned by Averis Systems Ltd. You are granted a limited, non-exclusive license to use the Platform for its intended purpose.</p><h1><strong>7. LIMITATION OF LIABILITY</strong></h1><p>Averis Systems Ltd shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform.</p><h1><strong>8. AMENDMENTS</strong></h1><p>We may amend these Terms at any time. We will notify you of material changes. Continued use of the Platform constitutes acceptance of the amended Terms.</p><h1><strong>9. GOVERNING LAW</strong></h1><p>These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which your Trust Account is held (Kenya, Rwanda, or Ghana).</p><h1><strong>10. CONTACT</strong></h1><p>For support or legal inquiries, contact us at <a href=\"mailto:hello@orbisave.com\" style=\"color: #00ab00; text-decoration: underline;\">hello@orbisave.com</a>.</p>" }}
          />
        </div>
      </section>

      <Footer />
    </div>
  )
}
