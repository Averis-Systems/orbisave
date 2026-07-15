/**
 * Left panel of the split-screen auth layout (login/register/forgot-password).
 *
 * Real photography instead of abstract shapes + copy — a curated shot
 * already used elsewhere in the product (frontend/public/images/categories/
 * women-bg.jpg, paired with "Digitizing Africa's oldest savings tradition"
 * in AuthImage.tsx), not a stock placeholder. A navy/green gradient overlay
 * ties it to the brand palette. No text on this side by design — the form
 * panel carries all the messaging.
 *
 * Follow-up: swap for a Magnific-generated image once OAuth is set up
 * (registered as the `magnific` MCP server — needs a sign-in step this
 * session can't complete non-interactively).
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
