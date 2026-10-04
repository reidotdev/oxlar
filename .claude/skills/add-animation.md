---
name: add-animation
description: Add a GSAP animation pattern to oxlar's motion registry, or use an existing one on an element. Use for scroll choreography, text splitting, parallax or orchestrated sequences; simple hover and fade effects belong in CSS.
---

# Add an animation

## Pick the tool

| Effect                                                      | Use                                                        |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| hover, focus, fade, small transitions, dialog/popover entry | CSS (`transition`, `@starting-style`)                      |
| page-to-page transitions                                    | cross-document View Transitions (already on in `base.css`) |
| scroll choreography, timelines, text splitting, sequences   | GSAP via `src/motion/`                                     |

## Use an existing pattern

Add `data-motion="reveal" | "parallax" | "split-text"` to an element, or use `<Reveal>` (which also loads the registry). Raw `data-motion` attributes need `<Motion />` on the page. `pnpm perf:size` fails when a page has `data-motion` and no registry, or the reverse.

## Add a new pattern

1. `src/motion/<pattern>.ts` exporting `init(root)` that returns a **cleanup** function:

   ```ts
   import { loadGsap } from "./loader.ts";

   export async function init(
     root: ParentNode = document,
   ): Promise<() => void> {
     const els = [
       ...root.querySelectorAll<HTMLElement>('[data-motion="<pattern>"]'),
     ];
     if (els.length === 0) return () => {};
     const gsap = await loadGsap("ScrollTrigger");
     const mm = gsap.matchMedia();
     mm.add("(prefers-reduced-motion: no-preference)", () => {
       // animate transform and opacity only
     });
     for (const el of els) el.setAttribute("data-motion-ready", "");
     return () => mm.revert();
   }
   ```

2. Register it in `src/motion/index.ts` (`patterns`).
3. If it starts hidden, add the hidden state to `src/styles/base.css` under `html.js` and inside `prefers-reduced-motion: no-preference`, covered by the failsafe animation. Lift it (`data-motion-ready`) in the same task you create the tween so there is no flash.
4. Import GSAP only through `loadGsap` / `loadPlugin` in `loader.ts`. GSAP core and every plugin (ScrollTrigger, SplitText, Flip, ...) come from the single `gsap` package; add a plugin by extending `plugins` in the loader. Check the current GSAP license terms before shipping to a client (see `docs/architecture.md`).

## Rules

- Animate `transform` and `opacity` only. No layout properties.
- **Never** animate the hero or any LCP element in from hidden.
- Remove `will-change` when done. Kill ScrollTriggers and timelines in cleanup. Respect reduced motion with `gsap.matchMedia()`.
- Keep durations, eases and triggers explicit so a change is a visible diff.

## Check

`pnpm test` (motion spec: hidden state applies first, failsafe, reduced motion, lazy load) and `pnpm perf:size`. A page without `data-motion` must stay at 0 KB JS.
