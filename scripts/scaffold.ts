/**
 * Per-project setup for a site generated from oxlar.
 *
 *   pnpm scaffold
 *
 * Walks through: project details, install, env, git, GitHub, Sanity (project,
 * dataset, CORS, Studio deploy, webhook instructions), optional modules,
 * hosting (Cloudflare Workers, or statichost.eu), then types, a first build and
 * the template invariants. Every remote or irreversible step asks first. A
 * missing CLI or a failed remote command is reported and deferred to a closing
 * to-do list; it never ends the run.
 *
 *   node scripts/scaffold.ts --modules-only
 *     only the optional-modules step, for a project that skipped one.
 *   node scripts/scaffold.ts --config scaffold.config.json --non-interactive
 *     every answer from a JSON file, never reads stdin (phone, web session, CI).
 *
 * Idempotent: re-running skips what is already done and never overwrites a
 * value the user set without asking. Node built-ins only.
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const root = resolve(import.meta.dirname, "..");
process.chdir(root);

const ARGS = process.argv.slice(2);
const NON_INTERACTIVE = ARGS.includes("--non-interactive");
const MODULES_ONLY = ARGS.includes("--modules-only");

const c = {
  b: (s: string) => `\x1b[1m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

function flag(name: string): string | undefined {
  const i = ARGS.findIndex(
    (a) => a === `--${name}` || a.startsWith(`--${name}=`),
  );
  if (i === -1) return undefined;
  const arg = ARGS[i] ?? "";
  return arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : ARGS[i + 1];
}

type Json = Record<string, unknown>;
const configPath = flag("config");
const config: Json = configPath
  ? (JSON.parse(readFileSync(resolve(configPath), "utf8")) as Json)
  : {};
if (NON_INTERACTIVE && !configPath)
  console.log(
    c.yellow(
      "--non-interactive without --config: every question takes its default.\n",
    ),
  );

const pick = (path: string): unknown =>
  path
    .split(".")
    .reduce<unknown>((o, k) => (o as Json | undefined)?.[k], config);

let rl: ReturnType<typeof createInterface> | undefined;
const question = (q: string) => {
  rl ??= createInterface({ input: stdin, output: stdout });
  return rl.question(q);
};

/** Free-text answer: config value, else the default (headless), else a prompt. */
async function ask(key: string, label: string, fallback = ""): Promise<string> {
  const given = pick(key);
  if (given !== undefined && given !== null) return String(given);
  if (NON_INTERACTIVE) return fallback;
  const answer = (
    await question(`${label}${fallback ? c.dim(` [${fallback}]`) : ""}: `)
  ).trim();
  return answer || fallback;
}

type Decision = "yes" | "no" | "later";
/** Yes/no/later for a step. `true`=do it, `false`=skip, "later"=defer to the closing list. Absent means no when headless. */
async function decide(
  key: string,
  label: string,
  fallback: Decision = "no",
): Promise<Decision> {
  const given = pick(key);
  if (given === true) return "yes";
  if (given === false) return "no";
  if (given === "later") return "later";
  if (NON_INTERACTIVE) return fallback;
  const answer = (await question(`${label} ${c.dim("[y/N/later]")}: `))
    .trim()
    .toLowerCase();
  return answer === "y" || answer === "yes"
    ? "yes"
    : answer === "later" || answer === "l"
      ? "later"
      : "no";
}

const todos: { what: string; how: string }[] = [];
const defer = (what: string, how: string) => todos.push({ what, how });
const results: { step: string; ok: boolean; note?: string }[] = [];
const record = (step: string, ok: boolean, note?: string) =>
  results.push({ step, ok, ...(note ? { note } : {}) });

function step(n: number, title: string) {
  console.log(`\n${c.b(`${n}. ${title}`)}`);
}

interface RunOptions {
  cwd?: string;
  env?: Record<string, string>;
  capture?: boolean;
}

