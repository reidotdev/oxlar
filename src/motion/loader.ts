import type gsapType from "gsap";

export type GsapPlugin = "ScrollTrigger" | "SplitText" | "Flip";

type Gsap = typeof gsapType;

let core: Promise<Gsap> | undefined;
const registered = new Set<GsapPlugin>();

const plugins: Record<GsapPlugin, () => Promise<object>> = {
  ScrollTrigger: () =>
    import("gsap/ScrollTrigger").then((m) => m.ScrollTrigger),
  SplitText: () => import("gsap/SplitText").then((m) => m.SplitText),
  Flip: () => import("gsap/Flip").then((m) => m.Flip),
};

type Plugins = {
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
  SplitText: typeof import("gsap/SplitText").SplitText;
  Flip: typeof import("gsap/Flip").Flip;
};

/** A registered plugin's own export, for plugins with a JS API (SplitText.create, Flip.from). */
export async function loadPlugin<K extends GsapPlugin>(
  name: K,
): Promise<Plugins[K]> {
  await loadGsap(name);
  return (await plugins[name]()) as Plugins[K];
}

/**
 * Dynamically imports gsap (once) and registers the requested plugins (once).
 * GSAP is never imported statically anywhere else, so a page that never calls
 * this ships none of it.
 */
export async function loadGsap(...wanted: GsapPlugin[]): Promise<Gsap> {
  core ??= import("gsap").then((m) => m.gsap);
  const gsap = await core;
  for (const name of wanted) {
    if (registered.has(name)) continue;
    gsap.registerPlugin(await plugins[name]());
    registered.add(name);
  }
  return gsap;
}
