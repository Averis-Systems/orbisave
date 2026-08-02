# OrbiSave — Marketing & Landing Experience Brief

A living guide for the public-facing site (home + outside pages). This is what
someone sees before they sign in: a prospective member deciding whether to trust
us with their group's money, or an investor / bank partner sizing up the
company. It is not the product dashboard and it is not written for developers.

Owner: Emanuel. Status: Draft v1 (2026-08-02). Append as decisions land; do not
delete, mark items done with a date.

---

## 0. How we build UI here (standing rule)

Every UI task on this site combines two things, every time:

1. **`ui-ux-pro-max` skill** for the design system, layout, motion and a11y rules.
2. **21st.dev MCP** (`https://21st.dev/api/mcp`) for best-in-class, out-of-the-box
   components and animation building blocks. *Not yet connected in this
   workspace, authorize it via claude.ai connectors or `claude mcp` before the
   build phase.*

OrbiSave is a **system**, not a brochure website. It should feel alive: content
reveals section to section, motion has meaning, and components look bought-in,
not boilerplate. Pair real photography with **vectors and Lottie** (LottieFiles
free tier, per our licensing rule, never Icons8) so no section is a wall of
stock images.

Guardrails that still apply on marketing pages:
- **No fabricated proof.** No invented testimonials, logos, user counts or
  metrics. Use real numbers, real partners (e.g. the Absa relationship once
  contractual), or clearly-labelled illustrative examples. This is the honest-
  data rule, and it matters more here than anywhere.
- Brand: green `#00ab00`, navy `#0a2540`. No em dashes in copy. Spacing and
  type follow the scale in §6.

---

## 1. Where the site is today (honest assessment)

The bones exist but the house is half-built.

| Area | Current state | Problem |
|------|---------------|---------|
| Home hero | Hand-coded SVG "orbital" savings animation + GSAP. Decent idea. | Bespoke SVG is hard to evolve; reads as a demo, not a product shot. |
| Home body | Only `TrustBelt`, `HowItWorks`, `CtaSection`, `Footer` render. | `WhyChooseUs`, `WhoCanJoin`, `NarrativeHook`, `RotationVisualizer`, `LoanPool`, `InputFinancingTeaser`, `AfricaMap` are **built but commented out** in `app/page.tsx`. The story is missing its middle. |
| Narrative | Farmer-only: "harvest", "notebooks or cash-in-a-box". | Excludes the other audiences we now serve (corporates, teachers, students). Feels niche. |
| "Who it's for" | Not shown on the home page. | A visitor cannot self-identify ("this is for people like me"). |
| Comparison | None on the page. | No answer to "why not my notebook / WhatsApp group / SACCO / another app?" |
| Proof / credibility | Thin. | No security story, no partner/regulatory framing, no case study. |
| Rhythm & spacing | Inconsistent section gaps, single background tone. | Reads flat; no section-to-section pacing. |
| Imagery | Almost none beyond the SVG and lucide icons. | No human faces, no place, no product screens. |
| Outside pages | `about`, `fees`, `security`, `grants`, `how-loaning-works`, `input-financing`, `kyc-policy`, `terms`, `privacy`, `support` exist. | Coverage is decent but uneven in polish; no per-audience pages; no investor/partner page. |

Net: **the content is not ready to pitch to users or investors.** The fix is
mostly assembly + rewrite + polish, not greenfield, because many components
already exist.

---

## 2. What OrbiSave is (the one-liner and the paragraph)

- **Tagline:** "Digitizing Africa's oldest savings tradition."
- **One-liner:** OrbiSave takes the group savings people already do (chama,
  table banking, merry-go-round, staff welfare) and puts it safely on their
  phone, with clear records, fair payout rotation, and a path to group loans and
  bank credit.
- **Paragraph (plain language):** Groups have always saved together. The problem
  has never been the habit, it has been the notebook, the cash box, the one
  person who "keeps the money", and the arguments about who paid what. OrbiSave
  keeps the money in a real bank trust account, records every contribution
  automatically, shows every member the same live ledger, and manages whose turn
  it is to be paid. When a group is ready, members can borrow from their own
  pool, and the group builds a track record banks can lend against.