/** Run a command without a shell (no quoting surprises), stdin closed so nothing can hang on a prompt. */
function run(cmd: string, args: string[], opts: RunOptions = {}) {
  const out = spawnSync(cmd, args, {
    cwd: opts.cwd ?? root,
    env: { ...process.env, ...opts.env },
    encoding: "utf8",
    stdio: [
      "ignore",
      opts.capture ? "pipe" : "inherit",
      opts.capture ? "pipe" : "inherit",
    ],
  });
  return {
    ok: out.status === 0 && !out.error,
    stdout: out.stdout ?? "",
    stderr: out.stderr ?? "",
    missing:
      (out.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT",
  };
}

/** Run a remote or fallible step: on failure, report it and defer the exact command. */
function tryRun(
  label: string,
  cmd: string,
  args: string[],
  how: string,
  opts: RunOptions = {},
): boolean {
  const r = run(cmd, args, opts);
  if (r.ok) return true;
  const why = r.missing
    ? `${cmd} is not installed`
    : `\`${cmd} ${args.join(" ")}\` failed`;
  console.log(c.yellow(`  ${why}. Deferred to the to-do list.`));
  defer(label, how);
  return false;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "my-site";
const bareUrl = (u: string) =>
  u
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/$/, "");

// --- .env -------------------------------------------------------------------

function readEnvFile(): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(".env")) return map;
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (m)
      map.set(
        m[1] ?? "",
        (m[2] ?? "").trim().replace(/^(['"])([\s\S]*)\1$/, "$2"),
      );
  }
  return map;
}

/** Writes values BARE (no quotes: hosts store the bytes verbatim). Never overwrites a value the user set. */
function writeEnv(updates: Record<string, string>) {
  const current = readEnvFile();
  const lines = existsSync(".env")
    ? readFileSync(".env", "utf8").split(/\r?\n/)
    : readFileSync(".env.example", "utf8").split(/\r?\n/);
  const seen = new Set<string>();
  const next = lines.map((line) => {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (!m) return line;
    const key = m[1] ?? "";
    seen.add(key);
    const want = updates[key];
    if (want === undefined) return line;
    const existing = current.get(key);
    return existing && existing !== want && existing !== "http://localhost:4321"
      ? line
      : `${key}=${want}`;
  });
  for (const [k, v] of Object.entries(updates))
    if (!seen.has(k)) next.push(`${k}=${v}`);
  writeFileSync(".env", next.join("\n").replace(/\n*$/, "\n"));
}

/**
 * The Studio is bundled for the browser, and Sanity only exposes variables
 * prefixed SANITY_STUDIO_ from the Studio's own folder. The root .env is not
 * seen, so without this file `sanity dev` opens against a placeholder project.
 */
function writeStudioEnv(projectId: string, dataset: string) {
  const path = "studio/.env";
  const wanted = `SANITY_STUDIO_PROJECT_ID=${projectId}\nSANITY_STUDIO_DATASET=${dataset}\n`;
  if (
    existsSync(path) &&
    readFileSync(path, "utf8").includes(`SANITY_STUDIO_PROJECT_ID=${projectId}`)
  )
    return;
  writeFileSync(path, wanted);
}

// --- Optional modules -------------------------------------------------------

interface Module {
  id: string;
  label: string;
  description: string;
  dependencies: string[];
  devDependencies: string[];
  files: { from: string; to: string }[];
  /** Extra file edits. Must be idempotent. */
  patch?: () => void;
}

function patchReactIntegration() {
  const path = "astro.config.mjs";
  let text = readFileSync(path, "utf8");
  if (!text.includes("@astrojs/react")) {
    text = text.replace(
      'import sitemap from "@astrojs/sitemap";',
      'import sitemap from "@astrojs/sitemap";\nimport react from "@astrojs/react";',
    );
    text = text.replace("integrations: [", "integrations: [react(), ");
    writeFileSync(path, text);
  }
  const tsconfig = JSON.parse(readFileSync("tsconfig.json", "utf8")) as {
    compilerOptions: Json;
  };
  tsconfig.compilerOptions["jsx"] = "react-jsx";
  tsconfig.compilerOptions["jsxImportSource"] = "react";
  writeFileSync("tsconfig.json", JSON.stringify(tsconfig, null, 2) + "\n");
}

export const MODULES: Module[] = [
  {
    id: "three",
    label: "three.js: 3D / WebGL",
    description:
      "Adds three and @types/three, plus docs/3d.md: the recipe that keeps ~127 KB gzipped out of the main bundle and the content in the DOM.",
    dependencies: ["three"],
    devDependencies: ["@types/three"],
    files: [{ from: "scripts/modules/three/3d.md", to: "docs/3d.md" }],
  },
  {
    id: "react-islands",
    label: "React islands (for complex accessible widgets)",
    description:
      "Adds @astrojs/react and react-aria-components for a widget that cannot be built accessibly with native HTML (rich combobox, date picker). Use sparingly: each island ships React.",
    dependencies: [
      "@astrojs/react",
      "react",
      "react-dom",
      "react-aria-components",
    ],
    devDependencies: ["@types/react", "@types/react-dom"],
    files: [
      {
        from: "scripts/modules/react-islands/react-islands.md",
        to: "docs/react-islands.md",
      },
      {
        from: "scripts/modules/react-islands/ExampleIsland.tsx",
        to: "src/islands/react/ExampleIsland.tsx",
      },
    ],
    patch: patchReactIntegration,
  },
  {
    id: "preview",
    label: "Draft preview build",
    description:
      "Adds docs/preview.md and wrangler.preview.jsonc: a second, noindex build on its own URL that reads the draft perspective with a read token. No dependencies.",
    dependencies: [],
    devDependencies: [],
    files: [
      { from: "scripts/modules/preview/preview.md", to: "docs/preview.md" },
      {
        from: "scripts/modules/preview/wrangler.preview.jsonc",
        to: "wrangler.preview.jsonc",
      },
    ],
  },
];

async function optionalModules(n: number) {
  step(n, "Optional modules");
  const wantedRaw = pick("modules");
  const wanted = Array.isArray(wantedRaw) ? (wantedRaw as string[]) : [];
  for (const mod of MODULES) {
    const installed = mod.files.every((f) => existsSync(f.to));
    if (installed) {
      console.log(c.dim(`  ${mod.id}: already added`));
      continue;
    }
    console.log(`  ${c.b(mod.label)}\n  ${c.dim(mod.description)}`);
    const yes =
      NON_INTERACTIVE || wantedRaw !== undefined
        ? wanted.includes(mod.id)
        : (await question("  Add it? [y/N]: "))
            .trim()
            .toLowerCase()
            .startsWith("y");
    if (!yes) {
      console.log(
        c.dim(
          "  skipped (add later with `node scripts/scaffold.ts --modules-only`)",
        ),
      );
      continue;
    }
    let ok = true;
    if (mod.dependencies.length)
      ok &&= tryRun(
        `Install ${mod.id} dependencies`,
        "pnpm",
        ["add", "--save-exact", ...mod.dependencies],
        `pnpm add --save-exact ${mod.dependencies.join(" ")}`,
      );
    if (mod.devDependencies.length)
      ok &&= tryRun(
        `Install ${mod.id} dev dependencies`,
        "pnpm",
        ["add", "-D", "--save-exact", ...mod.devDependencies],
        `pnpm add -D --save-exact ${mod.devDependencies.join(" ")}`,
      );
    for (const f of mod.files) {
      if (existsSync(f.to)) {
        console.log(c.yellow(`  ${f.to} exists, left as is`));
        continue;
      }
      mkdirSync(dirname(f.to), { recursive: true });
      copyFileSync(f.from, f.to);
    }
    mod.patch?.();
    record(`module ${mod.id}`, ok);
    console.log(c.green(`  ${mod.id} added`));
  }
}

// --- Sanity -----------------------------------------------------------------

const studio = (args: string[], env: Record<string, string> = {}) =>
  run("pnpm", ["--filter", "oxlar-studio", "exec", "sanity", ...args], {
    capture: true,
    env,
  });

async function sanityStep(
  n: number,
  name: string,
  siteUrl: string,
): Promise<string | undefined> {
  step(n, "Sanity");
  const existingId = readEnvFile().get("SANITY_PROJECT_ID");
  if (existingId) {
    console.log(
      c.dim(`  project ${existingId} is already in .env, skipping creation`),
    );
    writeStudioEnv(
      existingId,
      readEnvFile().get("SANITY_DATASET") || "production",
    );
    record("sanity project", true, existingId);
    return existingId;
  }

  const modeRaw = pick("sanity.mode");
  let mode =
    typeof modeRaw === "string" ? modeRaw : modeRaw === false ? "skip" : "";
  if (!mode) {
    mode = NON_INTERACTIVE
      ? "later"
      : ((
          { "1": "create", "2": "existing", "3": "later" } as Record<
            string,
            string
          >
        )[
          (
            await question(
              "  1) create a new project  2) use an existing project id  3) later  [3]: ",
            )
          ).trim() || "3"
        ] ?? "later");
  }

  const dataset = await ask("sanity.dataset", "  Dataset", "production");
  if (!/^[a-z0-9_-]+$/.test(dataset)) {
    console.log(
      c.red(
        `  Dataset "${dataset}" is not valid (a-z, 0-9, _ and -). Skipping Sanity.`,
      ),
    );
    record("sanity project", false, "invalid dataset");
    return undefined;
  }

  let projectId: string | undefined;
  if (mode === "existing") {
    projectId = (await ask("sanity.projectId", "  Project id")).trim();
    if (!/^[a-z0-9-]+$/.test(projectId)) {
      console.log(
        c.red(
          "  A project id is a-z, 0-9 and dashes only (no quotes). Skipping.",
        ),
      );
      record("sanity project", false, "invalid project id");
      return undefined;
    }
  } else if (mode === "create") {
    const login = studio(["projects", "list", "--json"]);
    if (!login.ok) {
      console.log(
        c.yellow("  Not logged in to Sanity (or the CLI failed). Deferred."),
      );
      defer(
        "Create the Sanity project",
        `pnpm --filter oxlar-studio exec sanity login && pnpm --filter oxlar-studio exec sanity projects create "${name}" --dataset ${dataset} --yes --json   # then put SANITY_PROJECT_ID=<id> in .env, unquoted`,
      );
      record("sanity project", false, "deferred");
      return undefined;
    }
    const org = await ask(
      "sanity.organization",
      "  Organization id or slug (blank if you have one)",
    );
    const created = studio([
      "projects",
      "create",
      name,
      "--dataset",
      dataset,
      "--yes",
      "--json",
      ...(org ? ["--organization", org] : []),
    ]);
    projectId = /"(?:projectId|id)"\s*:\s*"([a-z0-9-]+)"/.exec(
      created.stdout,
    )?.[1];
    if (!created.ok || !projectId) {
      console.log(
        c.yellow(
          `  Project creation failed:\n${created.stderr.trim().split("\n").slice(-3).join("\n")}`,
        ),
      );
      defer(
        "Create the Sanity project",
        `pnpm --filter oxlar-studio exec sanity projects create "${name}" --dataset ${dataset} --yes --json${org ? "" : "   # add --organization <id> if your account has several"}`,
      );
      record("sanity project", false, "create failed");
      return undefined;
    }
    console.log(c.green(`  created project ${projectId}`));
  } else {
    if (mode !== "skip") {
      defer(
        "Connect Sanity",
        `pnpm --filter oxlar-studio exec sanity projects create "${name}" --dataset ${dataset} --yes --json   # then re-run: pnpm scaffold (choose existing, paste the id; it writes .env and studio/.env)`,
      );
    }
    record("sanity project", false, mode === "skip" ? "skipped" : "deferred");
    return undefined;
  }

  writeEnv({ SANITY_PROJECT_ID: projectId, SANITY_DATASET: dataset });
  writeStudioEnv(projectId, dataset);
  record("sanity project", true, projectId);

  const env = { SANITY_PROJECT_ID: projectId, SANITY_DATASET: dataset };
  const cors = pick("sanity.cors");
  // A static site never calls Sanity from the browser: CORS is only for a Studio
  // you run locally. Hosted studios on *.sanity.studio are allowed automatically.
  // Never a wildcard origin together with credentials.
  const corsWanted =
    cors === undefined
      ? mode === "create"
        ? "yes"
        : "no"
      : cors === true
        ? "yes"
        : cors === "later"
          ? "later"
          : "no";
  const corsCmd = `pnpm --filter oxlar-studio exec sanity cors add http://localhost:3333 --credentials --project-id ${projectId}`;
  if (corsWanted === "yes") {
    if (
      !studio([
        "cors",
        "add",
        "http://localhost:3333",
        "--credentials",
        "--project-id",
        projectId,
      ]).ok
    ) {
      defer(
        "Allow the local Studio origin (so `sanity dev` can log in)",
        corsCmd,
      );
    }
  } else if (corsWanted === "later")
    defer(
      "Allow the local Studio origin (so `sanity dev` can log in)",
      corsCmd,
    );

  const token = await decide(
    "sanity.token",
    "  Create a viewer read token (private datasets and preview builds only)?",
  );
  if (token === "yes") {
    const t = studio(
      [
        "tokens",
        "add",
        `${slugify(name)} build`,
        "--role",
        "viewer",
        "--yes",
        "--json",
      ],
      env,
    );
    const value = /"(?:key|token)"\s*:\s*"([^"]+)"/.exec(t.stdout)?.[1];
    if (t.ok && value) {
      writeEnv({ SANITY_READ_TOKEN: value });
      console.log(
        c.green(
          "  read token written to .env (gitignored). Add it as a GitHub secret too.",
        ),
      );
    } else
      defer(
        "Create a read token",
        `pnpm --filter oxlar-studio exec sanity tokens add "${slugify(name)} build" --role viewer --yes   # then SANITY_READ_TOKEN=<key> in .env`,
      );
  } else if (token === "later")
    defer(
      "Create a read token (only for a private dataset)",
      `pnpm --filter oxlar-studio exec sanity tokens add "${slugify(name)} build" --role viewer`,
    );

  const deploy = await decide(
    "sanity.deployStudio",
    "  Deploy the Studio to Sanity hosting?",
  );
  const host = await ask(
    "sanity.studioHost",
    "  Studio hostname (<name>.sanity.studio)",
    slugify(name),
  );
  const deployCmd = `SANITY_PROJECT_ID=${projectId} pnpm --filter oxlar-studio exec sanity deploy --yes --url ${host}`;
  if (deploy === "yes") {
    if (!studio(["deploy", "--yes", "--url", host], env).ok)
      defer("Deploy the Studio", deployCmd);
    else record("studio deploy", true, `https://${host}.sanity.studio`);
  } else if (deploy === "later") defer("Deploy the Studio", deployCmd);

  // `sanity hooks create` is interactive only, so the webhook is always printed.
  defer(
    "Create the publish webhook (Sanity Manage, API, Webhooks, or `sanity hooks create`)",
    `URL https://api.github.com/repos/<owner>/<repo>/dispatches  |  filter: _type in ["page","post","siteSettings"] && !(_id in path("drafts.**"))  |  projection: { "event_type": "sanity-publish", "client_payload": { "type": _type, "slug": slug.current } }  |  header Authorization: Bearer <GitHub token with Contents: write>   -- full steps: docs/publishing.md`,
  );
  void siteUrl;
  return projectId;
}

