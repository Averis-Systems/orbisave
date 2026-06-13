/**
 * Central GSAP plugin registration.
 * Import from here instead of calling gsap.registerPlugin() in each component.
 * GSAP deduplicates registrations internally, but centralising avoids noise.
 */
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { TextPlugin } from "gsap/TextPlugin"
import { MotionPathPlugin } from "gsap/MotionPathPlugin"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, TextPlugin, MotionPathPlugin, ScrollToPlugin)
}

export { gsap, ScrollTrigger, TextPlugin, MotionPathPlugin, ScrollToPlugin }
