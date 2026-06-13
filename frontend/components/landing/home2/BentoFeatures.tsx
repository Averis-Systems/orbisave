"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import { gsap } from "@/lib/gsap-init"
import { Swiper, SwiperSlide } from "swiper/react"
import { Pagination, Autoplay } from "swiper/modules"
import "swiper/css"
import "swiper/css/pagination"
import { 
  Smartphone, PieChart, Users, 
  ArrowRight, Fingerprint, Building2, Sprout
} from "lucide-react"

export function BentoFeatures() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.from(".bento-item", {
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".bento-grid",
        start: "top 85%",
      }
    })
  }, { scope: containerRef })

  const BENTO_CARDS = [
    { bg: "bg-[#0a2540]", icon: Smartphone, iconColor: "text-[#00ab00]", title: "Mobile First", desc: "Contribute from farm, shop, or office. STK Push works on any phone.", dark: true },
    { bg: "bg-[#e9f3ed]", icon: PieChart, iconColor: "text-[#00ab00]", title: "Real-time Analytics", desc: "Track group performance and member discipline instantly.", dark: false },
    { bg: "bg-[#f9fafb]", icon: Users, iconColor: "text-[#0a2540]", title: "Automated Governance", desc: "Auto-schedule meetings, voting, and penalty collection.", dark: false },
    { bg: "bg-[#0a2540]", icon: Fingerprint, iconColor: "text-[#00ab00]", title: "Biometric Safety", desc: "Secure your group with multi-sig and biometric authentication.", dark: true },
    { bg: "bg-[#fefce8]", icon: Building2, iconColor: "text-[#854d0e]", title: "Bank Visibility", desc: "Build a verifiable history for formal bank loans and credit.", dark: false },
    { bg: "bg-[#dcf6d4]", icon: Sprout, iconColor: "text-[#00ab00]", title: "Harvest Cycles", desc: "Contribution schedules that match your agricultural income windows.", dark: false },
  ]

  return (
    <section ref={containerRef} className="py-24 lg:py-40 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center mb-16 space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-100 rounded-full text-[10px] font-bold tracking-[0.25em] text-[#4a5c6a] uppercase">
            Platform Features
          </div>
          <h2 className="text-4xl lg:text-6xl font-bold tracking-tighter text-[#0a2540]">
            Every Tool Your<br />Group Needs
          </h2>
          <p className="text-lg text-[#4a5c6a] font-medium max-w-xl mx-auto">
            Powerful tools for chairpersons, treasurers, and members — all in one platform.
          </p>
        </div>

        {/* Mobile: Swiper slider */}
        <div className="lg:hidden">
          <Swiper
            modules={[Pagination, Autoplay]}
            spaceBetween={16}
            slidesPerView={1.15}
            centeredSlides
            pagination={{ clickable: true }}
            autoplay={{ delay: 3000, disableOnInteraction: true }}
            className="pb-10"
          >
            {BENTO_CARDS.map((card, i) => (
              <SwiperSlide key={i}>
                <div className={`${card.bg} rounded-[8px] p-8 h-[220px] flex flex-col justify-between`}>
                  <card.icon className={`${card.iconColor} w-9 h-9`} />
                  <div>
                    <h4 className={`text-xl font-black mb-1 ${card.dark ? "text-white" : "text-[#0a2540]"}`}>{card.title}</h4>
                    <p className={`text-sm font-medium ${card.dark ? "text-white/60" : "text-[#4a5c6a]"}`}>{card.desc}</p>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Desktop: bento grid */}
        <div className="bento-grid hidden lg:grid lg:grid-cols-12 gap-6 auto-rows-[240px]">
          
          {/* Card 1: Mobile First */}
          <div className="bento-item lg:col-span-8 lg:row-span-2 bg-[#f8fafc] rounded-[8px] p-12 relative overflow-hidden group border border-gray-100">
            <div className="relative z-10 space-y-4 max-w-md">
              <div className="w-12 h-12 bg-[#00ab00]/10 rounded-[8px] flex items-center justify-center text-[#00ab00]">
                <Smartphone size={24} />
              </div>
              <h3 className="text-3xl lg:text-4xl font-bold text-[#0a2540] tracking-tight">Mobile First, Always</h3>
              <p className="text-[#4a5c6a] text-lg font-medium">Contribute from the shop, farm, or office. No internet? USSD support coming soon.</p>
              <button className="flex items-center gap-2 font-black text-[#00ab00] uppercase text-xs tracking-widest pt-4">
                Explore App <ArrowRight size={16} />
              </button>
            </div>
            {/* Mockup Image - floating in the card */}
            <div className="absolute right-[-40px] bottom-[-40px] w-1/2 lg:block hidden transition-transform group-hover:scale-105 duration-700">
               <img src="/digital-leap.png" alt="" className="rounded-[8px] shadow-4xl rotate-[-12deg]" />
            </div>
          </div>

          {/* Card 2: Security */}
          <div className="bento-item lg:col-span-4 lg:row-span-1 bg-[#0a2540] rounded-[8px] p-10 flex flex-col justify-between group">
            <Fingerprint className="text-[#00ab00] w-10 h-10" />
            <div className="space-y-2">
              <h4 className="text-2xl font-black text-white">Biometric Safety</h4>
              <p className="text-white/60 text-sm font-medium">Secure your group's wealth with multi-sig and biometric auth.</p>
            </div>
          </div>

          {/* Card 3: Analytics */}
          <div className="bento-item lg:col-span-4 lg:row-span-1 bg-[#e9f3ed] rounded-[8px] p-10 flex flex-col justify-between hover:bg-[#00ab00] transition-colors group">
            <PieChart className="text-[#00ab00] group-hover:text-white w-10 h-10" />
            <div className="space-y-2">
              <h4 className="text-2xl font-black text-[#0a2540] group-hover:text-white">Real-time Analytics</h4>
              <p className="text-[#4a5c6a] group-hover:text-white/80 text-sm font-medium">Track group performance and member discipline instantly.</p>
            </div>
          </div>

          {/* Card 4: Governance */}
          <div className="bento-item lg:col-span-4 lg:row-span-2 bg-[#f9fafb] border border-gray-100 rounded-[8px] p-12 flex flex-col justify-center text-center space-y-8">
            <div className="mx-auto w-20 h-20 bg-white rounded-full shadow-xl flex items-center justify-center border border-gray-50">
              <Users className="text-[#0a2540]" size={32} />
            </div>
            <div className="space-y-4">
              <h4 className="text-3xl font-black text-[#0a2540]">Automated Governance</h4>
              <p className="text-[#4a5c6a] font-medium">Auto-schedule meetings, voting, and penalty collection.</p>
            </div>
            <div className="pt-4 flex flex-wrap justify-center gap-2">
              <div className="px-4 py-2 bg-white rounded-[4px] text-[10px] font-black text-[#4a5c6a] shadow-sm border border-gray-50 uppercase tracking-widest">Voting</div>
              <div className="px-4 py-2 bg-white rounded-[4px] text-[10px] font-black text-[#4a5c6a] shadow-sm border border-gray-50 uppercase tracking-widest">Penalties</div>
              <div className="px-4 py-2 bg-white rounded-[4px] text-[10px] font-black text-[#4a5c6a] shadow-sm border border-gray-50 uppercase tracking-widest">Minutes</div>
            </div>
          </div>

          {/* Card 5: Credit */}
          <div className="bento-item lg:col-span-4 lg:row-span-1 bg-[#fefce8] rounded-[8px] p-12 flex items-center justify-between group border border-[#fefce8]">
            <div className="space-y-4">
              <div className="w-10 h-10 bg-[#854d0e]/10 rounded-[8px] flex items-center justify-center text-[#854d0e]">
                <Building2 size={24} />
              </div>
              <h4 className="text-2xl font-bold text-[#854d0e]">Bank Visibility</h4>
              <p className="text-[#854d0e]/70 text-sm font-medium">Build a verifiable history for formal bank loans.</p>
            </div>
          </div>

          {/* Card 6: Seasonal Scheduling */}
          <div className="bento-item lg:col-span-4 lg:row-span-1 bg-[#0a2540] rounded-[8px] p-12 flex items-center justify-between group text-white">
            <div className="space-y-4">
              <div className="w-10 h-10 bg-[#00ab00]/20 rounded-[8px] flex items-center justify-center text-[#00ab00]">
                <Sprout size={24} />
              </div>
              <h4 className="text-2xl font-bold text-[#00ab00]">Harvest Cycles</h4>
              <p className="text-white/60 text-sm font-medium">Schedules that match your agricultural income.</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
