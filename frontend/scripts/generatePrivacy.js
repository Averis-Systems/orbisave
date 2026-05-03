const fs = require('fs');

let html = fs.readFileSync('docs/tmp_privacy.txt', 'utf8');

// Replace contact info with links
html = html.replace(/privacy@orbisave\.com/g, '<a href=\"mailto:privacy@orbisave.com\" style=\"color: #00ab00; text-decoration: underline;\">privacy@orbisave.com</a>');
html = html.replace(/hello@orbisave\.com/g, '<a href=\"mailto:hello@orbisave.com\" style=\"color: #00ab00; text-decoration: underline;\">hello@orbisave.com</a>');
html = html.replace(/www\.orbisave\.com/g, '<a href=\"/\" style=\"color: #00ab00; text-decoration: underline;\">www.orbisave.com</a>');
html = html.replace(/orbisave\.com\/privacy/g, '<a href=\"/privacy\" style=\"color: #00ab00; text-decoration: underline;\">orbisave.com/privacy</a>');

// Link to Averis Systems website
html = html.replace(/Averis Systems Ltd/g, '<a href=\"https://averissystems.com\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color: #00ab00; text-decoration: underline; font-weight: 600;\">Averis Systems Ltd</a>');

// Link to support/contact page (the user mentioned "contact etc, use reference to the contact page")
// Since there's no /contact, but /support seems to be it, I'll use /support
html = html.replace(/contact us through the following channels/g, 'contact us through our <a href=\"/support\" style=\"color: #00ab00; text-decoration: underline; font-weight: 600;\">Support & Contact Page</a> or the following channels');
html = html.replace(/contact us immediately at/g, 'contact us immediately via our <a href=\"/support\" style=\"color: #00ab00; text-decoration: underline; font-weight: 600;\">Help Centre</a> or at');

const pageContent = `"use client"

import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ShieldAlert } from "lucide-react"
import { Navbar } from "@/components/landing/Navbar"
import { Footer } from "@/components/landing/Footer"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger)

export default function PrivacyPage() {
  const pageRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.fromTo(".privacy-hero",
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
          <ShieldAlert className="privacy-hero w-10 h-10 mx-auto mb-6" style={{ color: "#00ab00" }} />
          <h1 className="privacy-hero text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6" style={{ color: "#0a2540" }}>
            Privacy Policy
          </h1>
          <p className="privacy-hero text-lg font-medium max-w-2xl mx-auto" style={{ color: "#4a5c6a" }}>
            How we protect, manage, and secure your personal and financial data.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-24" style={{ background: "#ffffff" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            className="prose prose-lg max-w-none"
            style={{ color: "#4a5c6a" }}
            dangerouslySetInnerHTML={{ __html: ${JSON.stringify(html)} }}
          />
        </div>
      </section>

      <Footer />
    </div>
  )
}
`;

fs.mkdirSync('app/privacy', { recursive: true });
fs.writeFileSync('app/privacy/page.tsx', pageContent);

console.log('Privacy page generated successfully!');
