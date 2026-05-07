"use client"

const SCROLLER_LOGOS = [
  { label: "M-Pesa",        logo: "/logos/mpesa.png" },
  { label: "MTN MoMo",      logo: "/logos/mtn-momo.png" },
  { label: "Airtel Money",  logo: "/logos/airtel-money.png" },
  { label: "Bank Transfer", logo: "/logos/bank-transfer.png" },
]

export function TrustBelt() {
  return (
    <section 
      className="relative w-full bg-white pb-12 lg:pb-20 pt-16 lg:pt-24"
      style={{ 
        clipPath: "polygon(0 15%, 100% 0, 100% 100%, 0 100%)",
        marginTop: "-160px"
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 lg:mt-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          
          {/* LEFT SIDE: Partner Logos */}
          <div className="relative h-16 overflow-hidden order-2 lg:order-1">
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent z-10" />
            
            <div className="animate-marquee flex items-center gap-16 lg:gap-20 h-full">
              {[...SCROLLER_LOGOS, ...SCROLLER_LOGOS, ...SCROLLER_LOGOS].map((item, i) => (
                <div key={i} className="flex-shrink-0 flex items-center justify-center">
                  <img
                    src={item.logo}
                    alt={item.label}
                    className="h-8 md:h-11 w-auto object-contain"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT SIDE: Final Messaging (Right-aligned) */}
          <div className="order-1 lg:order-2 text-right">
            <h2 className="text-3xl lg:text-[2.8rem] font-black tracking-tighter leading-none text-[#0a2540] mb-3">
              Regional <span className="text-[#00ab00]">Infrastructure</span>
            </h2>
            <p className="text-base md:text-xl font-medium leading-relaxed text-[#4a5c6a]">
              Trusted by groups in <span className="font-bold text-[#0a2540]">Kenya, Rwanda and Ghana</span>
            </p>
          </div>

        </div>
      </div>
    </section>
  )
}
