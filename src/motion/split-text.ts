import { loadGsap } from "./loader.ts";

/**
 * Headline line-by-line rise using SplitText. data-motion="split-text".
 * The text stays in the DOM and readable: SplitText keeps an aria-label.
 */
export async function init(root: ParentNode = document): Promise<() => void> {
  const els = [
    ...root.querySelectorAll<HTMLElement>('[data-motion="split-text"]'),
  ];
  if (els.length === 0) return () => {};

  const gsap = await loadGsap("ScrollTrigger", "SplitText");
  const { SplitText } = await import("gsap/SplitText");
  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const splits: InstanceType<typeof SplitText>[] = [];
    for (const el of els) {
      const split = SplitText.create(el, {
        type: "lines",
        mask: "lines",
        aria: "auto",
      });
      splits.push(split);
      gsap.from(split.lines, {
        yPercent: 100,
        duration: 0.8,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
    }
    return () => splits.forEach((s) => s.revert());
  });

  for (const el of els) el.setAttribute("data-motion-ready", "");
  return () => mm.revert();
}
