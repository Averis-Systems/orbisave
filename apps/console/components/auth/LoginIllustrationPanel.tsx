import { Globe2, ShieldCheck } from 'lucide-react'

/**
 * Left panel of the split-screen auth layout (login/register/forgot-password).
 * Dark, global-command tone — correct for the cross-country oversight app.
 *
 * The centered graphic is a placeholder "orbit" motif (concentric rings +
 * nodes — echoes the OrbiSave name and Console's cross-country reach) built
 * as inline SVG so the page never looks unfinished. Swap it for a real
 * Icons8 3D illustration once the icons8mcp tools are connected — search
 * terms: "global network 3d", "world map connections", "data center 3d".
 * See docs/PROGRAM_REPORT_2026-07.md follow-ups.
 */
export function LoginIllustrationPanel() {
  return (
    <div className="relative hidden h-full w-full overflow-hidden bg-gradient-to-br from-navy via-navy to-navy-mid lg:flex lg:w-[42%] lg:flex-shrink-0 lg:flex-col lg:justify-between lg:p-12">
      {/* Topographic line texture, per the original brand spec (~6% opacity) */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <path
            key={i}
            d={`M-20 ${20 + i * 40} Q 100 ${i * 38} 200 ${20 + i * 40} T 420 ${20 + i * 40}`}
            stroke="white"
            strokeWidth="1"
            fill="none"
          />
        ))}
      </svg>

      {/* ── Orbit motif — placeholder for the future Icons8 illustration ── */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <svg viewBox="0 0 320 320" className="h-[420px] w-[420px] opacity-90">
          <circle cx="160" cy="160" r="150" stroke="#00ab00" strokeOpacity="0.15" strokeWidth="1" fill="none" />
          <circle cx="160" cy="160" r="105" stroke="#00ab00" strokeOpacity="0.22" strokeWidth="1" fill="none" />
          <circle cx="160" cy="160" r="60" stroke="#00ab00" strokeOpacity="0.3" strokeWidth="1" fill="none" />
          <circle cx="160" cy="160" r="10" fill="#00ab00" fillOpacity="0.9" />
          <circle cx="298" cy="160" r="5" fill="#00ab00" fillOpacity="0.9" />
          <circle cx="63" cy="245" r="4" fill="#ffffff" fillOpacity="0.7" />
          <circle cx="220" cy="60" r="4" fill="#ffffff" fillOpacity="0.5" />
          <circle cx="90" cy="80" r="3" fill="#ffffff" fillOpacity="0.4" />
        </svg>
      </div>

      <div className="relative z-10 flex items-center gap-2 text-white/70">
        <Globe2 className="h-4 w-4" />
        <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Super Admin Console</span>
      </div>

      <div className="relative z-10 max-w-md">
        <h2 className="text-3xl font-black leading-tight tracking-tight text-white lg:text-4xl">
          One console, every trust account.
        </h2>
        <p className="mt-4 text-sm font-medium leading-relaxed text-white/60">
          Digitizing Africa&apos;s oldest savings tradition — with full visibility across every payment
          rail, every country, and every group on the platform.
        </p>

        <div className="mt-8 flex gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5">
            <span className="text-sm font-black text-primary">3</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Countries Live</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Live Oversight</span>
          </div>
        </div>
      </div>
    </div>
  )
}
