/**
 * Template invariants: the things that break silently.
 *
 *   pnpm verify:template
 *
 * Node built-ins only, so it runs before `pnpm install`. Every check names the
 * failure it prevents. CI runs it first; `pnpm scaffold` runs it last.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

const root = process.cwd();
const failures: { name: string; problem: string }[] = [];
const checks: { name: string; ok: boolean }[] = [];

function check(name: string, fn: () => string | null | undefined) {
  try {
    const problem = fn();
    if (problem) failures.push({ name, problem });
    checks.push({ name, ok: !problem });
  } catch (error) {
    failures.push({ name, problem: (error as Error).message });
    checks.push({ name, ok: false });
  }
}

const read = (path: string) => readFileSync(join(root, path), "utf8");
const pkg = JSON.parse(read("package.json")) as {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function walk(
  dir: string,
  filter: (path: string) => boolean = () => true,
): string[] {
  const out: string[] = [];
  const abs = join(root, dir);
  if (!existsSync(abs)) return out;
  for (const entry of readdirSync(abs)) {
    const rel = join(dir, entry);
    if (statSync(join(root, rel)).isDirectory()) out.push(...walk(rel, filter));
    else if (filter(rel)) out.push(rel);
  }
  return out;
}

const posix = (p: string) => p.split(sep).join("/");
const srcFiles = walk("src", (p) => /\.(astro|ts|css|js|mjs)$/.test(p));
const code = srcFiles.filter((p) => !p.endsWith(".css"));
const OPTIONAL_REACT = existsSync(join(root, "src/islands/react"));

check("static output, no adapter", () => {
  const config = read("astro.config.mjs");
  if (!/output:\s*["']static["']/.test(config))
    return "astro.config.mjs must set output: 'static'. The main site has no SSR.";
  if (/adapter\s*:/.test(config))
    return "astro.config.mjs sets an adapter. The base template is fully static and host-agnostic.";
  return null;
});

check("no React, Tailwind or UI libraries in the base template", () => {
  const banned = [
    "react",
    "react-dom",
    "@gsap/react",
    "react-aria-components",
    "tailwindcss",
    "@tailwindcss/postcss",
    "@tailwindcss/vite",
    "lucide-react",
    "storybook",
    "clsx",
    "tailwind-merge",
  ];
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const found = banned.filter(
    (name) => name in deps && !(OPTIONAL_REACT && name.includes("react")),
  );
  if (found.length)
    return `Banned package(s) in package.json: ${found.join(", ")}. Ask the owner before adding dependencies.`;
  const imports = code.filter((p) =>
    /from\s+["'](react|react-dom|tailwindcss|react-aria-components|lucide-react)/.test(
      readFileSync(join(root, p), "utf8"),
    ),
  );
  const bad = imports.filter(
    (p) => !(OPTIONAL_REACT && posix(p).startsWith("src/islands/react")),
  );
  return bad.length ? `React or Tailwind imports in: ${bad.join(", ")}` : null;
});

check("no raw colours outside tokens.css and brand-colors.ts", () => {
  const raw =
    /(#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\()/;
  const allowed = new Set(["src/styles/tokens.css", "src/lib/brand-colors.ts"]);
  const offenders = srcFiles.filter((p) => {
    if (allowed.has(posix(p))) return false;
    // Strip comments and `href="#anchor"` style fragments before matching.
    const text = readFileSync(join(root, p), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\bhref=["']#[^"']*["']/g, "");
    return raw.test(text);
  });
  return offenders.length
    ? `Raw colour literals in: ${offenders.join(", ")}. Use a token from src/styles/tokens.css (or add one).`
    : null;
});

check("no inline style attributes", () => {
  const offenders = srcFiles.filter((p) =>
    /\sstyle=["'{]/.test(
      readFileSync(join(root, p), "utf8").replace(/<!--[\s\S]*?-->/g, ""),
    ),
  );
  return offenders.length
    ? `Inline style attributes in: ${offenders.join(", ")}. The strict CSP forbids them; use tokens and scoped CSS.`
    : null;
});

check("no localStorage or sessionStorage", () => {
  const offenders = code.filter((p) =>
    /\b(localStorage|sessionStorage)\b/.test(
      readFileSync(join(root, p), "utf8"),
    ),
  );
  return offenders.length
    ? `Browser storage used in: ${offenders.join(", ")}. The template keeps no per-user state.`
    : null;
});

check("no analytics or third-party scripts", () => {
  const pattern =
    /(google-analytics|googletagmanager|gtag\(|plausible\.io|segment\.com|posthog|hotjar|mixpanel|fullstory|clarity\.ms|umami|fathom|connect\.facebook)/i;
  const offenders = [...srcFiles, "public/_headers", "astro.config.mjs"].filter(
    (p) => existsSync(join(root, p)) && pattern.test(read(p)),
  );
  if (offenders.length)
    return `Analytics-like references in: ${offenders.join(", ")}.`;
  const external = srcFiles.filter((p) =>
    /<script[^>]+src=["']https?:/.test(read(p)),
  );
  return external.length
    ? `External <script src> in: ${external.join(", ")}.`
    : null;
});

/**
 * A component's <script> may only import from islands/ or motion/. Any depth
 * of `../` is fine: a component in a subfolder (src/components/sections/)
 * needs `../../islands/`. Nothing else may follow the import.
 */
