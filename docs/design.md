# Design — <PROJECT NAME>

> Filled in during discovery (see `.claude/skills/design-discovery.md`). This is
> the source of truth for the build. Update it as decisions change.

## 1. Purpose

- **What is this site for?**
- **Primary audience:**
- **Primary action / goal (the one thing a visitor should do):**
- **Secondary goals:**
- **Tone in one line:**

## 2. Visual style

- **Mood / adjectives (3–5):**
- **References (links, screenshots):**
- **Palette direction:** (light / dark / both; brand colors)
- **Typography feel:** (default is Inter — override here if different)
- **Density / spacing:** (airy vs. compact)
- **Imagery:** (photography, illustration, 3D, none)

### Token overrides

> Which CSS variables in `src/styles/tokens.css` change from the neutral default.

| Token         | Default        | This project |
| ------------- | -------------- | ------------ |
| `--brand`     | indigo         |              |
| `--radius`    | 0.625rem       |              |
| `--font-sans` | Inter Variable |              |

## 3. Signature elements

> The 2–4 memorable moments that make this site feel bespoke, not templated.

- **Hero:**
- **Motion (GSAP):** (scroll reveals, parallax, split text. Never the hero.)
- **Custom shapes / SVG:** (clip-paths, masks, borders, dividers)
- **Interactions:**

## 4. Component modifications

> Which components get re-skinned beyond the token defaults, and how. Behaviour
> stays native; change only presentation (see the add-component skill).

| Component | Change |
| --------- | ------ |
| Button    |        |
|           |        |

## 5. Content model (Sanity)

> Rough schema — documents, singletons, and the fields each needs.

- **page** — title, slug, excerpt, body (blocks, images, callouts, code), seo
- **post** — title, slug, publishedAt, excerpt, image, body, seo
- **siteSettings** (singleton) — title, description, person or organization, navigation, social, footer

## 6. Pages / routes

- `/` —
- ...

## 7. Open questions
