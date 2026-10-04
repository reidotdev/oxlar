/**
 * Motion registry. Scans the DOM for data-motion="<pattern>" and runs the
 * matching module. Every module is a dynamic import, so GSAP is fetched only
 * when an element asks for it. This file itself only ships on pages that
 * include <Motion /> (Reveal does), so a page with no animation ships nothing.
 *
 * Elements near the viewport load immediately (after idle); the rest wait for
 * an IntersectionObserver with a generous margin. Nothing blocks first render.
 */
interface MotionModule {
  init(root?: ParentNode): Promise<() => void> | (() => void);
}

const patterns: Record<string, () => Promise<MotionModule>> = {
  reveal: () => import("./reveal.ts"),
  parallax: () => import("./parallax.ts"),
  "split-text": () => import("./split-text.ts"),
};

let cleanups: Array<() => void> = [];

const idle = (fn: () => void) =>
  "requestIdleCallback" in window
    ? requestIdleCallback(fn, { timeout: 1500 })
    : setTimeout(fn, 200);

function start(root: ParentNode = document) {
  const wanted = new Map<string, HTMLElement[]>();
  root.querySelectorAll<HTMLElement>("[data-motion]").forEach((el) => {
    const kind = el.dataset["motion"] ?? "";
    wanted.set(kind, [...(wanted.get(kind) ?? []), el]);
  });

  for (const [kind, els] of wanted) {
    const load = patterns[kind];
    if (!load) {
      console.warn(`[motion] Unknown data-motion="${kind}"`);
      els.forEach((el) => el.setAttribute("data-motion-ready", ""));
      continue;
    }
    let started = false;
    const run = () => {
      if (started) return;
      started = true;
      observer.disconnect();
      load()
        .then((mod) => mod.init(root))
        .then((cleanup) => cleanups.push(cleanup))
        .catch((error) => {
          // Never leave content hidden because an animation failed to load.
          console.error(`[motion] ${kind} failed`, error);
          els.forEach((el) => el.setAttribute("data-motion-ready", ""));
        });
    };
    const observer = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && run(),
      {
        rootMargin: "200px 0px",
      },
    );
    els.forEach((el) => observer.observe(el));
    // Anything already in view loads after idle; the rest on approach.
    idle(() => {
      if (els.some((el) => el.getBoundingClientRect().top < innerHeight + 200))
        run();
    });
  }
}

function stop() {
  cleanups.forEach((fn) => fn());
  cleanups = [];
}

start();

// Forward compatibility with <ClientRouter />: re-init per page, clean up before swap.
document.addEventListener("astro:before-swap", stop);
document.addEventListener("astro:page-load", () => {
  if (cleanups.length === 0) start();
});
