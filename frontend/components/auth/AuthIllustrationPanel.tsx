import type { ReactNode } from "react"

/**
 * Left panel of the split-card auth layout (login / register / forgot-password),
 * matching the treatment already shipped on the Console and Manager portals.
 *
 * Deliberately NO photography: the previous panel used a stock photo with
 * clearly identifiable faces. This one uses the brand-recolored unDraw
 * vectors from /public/illustrations (open license, no attribution, no real
 * people) over a soft brand-tinted gradient.
 */
export function AuthIllustrationPanel({
  illustration,
  eyebrow = "Chama · Sacco · Tontine",
  headline = (
    <>
      Digitizing Africa&apos;s oldest <span className="text-primary">savings tradition</span>.
    </>
  ),
  caption = "Rotation payouts, mandatory savings, and group loans — coordinated on one transparent ledger your whole group can trust.",
}: {
  illustration: string
  eyebrow?: string
  headline?: ReactNode
  caption?: string
}) {
  return (
    <div className="relative hidden overflow-hidden lg:flex lg:w-[45%] lg:flex-shrink-0 lg:self-stretch">
      <div className="absolute inset-0 bg-gradient-to-br from-[#e9f3ed] via-[#f4faf5] to-white" />
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-[#0a2540]/5 blur-3xl" />

      <div className="relative flex w-full flex-col justify-between p-10 xl:p-12">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
          <h2 className="mt-3 max-w-md text-3xl font-bold leading-[1.15] tracking-tight text-navy xl:text-4xl">
            {headline}
          </h2>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={illustration} alt="" className="mx-auto my-8 h-52 w-auto max-w-full xl:h-64" loading="lazy" />

        <div>
          <p className="max-w-md text-sm font-medium leading-6 text-slate-600">{caption}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Bank-held trust accounts", "M-Pesa · MoMo · Bank", "KYC-verified groups"].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-primary/20 bg-white/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-navy"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
