import { loadGsap } from "./loader.ts";

/** Subtle scroll parallax on transform only. data-motion="parallax" data-motion-speed="0.15". */
export async function init(root: ParentNode = document): Promise<() => void> {
  const els = [
    ...root.querySelectorAll<HTMLElement>('[data-motion="parallax"]'),
  ];
  if (els.length === 0) return () => {};

  const gsap = await loadGsap("ScrollTrigger");
  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    for (const el of els) {
      const speed = Number(el.dataset["motionSpeed"] ?? 0.15);
      gsap.fromTo(
        el,
        { yPercent: -speed * 100 },
        {
          yPercent: speed * 100,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    }
  });

  return () => mm.revert();
}