Why it exists: trust and record-keeping are the two things that break informal
savings. We fix both, without asking people to abandon how they already save.

---

## 3. Who it is built for (audience model)

The narrative must widen from farmers to "any group that saves together". Lead
with a self-select grid so visitors find themselves in one tap.

| Segment | Who they are | What breaks today | How OrbiSave serves them |
|---------|--------------|-------------------|--------------------------|
| Smallholder farmers & agri co-ops | Seasonal income around harvest | Cash sits unsafe; no records; hard to access inputs on credit | Save when harvest pays, input financing, group credit history |
| Workplace & corporate groups | Colleagues, staff welfare, SACCO chapters | Manual collections, spreadsheet errors, trust gaps | Payroll-cycle saving, transparent ledger, emergency loans |
| Teachers & civil servants | Stable monthly income, active chama culture | Treasurer burden, disputes, slow payouts | Automated rotation, clear records, investment discipline |
| University & college students | Small, frequent saving; project funds | No tools built for tiny amounts; peer-lending is informal | Low-friction saving, group project pools, first credit footprint |
| Faith & community groups | Churches, mosques, women's groups, welfare | Welfare funds tracked by hand | Contribution tracking, welfare payouts, accountability |
| Investment clubs | Pooled investing groups | Reconciliation and payout fairness | Shared ledger, rotation, auditable history |

Design note: each segment gets a card in the "Who is it for" section, and the
highest-value 3 to 4 get a dedicated use-case page (see §5). Copy per segment
speaks their language and their numbers, not a generic pitch.

---

## 4. Landing page, section by section (target IA)

Story order, top to bottom. Each section lists purpose, content, and the build
approach (component source + motion). Reuse existing components where noted;
upgrade rather than rebuild.

