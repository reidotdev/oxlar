import { loadGsap } from "./loader.ts";

/**
 * Scroll-triggered fade and rise. Ported from BMT-214A's <Reveal>:
 * opacity 0 and y 24 to rest, 0.8 s, power3.out, start "top 85%", once.
 * Attributes: data-motion="reveal" data-motion-delay="0.2" data-motion-y="24".
 */
export async function init(root: ParentNode = document): Promise<() => void> {
  const els = [...root.querySelectorAll<HTMLElement>('[data-motion="reveal"]')];
  if (els.length === 0) return () => {};

  const gsap = await loadGsap("ScrollTrigger");
  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    for (const el of els) {
      // Lifting the CSS hidden state and starting the tween happen in the same
      // task, so there is no frame where the element is visible.
      el.setAttribute("data-motion-ready", "");
      gsap.from(el, {
        opacity: 0,
        y: Number(el.dataset["motionY"] ?? 24),
        duration: 0.8,
        delay: Number(el.dataset["motionDelay"] ?? 0),
        ease: "power3.out",
        clearProps: "opacity,transform,willChange",
        onStart: () => void (el.style.willChange = "transform, opacity"),
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
    }
  });

  // Reduced motion: nothing animates and the CSS hidden state never applies.
  for (const el of els) el.setAttribute("data-motion-ready", "");

  return () => mm.revert();
}