const CLIENT_IMPORT =
  /^import\s+["'](?:\.\.\/)+(?:islands|motion)\/[^"']+["'];?$/;

check("the client-import rule accepts nested paths and nothing else", () => {
  const pass = [
    'import "../islands/menu.ts";',
    'import "../../islands/menu.ts";',
    "import '../../../motion/index.ts'",
  ];
  const fail = [
    'import "./islands/menu.ts";',
    'import "../lib/site.ts";',
    'import { x } from "../islands/menu.ts";',
    'import "../islands/menu.ts"; document.body.remove();',
    "document.body.remove();",
  ];
  const wrong = [
    ...pass.filter((l) => !CLIENT_IMPORT.test(l)),
    ...fail.filter((l) => CLIENT_IMPORT.test(l)),
  ];
  return wrong.length
    ? `CLIENT_IMPORT misclassifies: ${wrong.join(" | ")}`
    : null;
});

check("client JS lives only in src/islands and src/motion", () => {
  const offenders: string[] = [];
  for (const p of srcFiles.map(posix)) {
    const text = readFileSync(join(root, p), "utf8");
    const inClient =
      p.startsWith("src/islands/") || p.startsWith("src/motion/");
    if (p.endsWith(".astro")) {
      // Allowed: <script> that only imports from islands/ or motion/, and the html.js script in the layout.
      for (const m of text.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
        const attrs = m[1] ?? "";
        const body = (m[2] ?? "").trim();
        if (attrs.includes("application/ld+json")) continue;
        if (attrs.includes("is:inline")) {
          if (p !== "src/layouts/BaseLayout.astro")
            offenders.push(`${p} (inline script)`);
          continue;
        }
        const onlyImports = body
          .split("\n")
          .every(
            (line) => CLIENT_IMPORT.test(line.trim()) || line.trim() === "",
          );
        if (!onlyImports)
          offenders.push(
            `${p} (script with logic: move it to src/islands or src/motion)`,
          );
      }
    } else if (
      !inClient &&
      !p.startsWith("src/pages/") &&
      /\b(document|window)\./.test(text.replace(/\/\*[\s\S]*?\*\//g, ""))
    ) {
      offenders.push(`${p} (touches document/window)`);
    }
  }
  return offenders.length
    ? `Client code outside islands/motion: ${offenders.join("; ")}`
    : null;
});

check("GSAP is only imported dynamically, and only by the loader", () => {
  const offenders = code.filter((p) => {
    const text = readFileSync(join(root, p), "utf8");
    if (posix(p) === "src/motion/loader.ts")
      return /^import\s+(?!type)[^;]*from\s+["']gsap/m.test(text);
    return /from\s+["']gsap|import\(["']gsap/.test(text);
  });
  return offenders.length
    ? `GSAP imported outside src/motion/loader.ts (or statically): ${offenders.join(", ")}`
    : null;
});

check("all Sanity queries live in src/lib/sanity/queries.ts", () => {
  const offenders = srcFiles.filter((p) => {
    const rel = posix(p);
    if (rel === "src/lib/sanity/queries.ts" || rel.endsWith("sanity.types.ts"))
      return false;
    const text = readFileSync(join(root, p), "utf8");
    return (
      /\bgroq`|from\s+["']groq["']|\*\[_type\s*==|\*\[_id\s*==/.test(text) &&
      !rel.startsWith("src/lib/sanity/fixtures")
    );
  });
  return offenders.length
    ? `GROQ outside queries.ts: ${offenders.join(", ")}`
    : null;
});

check("Sanity is only reached through src/lib/sanity", () => {
  const offenders = srcFiles.filter(
    (p) =>
      !posix(p).startsWith("src/lib/sanity/") &&
      /@sanity\/client|@sanity\/image-url|sanityFetch|createClient/.test(
        readFileSync(join(root, p), "utf8"),
      ) &&
      !/from\s+["'][./]*lib\/sanity\/client\.ts["']|from\s+["']\.\/sanity\/client\.ts["']/.test(
        readFileSync(join(root, p), "utf8"),
      ),
  );
  return offenders.length
    ? `Direct Sanity access outside src/lib/sanity: ${offenders.join(", ")}`
    : null;
});

check("generated Sanity types are fresh", () => {
  const file = "src/lib/sanity/sanity.types.ts";
  if (!existsSync(join(root, file)))
    return `${file} is missing. Run \`pnpm sanity:types\` and commit it.`;
  if (!existsSync(join(root, "studio/node_modules/.bin/sanity"))) {
    console.warn("  (skipped freshness check: run `pnpm install` first)");
    return null;
  }
  const before = read(file);
  execSync("pnpm sanity:types", { cwd: root, stdio: "pipe" });
  if (read(file) !== before)
    return `${file} was stale and has been regenerated. Review and commit it. (Schema or queries.ts changed without \`pnpm sanity:types\`.)`;
  return null;
});

check("components follow the file rules", () => {
  const problems: string[] = [];
  for (const entry of readdirSync(join(root, "src/components"))) {
    if (/^index\./.test(entry)) problems.push(`${entry} is a barrel file`);
    else if (
      statSync(join(root, "src/components", entry)).isFile() &&
      !/^[A-Z][A-Za-z0-9]*\.astro$/.test(entry)
    )
      problems.push(`${entry} is not a PascalCase .astro file`);
  }
  return problems.length ? problems.join("; ") : null;
});

check("every component appears in /styleguide", () => {
  const exempt = new Set([
    "Header",
    "Footer",
    "SEO",
    "Prose",
    "FieldShell",
    "Motion",
    "SanityImage",
  ]);
  const guide = read("src/pages/styleguide.astro");
  const missing = readdirSync(join(root, "src/components"))
    .filter((f) => f.endsWith(".astro"))
    .map((f) => f.replace(".astro", ""))
    .filter(
      (name) =>
        !exempt.has(name) &&
        !new RegExp(`import\\s+${name}\\s+from`).test(guide),
    );
  return missing.length
    ? `Not in src/pages/styleguide.astro: ${missing.join(", ")}. Add every variant and state.`
    : null;
});

check("CSP is enabled", () =>
  /csp\s*:/.test(read("astro.config.mjs"))
    ? null
    : "astro.config.mjs lost security.csp. Inline scripts and styles would ship unhashed.",
);

check("wrangler serves ./dist", () => {
  const w = read("wrangler.jsonc");
  return /"directory":\s*"\.\/dist"/.test(w) &&
    /"not_found_handling":\s*"404-page"/.test(w)
    ? null
    : "wrangler.jsonc must serve ./dist with not_found_handling: 404-page.";
});

check("wrangler has a previews block", () =>
  /"previews"\s*:/.test(read("wrangler.jsonc"))
    ? null
    : 'wrangler.jsonc needs "previews": {}. Without it `wrangler preview` (the Workers Builds Previews command) fails on every non-production branch.',
);

check("agent docs are in place", () => {
  if (!existsSync(join(root, "AGENTS.md"))) return "AGENTS.md is missing.";
  if (!/AGENTS\.md/.test(read("CLAUDE.md")))
    return "CLAUDE.md must point to AGENTS.md.";
  return null;
});

check("any .env present holds usable values", () => {
  // .env is gitignored, so this only runs on a developer machine.
  for (const file of [".env", ".env.local"]) {
    if (!existsSync(join(root, file))) continue;
    for (const line of read(file).split(/\r?\n/)) {
      const m =
        /^(SANITY_PROJECT_ID|SANITY_DATASET|PUBLIC_SITE_URL)=(.*)$/.exec(line);
      if (!m) continue;
      const [, key, value = ""] = m;
      if (/^["'\s]|["'\s]$/.test(value))
        return `${file}: ${key} is quoted or padded. Write values bare: hosts store the bytes they are given, quotes included.`;
      if (key === "SANITY_PROJECT_ID" && value && !/^[a-z0-9-]+$/.test(value))
        return `${file}: SANITY_PROJECT_ID must be a-z, 0-9 and dashes only.`;
    }
  }
  return null;
});

// pnpm's own commands. `pnpm <name>` runs these instead of a script of the
// same name. `start` and `test` are absent on purpose: pnpm's versions run the
// matching script.
const PNPM_BUILTINS = new Set([
  "access",
  "add",
  "audit",
  "bin",
  "config",
  "create",
  "dedupe",
  "deploy",
  "dlx",
  "doctor",
  "env",
  "exec",
  "fetch",
  "help",
  "import",
  "init",
  "install",
  "licenses",
  "link",
  "list",
  "ln",
  "outdated",
  "pack",
  "patch",
  "prune",
  "publish",
  "rebuild",
  "recursive",
  "remove",
  "root",
  "run",
  "server",
  "setup",
  "store",
  "unlink",
  "update",
  "why",
]);

check("no package script is shadowed by a pnpm built-in", () => {
  // `pnpm <name>` runs pnpm's OWN command when one exists, silently. `pnpm setup`
  // edited a shell profile instead of scaffolding.
  const shadowed = Object.keys(pkg.scripts ?? {}).filter((n) =>
    PNPM_BUILTINS.has(n),
  );
  return shadowed.length
    ? `Script(s) shadowed by a pnpm built-in: ${shadowed.join(", ")}. Rename them.`
    : null;
});

check("docs call shadowed workspace scripts with `run`", () => {
  // A workspace package may keep a script named like a built-in (the Studio's
  // `deploy`). Filtered without `run`, pnpm runs its own `deploy` and fails
  // with ERR_PNPM_INVALID_DEPLOY_TARGET. Docs must spell out `run`.
  const studio = JSON.parse(read("studio/package.json")) as {
    scripts?: Record<string, string>;
  };
  const shadowed = Object.keys(studio.scripts ?? {}).filter((n) =>
    PNPM_BUILTINS.has(n),
  );
  if (!shadowed.length) return null;
  const files = [
    "AGENTS.md",
    "README.md",
    ...walk("docs", (p) => p.endsWith(".md")),
    ...walk(".claude", (p) => p.endsWith(".md")),
    ...walk(".github", (p) => /\.ya?ml$/.test(p)),
    ...walk("scripts", (p) => p.endsWith(".ts")),
    ...readdirSync(join(root, "studio"))
      .filter((p) => /\.tsx?$/.test(p))
      .map((p) => `studio/${p}`),
  ].filter((p) => existsSync(join(root, p)));
  const call = new RegExp(
    `pnpm (?:--filter|-F)[ =]\\S+ (${shadowed.join("|")})\\b`,
  );
  const bad = files.filter((f) => call.test(read(f))).map(posix);
  return bad.length
    ? `${bad.join(", ")}: call ${shadowed.join(", ")} as \`pnpm --filter <pkg> run <script>\`; without \`run\` pnpm runs its built-in.`
    : null;
});

check("eslint ignores build output at any depth", () => {
  const config = read("eslint.config.mjs");
  const patterns = [
    ...config.matchAll(/globalIgnores\(\[([\s\S]*?)\]\)/g),
  ].flatMap((m) =>
    [...(m[1] ?? "").matchAll(/"([^"]+)"/g)].map((x) => x[1] ?? ""),
  );
  const bad = patterns.filter((p) => /^(dist|\.astro|node_modules)\//.test(p));
  return bad.length
    ? `Root-relative ESLint ignore(s): ${bad.join(", ")}. Prefix with **/ or lint walks nested checkouts' build output.`
    : null;
});

const pad = Math.max(...checks.map((c) => c.name.length));
for (const { name, ok } of checks)
  console.log(
    `  ${ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${name.padEnd(pad)}`,
  );

if (failures.length) {
  console.error(
    `\n\x1b[31m${failures.length} template invariant(s) broken\x1b[0m\n`,
  );
  for (const { name, problem } of failures)
    console.error(`\x1b[1m${name}\x1b[0m\n  ${problem}\n`);
  process.exit(1);
}
console.log("\n\x1b[32mTemplate invariants hold.\x1b[0m");
