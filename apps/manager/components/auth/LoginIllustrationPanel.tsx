import { MapPinned, ShieldCheck } from 'lucide-react'

/**
 * Left panel of the split-screen auth layout (login/register/forgot-password).
 * Light, warm tone — correct for country-ops staff (KYC review, group
 * verification) rather than Console's dark "global command" treatment.
 *
 * The centered graphic is a placeholder "clustered circles" motif (a group
 * of overlapping rings — echoes reviewing/verifying a chama's membership)
 * built as inline SVG so the page never looks unfinished. Swap it for a real
 * Icons8 3D illustration once the icons8mcp tools are connected — search
 * terms: "document verification 3d", "team review 3d", "checklist approval".
 * See docs/PROGRAM_REPORT_2026-07.md follow-ups.
 */
export function LoginIllustrationPanel() {
  return (
    <div className="relative hidden h-full w-full overflow-hidden bg-gradient-to-br from-[#eefaf1] via-[#f3f4f1] to-[#eefaf1] lg:flex lg:w-[42%] lg:flex-shrink-0 lg:flex-col lg:justify-between lg:p-12">
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
            stroke="#0a2540"
            strokeWidth="1"
            fill="none"
          />
        ))}
      </svg>

      {/* ── Clustered-circles motif — placeholder for the future Icons8 illustration ── */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <svg viewBox="0 0 320 320" className="h-[420px] w-[420px]">
          <circle cx="130" cy="140" r="70" fill="#00ab00" fillOpacity="0.08" stroke="#00ab00" strokeOpacity="0.25" strokeWidth="1" />
          <circle cx="205" cy="150" r="55" fill="#0a2540" fillOpacity="0.06" stroke="#0a2540" strokeOpacity="0.18" strokeWidth="1" />
          <circle cx="165" cy="215" r="48" fill="#00ab00" fillOpacity="0.06" stroke="#00ab00" strokeOpacity="0.2" strokeWidth="1" />
          <circle cx="130" cy="140" r="6" fill="#00ab00" />
          <circle cx="205" cy="150" r="5" fill="#0a2540" />
          <circle cx="165" cy="215" r="5" fill="#00ab00" />
        </svg>
      </div>

      <div className="relative z-10 flex items-center gap-2 text-navy/60">
        <MapPinned className="h-4 w-4" />
        <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Country Operations</span>
      </div>

      <div className="relative z-10 max-w-md">
        <h2 className="text-3xl font-black leading-tight tracking-tight text-navy lg:text-4xl">
          The people behind every verified chama.
        </h2>
        <p className="mt-4 text-sm font-medium leading-relaxed text-slate-500">
          Digitizing Africa&apos;s oldest savings tradition, one verified group at a time — KYC review,
          group approvals, and trust account reconciliation in one place.
        </p>

        <div className="mt-8 flex gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-navy/10 bg-white/60 px-4 py-2.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">KYC Reviewed</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-navy/10 bg-white/60 px-4 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Reconciled Daily</span>
          </div>
        </div>
      </div>
    </div>
  )
}
