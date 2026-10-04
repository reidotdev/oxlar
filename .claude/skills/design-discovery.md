---
name: design-discovery
description: Run the design discovery interview for a new website built on oxlar, then write the decisions into docs/design.md. Use at the start of a new project, or when the user says "let's figure out the design", "discovery", or wants to define the site's purpose, visual style, signature elements, and component modifications before building.
---

# Design Discovery

Goal: turn a vague "let's build a site" into a concrete, written brief in
`docs/design.md` that the rest of the build follows. Interview, then document.
Do **not** start coding UI until `docs/design.md` has real answers.

## How to run it

Work through the five areas below as a conversation — one focused batch of
questions at a time, not a wall of 30. Use `AskUserQuestion` for genuinely
forking choices (light vs dark, illustration vs photography). Reflect answers
back briefly, then move on. Pull references from the user (links, screenshots)
wherever style is discussed.

### 1. Purpose

- What is the site for? Who is the audience?
- The single primary action a visitor should take. Secondary goals.
- One-line tone.

### 2. Visual style

- 3–5 mood adjectives. Reference sites/images.
- Palette direction (light / dark / both, brand colors) → which `--*` tokens in
  `src/styles/tokens.css` change from the neutral default.
- Typography feel (Inter is the default — override only with reason).
- Density, imagery approach.

### 3. Signature elements

- The 2–4 memorable moments (hero, scroll motion, custom shapes, transitions)
  that stop this from feeling like a template. Be specific and ambitious here —
  this is where GSAP and custom SVG earn their place.

### 4. Component modifications

- Which components get re-skinned beyond token changes, and how. Behaviour and
  accessibility stay native; presentation changes (hand off each to
  `add-component`). Flag any widget that needs a rich listbox, combobox or date
  picker: those are candidates for the opt-in `react-islands` module.

### 5. Content model (Sanity)

- Documents, singletons, and the fields each needs. What must be editable in the
  Studio vs. hardcoded.

### 6. Responsive

A design handed over at one width is the single most common cause of a stalled
build. Ask before any UI is written:

- Which widths is the design drawn at? If it is desktop-only, say so in
  `docs/design.md` explicitly rather than discovering it mid-build.
- What does each **signature element** degrade to on a phone? Ambitious moments
  are exactly the ones with no obvious small-screen form, and inventing one
  halfway through costs more than deciding it now.
- Anything that must not reflow (a fixed band, a measured type scale)?

### 7. Content and assets

- **Copy status.** What exists, what is being written, what is placeholder? A
  build against `[placeholder]` text carries TODOs for weeks.
- **Asset inventory.** Logos, photography, video — who provides them, in what
  format, when. Agree that source video is re-encoded and hosted off-repo
  before anyone commits a file (see the Gotchas in `AGENTS.md`).
- **Language and locale.** Which language is the site in, and is more than one
  ever likely? `lang` on `<html>` and any i18n routing follow from this, and
  retrofitting is far more expensive than deciding up front.

### 8. Motion brief

"Signature elements" (§3) tends to collect the big moments and leave ordinary
motion unspecified, which then never gets decided. Go section by section and
name the treatment: scroll reveal, parallax, counter, hover only, or none. The
`Reveal` helper covers the common case. Everything non-essential must be gated
behind `prefers-reduced-motion`.

## Output

Write everything into `docs/design.md` (the template already has the sections).
Fill the token-override and component-modification tables concretely — those
drive the actual work. End by listing open questions and proposing the first
build steps (usually: apply token overrides, then build the hero).

Two things to carry into the document specifically:

- **Record what is still unknown as an open question with a name attached.**
  "Trust logos — five slots, no brands supplied" is actionable; silence is not.
- **Check new palette values for contrast before writing them down.**
  `--muted-foreground` in particular has to clear 4.5:1 against the _darkest_
  light surface it lands on (`--muted`, `--secondary`), not just against the
  page background. Red used as text needs `--destructive-text` (lighter in dark mode). `pnpm test` runs an axe pass (light and dark) that will catch it, but
  choosing a passing value now avoids a re-theme later.

Then confirm the brief with the user before building.