1. **Sticky navbar** — reuse `Navbar`. Add an audience mega-item ("Who it's
   for") and a clear "Sign in" + primary "Start a group". Solid-on-scroll.

2. **Hero** — purpose: say what it is + who for in 5 seconds, one primary action.
   Keep the orbital motion idea but present it as a *product moment* (phone frame
   showing the live ledger + rotation), not a lone SVG. Headline broadens beyond
   farming. Two CTAs: "Start a group" / "Join with code". Motion: staggered text
   reveal, subtle parallax on the product frame. Source: 21st.dev hero + device
   mockup; Lottie for the "money moves to the vault" beat if it beats hand-SVG.

3. **Trust belt** — reuse `TrustBelt`. Real signals only: bank-grade custody,
   country coverage (KE/RW/GH), encryption, regulatory posture. If we cannot
   name a partner yet, use capability statements, not fake logos.

4. **Narrative hook** — reuse `NarrativeHook`. The notebook-and-cash-box problem,
   told warmly, now audience-neutral (a group, not only a farm). Motion: scroll-
   triggered reveal; a simple before/after vector.

5. **Who is it for** — reuse/upgrade `WhoCanJoin`. The §3 grid as cards with a
   vector per segment and one honest line each. This is the "someone like me"
   moment. Motion: staggered card entrance on scroll.

6. **How it works** — reuse `HowItWorks`. 3 to 4 steps (Create or join → Save
   together → Track the live ledger → Rotate payouts / borrow). Use Lottie or
   clean vectors per step, not icons alone.

7. **Rotation visualizer** — reuse `RotationVisualizer`. This is our signature
   idea, make it the interactive centerpiece: show contributions flowing in and
   a payout going out, tied to scroll or a small play control.

8. **Why OrbiSave (comparison)** — reuse/upgrade `WhyChooseUs` and add the
   **comparison table** in §7 below. Highlight the OrbiSave column in brand
   green with checkmarks. This directly answers "why not what I already use".

9. **Loans / pool** — reuse `LoanPool`. How a group lends to itself from its
   pool, and how that builds a record banks can lend against. Link to
   `how-loaning-works`.

10. **Input financing teaser** (agri) — reuse `InputFinancingTeaser`. Kept as a
    segment-specific band, not the whole story.

11. **Coverage / Africa map** — reuse `AfricaMap`. Where we operate; the
    "oldest savings tradition, now digital" framing.

12. **Proof** — testimonials (real, with name + role + segment + photo once we
    have them) and/or a single credible case study. Placeholder clearly until
    real. Never fabricate.

13. **Security & trust deep link** — a compact band summarizing the security
    story with a link to `/security`. Bank custody, encryption, your money is
    ring-fenced from ours.

14. **FAQ** — the real objections: Is my money safe? What are the fees? What if
    someone doesn't pay? Can we get a loan? What happens if OrbiSave disappears?

15. **Final CTA** — reuse `CtaSection`. One decision: start or join. Strong,
    calm, not shouty.

16. **Footer** — reuse `Footer`. Complete: product, company, legal, contact,
    country selector, socials.

Investor/partner note: an investor reading top to bottom should absorb market
(who + coverage), product (how + rotation + loans), moat (comparison + trust +
bank path), and traction (proof). We do not need a separate investor page for
v1, but see §5 for a partners page.

---

## 5. Pages inventory (what exists, what to add)

**Keep & polish:** `/` (home), `/about`, `/fees`, `/security`,
`/how-loaning-works`, `/input-financing`, `/grants`, `/kyc-policy`, `/terms`,
`/privacy`, `/support`.

**Add:**
- **Use-case pages** for the top segments, e.g. `/for-farmers`, `/for-teams`
  (workplace/corporate), `/for-teachers`, `/for-students`. Same skeleton,
  segment-specific hero, numbers, testimonial, CTA.
- **Partners / banks page** (`/partners`) — the custody + revenue-share story for
  bank partners, and a "become a partner" contact. Ties to the Absa direction.
- **Company / trust page or richer `/about`** — mission, the team, why we exist,
  what "digitizing the oldest savings tradition" means. Investor-legible.

**Decide:** `home2` and `landing-v2` appear to be alternates. Pick one direction
and delete the dead one to kill confusion (mirrors the payments/new cleanup).

---

## 6. Design system for the marketing site

- **Color:** brand green `#00ab00` for primary action + the OrbiSave column/
  highlights; navy `#0a2540` for headings and dark sections; warm neutral
  backgrounds (`#f7f9f8` already in use) alternated with white and one navy
  section for rhythm. Green is an accent, not a fill everywhere.
- **Type:** keep the brand font for body; consider a warm display face for hero
  headlines (ui-ux-pro-max suggests a Calistoga/Inter pairing for fintech-with-
  warmth). Type scale: 14 / 16 / 18 / 20 / 24 / 32 / 44 / 64. Body 16-18,
  line-height 1.6, measure 60-75 chars.
- **Spacing & rhythm:** generous section padding (desktop 96-128px vertical,
  mobile 56-72px). Consistent max-width container (`max-w-7xl`). Alternate
  background tone every other section so the eye gets a beat. This alone fixes
  most of the "flat" feeling.
- **Imagery:** three layers, used together, never one alone:
  1. Real photography (people/groups/place) for emotional sections.
  2. Vectors/illustration for concepts (how-it-works, comparison).
  3. Lottie for the 1-2 hero/step moments that benefit from loop motion
     (LottieFiles free tier; keep files small, respect reduced-motion).
- **Motion (ui-ux-pro-max, motion tier ~7):** section reveals on scroll
  (fade + 20-28px rise, 200-300ms, ease-out, staggered), light parallax on hero
  product frame (scrub, 3-4 layers max, clipped), the rotation visualizer tied
  to scroll or a control. Respect `prefers-reduced-motion` everywhere. Exit
  faster than enter. No animation for decoration only.
- **Components:** source from 21st.dev (hero, feature grid, comparison table,
  testimonial, FAQ accordion, pricing/fees, footer), then restyle to brand.
  Do not hand-roll what a vetted component already does well.
- **Accessibility:** WCAG AA contrast (green on white passes for large/bold;
  verify small text), visible focus, keyboard-navigable nav + FAQ, alt text on
  all imagery, color never the only signal in the comparison table (use
  check/cross icons + labels).

---

## 7. Comparison table (draft content)

Factual, not disparaging. Highlight the OrbiSave column in green with check
icons; use check / partial / cross with text labels (not color alone).

| What matters | Notebook & cash box | WhatsApp group + spreadsheet | Traditional SACCO / bank | Generic savings app | **OrbiSave** |
|---|---|---|---|---|---|
| Money held safely (bank custody) | No | No | Yes | Sometimes | **Yes, ring-fenced trust account** |
| Automatic, tamper-evident records | No | Manual | Yes | Partial | **Yes, live shared ledger** |
| Every member sees the same records | No | No | Limited | Rarely | **Yes** |
| Fair payout rotation tracked | Manual | Manual | N/A | No | **Yes, by join order + contribution** |
| Group can lend from its own pool | Informal | Informal | Via SACCO rules | No | **Yes** |
| Builds a record banks can lend against | No | No | Some | No | **Yes** |
| Works on any phone, small amounts | Yes | Yes | Branch-bound | Yes | **Yes** |
| Multi-country / currency | No | No | Country-bound | Varies | **Yes, KE / RW / GH** |
| Built for how groups already save | Yes | Partly | No | No | **Yes** |

Row copy should be verified against real product capability before publishing.
Do not claim what is not shipped.

---

## 8. Proof & credibility plan

- **Security:** ring-fenced bank trust custody, encryption at rest, httpOnly
  token model, append-only ledger. Turn our real architecture into plain-
  language trust points on `/security` and a home band.
- **Partners:** once the Absa relationship is contractual, feature it (with
  permission). Until then, describe the capability ("we hold funds in partner-
  bank trust accounts") without a fake logo.
- **Testimonials / case study:** collect from a real pilot group. One strong,
  attributable story beats five invented ones. Placeholder must read as
  placeholder.
- **Numbers:** only publish metrics we can stand behind. If we have none yet,
  lead with capability and the tradition/market story instead of vanity stats.

---

## 9. Execution phases

- **Phase 0 (this doc):** assessment + plan agreed. Connect 21st.dev MCP.
- **Phase 1 — Assemble the home story:** render the built-but-hidden sections in
  the right order (§4), fix spacing/rhythm, alternate backgrounds. Immediate
  lift with low risk.
- **Phase 2 — Rewrite for all audiences:** broaden hero + narrative copy; build
  the "Who is it for" grid; add the comparison table.
- **Phase 3 — Elevate visuals & motion:** bring in 21st.dev components, real/
  placeholder photography, vectors, Lottie; scroll-reveal system; polish the
  rotation visualizer.
- **Phase 4 — Segment & partner pages:** `/for-*` use-case pages, `/partners`,
  richer `/about`. Delete the dead `home2` / `landing-v2` direction.
- **Phase 5 — Proof & polish:** real testimonials/case study, FAQ, security band,
  full a11y + responsive + reduced-motion pass, performance (image formats,
  lazy-load, Lottie budget).

Each phase is browser-verified section by section before moving on.

---

## 10. Definition of done

- A first-time visitor from any of our segments can say, within one screen, what
  OrbiSave is and that it is for them.
- The page answers "why not my notebook / WhatsApp / SACCO / another app" with a
  clear comparison.
- An investor reading top to bottom gets market, product, moat, and (real)
  traction without a deck.
- It looks like a funded product, not a template: intentional spacing, layered
  imagery, meaningful section-to-section motion, consistent brand.
- Accessible (WCAG AA), responsive (375 / 768 / 1024 / 1440), reduced-motion
  safe, and fast.
- No fabricated proof anywhere.

---

## 11. Open questions for Emanuel

1. Primary conversion goal for v1: member sign-ups, or a mix of members +
   partner/investor interest? (Shapes hero + whether we add `/partners` now.)
2. Which 3 to 4 segments get dedicated use-case pages first?
3. Do we have a real pilot group or partner we can quote/feature yet, or do we
   build with clearly-labelled placeholders?
4. Keep the bespoke orbital hero, or move to a product-frame + Lottie hero?
5. `home2` vs `landing-v2` vs current `/` — which is the canonical direction to
   keep?