// --- Main -------------------------------------------------------------------

async function main() {
  console.log(c.b("\noxlar scaffold\n"));
  if (!existsSync("package.json") || !existsSync("astro.config.mjs")) {
    console.error(
      c.red(
        "This does not look like an oxlar checkout (no astro.config.mjs). Run it from the project root.",
      ),
    );
    process.exit(1);
  }

  if (MODULES_ONLY) {
    await optionalModules(1);
    rl?.close();
    return;
  }

  // 1. Details
  step(1, "Project details");
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as Json & {
    name: string;
  };
  const rawName = await ask(
    "name",
    "Project name",
    pkg.name === "oxlar" ? "my-site" : pkg.name,
  );
  const name = slugify(rawName);
  const description = await ask(
    "description",
    "One-line description",
    "A new website.",
  );
  const siteUrl = bareUrl(
    await ask("siteUrl", "Production URL (optional)", ""),
  );
  if (
    siteUrl &&
    !/^https:\/\/[^\s/]+/.test(siteUrl) &&
    !/^http:\/\/localhost/.test(siteUrl)
  )
    console.log(
      c.yellow(
        `  "${siteUrl}" is not an https URL. Canonical links will use it as given.`,
      ),
    );

  if (pkg.name === "oxlar" && name !== "oxlar") {
    pkg.name = name;
    writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
    const w = readFileSync("wrangler.jsonc", "utf8");
    writeFileSync(
      "wrangler.jsonc",
      w.replace('"name": "oxlar"', `"name": "${name}"`),
    );
    console.log(
      c.green(`  named the project ${name} (package.json, wrangler.jsonc)`),
    );
  } else console.log(c.dim("  package name already set, left as is"));
  void description;

  // 2. Install
  step(2, "Install dependencies");
  record(
    "install",
    tryRun("Install dependencies", "pnpm", ["install"], "pnpm install"),
  );

  // 3. Env
  step(3, "Environment (.env)");
  writeEnv({ PUBLIC_SITE_URL: siteUrl || "http://localhost:4321" });
  console.log(c.green("  .env written (gitignored, values bare, no quotes)"));

  // 4. Git
  step(4, "Git");
  if (!existsSync(".git"))
    run("git", ["init", "-b", "main"], { capture: true });
  const hasCommit = run("git", ["rev-parse", "HEAD"], { capture: true }).ok;
  if (!hasCommit) {
    run("git", ["add", "-A"], { capture: true });
    run("git", ["commit", "-m", `Scaffold ${name} from oxlar`], {
      capture: true,
    });
  } else console.log(c.dim("  history exists, nothing committed"));

  // 5. GitHub
  step(5, "GitHub");
  const origin = run("git", ["remote", "get-url", "origin"], { capture: true });
  const push = await decide(
    "github.push",
    origin.ok
      ? `  Push to origin (${origin.stdout.trim()})?`
      : "  Push to origin?",
  );
  if (origin.ok && push === "yes") {
    const fetched = run("git", ["fetch", "origin"], { capture: true });
    const branch =
      run("git", ["branch", "--show-current"], {
        capture: true,
      }).stdout.trim() || "main";
    const remoteHead = run("git", ["rev-parse", `origin/${branch}`], {
      capture: true,
    });
    // Guard against the wrong-directory mistake: unrelated histories mean you are probably in a stale checkout.
    const related =
      !fetched.ok ||
      !remoteHead.ok ||
      run("git", ["merge-base", "HEAD", `origin/${branch}`], { capture: true })
        .ok;
    const ahead =
      remoteHead.ok &&
      run("git", ["merge-base", "--is-ancestor", `origin/${branch}`, "HEAD"], {
        capture: true,
      }).ok;
    if (!related) {
      console.log(
        c.red(
          "  origin has no history in common with this checkout: you are probably in the wrong directory. Not pushing.",
        ),
      );
      defer(
        "Push to GitHub (check the directory and origin first)",
        `git push -u origin ${branch}`,
      );
    } else if (remoteHead.ok && !ahead) {
      console.log(
        c.red(
          "  origin is ahead of or diverged from this branch. Not pushing.",
        ),
      );
      defer(
        "Reconcile with origin, then push",
        `git pull --rebase origin ${branch} && git push -u origin ${branch}`,
      );
    } else
      tryRun(
        "Push to GitHub",
        "git",
        ["push", "-u", "origin", branch],
        `git push -u origin ${branch}`,
      );
  } else if (!origin.ok) {
    const create = await decide(
      "github.create",
      "  Create a new PRIVATE GitHub repo with `gh` and push?",
    );
    const how = `gh repo create ${name} --private --source=. --remote=origin --push`;
    if (create === "yes")
      tryRun(
        "Create the GitHub repo",
        "gh",
        [
          "repo",
          "create",
          name,
          "--private",
          "--source=.",
          "--remote=origin",
          "--push",
        ],
        how,
      );
    else if (create === "later") defer("Create the GitHub repo", how);
  }

  // 6. Sanity
  const projectId = await sanityStep(6, name, siteUrl);

  // 7. Modules
  await optionalModules(7);

  // 8. Hosting
  step(8, "Hosting");
  const hostingRaw = (
    await ask(
      "hosting",
      "  Hosting target: cloudflare or statichost",
      "cloudflare",
    )
  ).toLowerCase();
  const hosting = hostingRaw.startsWith("s") ? "statichost" : "cloudflare";
  const siteVars = [
    `PUBLIC_SITE_URL=${siteUrl || "<production url>"}`,
    `SANITY_PROJECT_ID=${projectId ?? "<id>"}`,
    "SANITY_DATASET=production",
  ];
  if (hosting === "statichost") {
    // statichost.eu builds from the repository; only the deploy workflow changes.
    let wf = readFileSync(".github/workflows/deploy.yml", "utf8");
    if (wf.includes("wrangler deploy")) {
      wf = wf
        .replace(
          /\n {6}CLOUDFLARE_API_TOKEN:.*\n {6}CLOUDFLARE_ACCOUNT_ID:.*/,
          "",
        )
        .replace(
          /\n {6}- name: Deploy to Cloudflare Workers\n {8}run: pnpm exec wrangler deploy\n?/,
          "\n      # statichost.eu builds from the repository (build: pnpm build, publish: dist).\n      # Configure that, and the same variables, on their site. This workflow only checks the build\n      # and, on a Sanity publish, you trigger their build hook here if you use one.\n",
        );
      writeFileSync(".github/workflows/deploy.yml", wf);
      console.log(c.green("  deploy.yml no longer calls wrangler"));
    }
    defer(
      "Set up statichost.eu",
      "Create the site, build command `pnpm build`, publish directory `dist`, with the variables " +
        siteVars.join(", ") +
        ". See docs/deployment.md.",
    );
    record("hosting", true, "statichost.eu");
  } else {
    const deploy = await decide(
      "cloudflare.deploy",
      "  Build and deploy to Cloudflare Workers now?",
    );
    const who = run("pnpm", ["exec", "wrangler", "whoami"], { capture: true });
    const cmd =
      "pnpm exec wrangler login && pnpm build && pnpm cf:deploy   # reads PUBLIC_SITE_URL from .env";
    if (
      deploy === "yes" &&
      who.ok &&
      /logged in|email/i.test(who.stdout + who.stderr)
    ) {
      const built = run("pnpm", ["build"], {
        env: { PUBLIC_SITE_URL: siteUrl || "http://localhost:4321" },
      });
      if (
        !built.ok ||
        !tryRun(
          "Deploy to Cloudflare Workers",
          "pnpm",
          ["exec", "wrangler", "deploy"],
          cmd,
        )
      )
        record("hosting", false, "deploy failed");
      else record("hosting", true, "deployed");
    } else if (deploy !== "no") {
      if (!siteUrl) {
        defer(
          "Set PUBLIC_SITE_URL in .env before the first build",
          "Any https URL works for the first deploy (e.g. https://" +
            name +
            ".workers.dev). wrangler prints the real *.workers.dev URL; put it in .env, then rebuild and redeploy.",
        );
      }
      defer("Deploy to Cloudflare Workers (creates the Worker)", cmd);
      record("hosting", false, "deferred");
    }
    defer(
      "Set GitHub variables and secrets for deploy.yml",
      `gh variable set PUBLIC_SITE_URL --body ${siteUrl || "<url>"}; gh variable set SANITY_PROJECT_ID --body ${projectId ?? "<id>"}; gh variable set SANITY_DATASET --body production; gh secret set CLOUDFLARE_API_TOKEN; gh secret set CLOUDFLARE_ACCOUNT_ID   # names: README.md`,
    );
  }

  // 9. Types, build, invariants
  step(9, "Types, first build, template invariants");
  record(
    "sanity types",
    tryRun(
      "Regenerate Sanity types",
      "pnpm",
      ["sanity:types"],
      "pnpm sanity:types",
      { env: projectId ? { SANITY_PROJECT_ID: projectId } : {} },
    ),
  );
  const built = run("pnpm", ["build"], {
    env: { PUBLIC_SITE_URL: siteUrl || "http://localhost:4321" },
  });
  record("first build", built.ok);
  const verified = run("pnpm", ["verify:template"]);
  record("verify:template", verified.ok);

  report();
  rl?.close();
}

function report() {
  console.log(`\n${c.b("Results")}`);
  for (const r of results)
    console.log(
      `  ${r.ok ? c.green("✓") : c.red("✗")} ${r.step}${r.note ? c.dim(`  ${r.note}`) : ""}`,
    );
  if (todos.length) {
    console.log(
      `\n${c.b("Still to do")} ${c.dim("(copy the commands; replace any <placeholder> first, the shell treats <...> as redirection)")}`,
    );
    todos.forEach((t, i) =>
      console.log(`  ${i + 1}. ${t.what}\n     ${c.dim(t.how)}`),
    );
  }
  console.log(
    `\nNext: run the ${c.b("design-discovery")} skill to fill docs/design.md.`,
  );
  if (
    results.some(
      (r) =>
        !r.ok && (r.step === "first build" || r.step === "verify:template"),
    )
  )
    process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error: Error) => {
    // A step that throws must still report what happened and what is left.
    console.error(c.red(`\nScaffold stopped: ${error.message}`));
    report();
    process.exit(1);
  });
}
