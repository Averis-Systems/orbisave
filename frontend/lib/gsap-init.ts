/**
 * Central GSAP plugin registration.
 * Import from here instead of calling gsap.registerPlugin() in each component.
 * GSAP deduplicates registrations internally, but centralising avoids noise.
 */
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { TextPlugin } from "gsap/TextPlugin"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, TextPlugin)
}

export { gsap, ScrollTrigger, TextPlugin }
