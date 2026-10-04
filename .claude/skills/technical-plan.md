---
name: technical-plan
description: Plan a large feature before building it, as a committed document in docs/ — then annotate that document with what the build actually found. Use when a feature is big enough to warrant its own PR, involves an unfamiliar technique or a new dependency, or when a decision needs to survive being forgotten between sessions.
---

# Technical Plan

For anything larger than a component: write the plan first, land it as a
documentation-only commit, build against it, then go back and record what the
plan got wrong.

The point is not ceremony. It is that the reasoning behind a non-obvious build
is worth more than the code, decays fastest, and is what a future session (or
person) has no way to reconstruct from the diff.

## When to use it

- A feature needing more than a day, or its own PR.
- A new dependency, especially one with real bundle cost.
- A technique nobody on the project has used before.
- Anything where the _constraint_ is unusual — "the text must stay selectable",
  "this has to work without JS" — because those constraints drive an
  architecture that looks arbitrary later.

Skip it for ordinary component work. `restyle-component` covers that.

## Phase 1 — the plan

Write `docs/<feature>.md` and commit it on its own, with no code. A reviewer
should be able to disagree with the approach before any of it is built.

Cover:

- **The brief.** What this is, in the project's own language. Link the section
  of `docs/design.md` it answers.
- **Decisions**, dated, each with the alternative that was rejected and why.
  This is the part that stops the same argument recurring in three weeks.
- **Architecture**, including any constraint that drives it. State the
  constraint explicitly — it is the thing that will look arbitrary later.
- **Stack.** What gets added, and the honest bundle cost. If the figure is an
  estimate, label it an estimate.
- **Accessibility, SEO and fallbacks.** What a keyboard, a screen reader, a
  no-JS visitor and `prefers-reduced-motion` each get. Decide it here; it is
  much harder to retrofit.
- **Phasing.** Put anything unproven in a Phase 0 spike that gates the rest.
- **Open questions and risks.** Name them. An unnamed risk is one nobody owns.

Mark every unverified claim as unverified — bundle sizes, browser behaviour,
"this technique should work". Those are precisely the claims Phase 3 checks.

## Phase 2 — build it

Build against the plan. When reality disagrees with the plan, reality wins:
change the approach and note it, rather than forcing the build to match a
document written before anything was known.

## Phase 3 — build notes (do not skip this)

Append a dated **Build notes** section to the same document. This is the half
that pays for the whole convention:

- Which estimates were wrong, and the measured numbers that replace them.
- Which decisions changed under contact, and why.
- What is genuinely verified versus what is asserted — name the browsers and
  the conditions actually tested, and say plainly what was not.
- What is still open.

Then link the document from `docs/design.md` and from the top of the code it
explains, so the next person reads it before changing anything:

```ts
/**
 * Read docs/<feature>.md before changing this. Three things here are load
 * bearing and none of them are obvious from the code alone: …
 */
```

## The rule about honesty

A plan that quietly drops its failed predictions is worse than no plan, because
it reads as authoritative. If the spike only passed on one browser, the build
notes say so. If a claim about screen readers was never tested with one, say
that too. Future decisions get made on this document.
