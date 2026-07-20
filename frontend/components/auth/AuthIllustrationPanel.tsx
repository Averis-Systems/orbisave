import Link from "next/link"

/**
 * Left panel of the split-card auth layout (login / register / forgot-password),
 * matching the treatment already shipped on the Console and Manager portals.
 *
 * Deliberately NO photography: uses the brand-recolored unDraw vectors from
 * /public/illustrations (open license, no attribution, no real people) over
 * a soft brand-tinted gradient. The logo lives up here (the form column
 * shows it only on small screens where this panel is hidden), followed by
 * the brand tagline: no other copy, per design feedback.
 */
export function AuthIllustrationPanel({ illustration }: { illustration: string }) {
  return (
    <div className="relative hidden overflow-hidden lg:flex lg:w-[45%] lg:flex-shrink-0 lg:self-stretch">
      <div className="absolute inset-0 bg-gradient-to-br from-[#e9f3ed] via-[#f4faf5] to-white" />
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-navy/5 blur-3xl" />

      <div className="relative flex w-full flex-col p-10 xl:p-12">
        <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-navy">
          <span className="flex h-8 w-8 items-center justify-center rounded bg-primary text-sm text-white">O</span>
          OrbiSave
        </Link>

        <h2 className="mt-8 max-w-md text-3xl font-bold leading-[1.15] tracking-tight text-navy xl:text-4xl">
          Digitizing Africa&apos;s oldest <span className="text-primary">savings tradition</span>.
        </h2>

        <div className="flex flex-1 items-center justify-center py-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={illustration} alt="" className="h-56 w-auto max-w-full xl:h-64" loading="lazy" />
        </div>
      </div>
    </div>
  )
}
