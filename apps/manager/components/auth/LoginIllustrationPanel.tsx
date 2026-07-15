/**
 * Left panel of the split-screen auth layout (login/register/forgot-password).
 *
 * Real photography instead of abstract shapes + copy. coops-bg.jpg is an
 * existing curated shot (frontend/public/images/categories/) — a real
 * savings/farming cooperative at work, which fits Manager's actual job
 * (country-level group verification) better than a generic community photo.
 * A navy/green gradient overlay ties it to the brand palette. No text on
 * this side by design — the form panel carries all the messaging.
 *
 * A Lottie animation (verification.lottie, ID Card & Face Scan) was tried
 * here first, per the "different image or lottie" ask — but that specific
 * asset's actual artwork is icon-scale (a small centered glyph) no matter
 * the layout/fit settings, so it read as a stray dot at this panel's size.
 * LottieFiles' search API (needed to find a better full-scene animation)
 * returns 403 — same auth wall as Magnific. Swap back to a Lottie once
 * that's sorted and a better-suited animation is found.
 */
export function LoginIllustrationPanel() {
  return (
    <div className="relative hidden w-full overflow-hidden lg:flex lg:w-[42%] lg:flex-shrink-0 lg:self-stretch">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/login-hero.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/20 to-transparent" />
      <div className="absolute inset-0 bg-primary/10 mix-blend-multiply" />
    </div>
  )
}
