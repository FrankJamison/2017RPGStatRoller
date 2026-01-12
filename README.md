# 2017 RPG Stat Roller

Static, dependency-free RPG ability score rollers with a shared UI layer. Each variant keeps its rule logic inline per page, while design + interaction patterns are centralized in a small, reusable UI bundle.

## Recruiter / Employer Summary

This project is intentionally “production-shaped” despite being a small static site:

- **No build step / no dependencies**: plain HTML/CSS/JS to keep deployment simple and portable.
- **Component-style shared UI**: common layout, theme, results rendering, history, and keyboard shortcuts are implemented once and reused across pages.
- **Accessibility-minded UX** (WCAG 2.0 oriented): semantic structure, keyboard operability, focus visibility, and readable contrast.
- **Privacy-respecting**: no analytics, no network calls, and history stays in `localStorage` (device/browser-local).

## Product Features

- **Roll / Copy / Clear** controls
  - Roll generates a valid stat set for the current ruleset.
  - Copy puts the latest result into the clipboard.
  - Clear resets the latest roll UI and clears stored history.
- **History**: recent rolls are kept locally in the browser (`localStorage`).
  - History is intentionally compact: it shows the rolled stats and (when available) Mode and Point Buy.
- **Theme toggle**: dark/light theme via a single toggle button (persisted in `localStorage`).
- **Keyboard shortcuts**: `R` roll, `C` copy, `X` clear.

## Accessibility & UX (WCAG 2.0 Oriented)

This site is built to be usable without a mouse and readable in both themes.

- **Keyboard operability**: buttons and nav are keyboard focusable; shortcuts exist but do not override `Ctrl/Cmd` combos.
- **Focus visibility**: interactive elements have a visible focus ring (`:focus-visible`).
- **Skip link**: “Skip to content” is provided at the top of each page.
- **Announcements**: toast messages use `role="status"` + `aria-live="polite"`.
- **Non-color link affordance**: links are underlined by default.

Note: conformance is “design-oriented” and should be validated with a formal audit toolchain (axe, Lighthouse, manual SR testing) for any compliance-critical deployment.

## Technical Design

### Architecture

- **Per-page business logic** (inline scripts): each HTML file encodes its own dice/stat rules.
- **Shared UI layer**:
  - `assets/app.css` provides the design system (colors, layout, buttons, cards, pills, results UI).
  - `assets/app.js` handles theme, rendering, history, copy/clear actions, and keyboard shortcuts.

### UI Integration Pattern

Each page declares a roll function and uses `data-roll-fn`/`data-roll-args` on `<body>` so the shared UI can bind the Roll button automatically.

When a roll completes, the page calls:

- `window.StatRollerUI.showResult({ stats, pointBuy, attempts, variant })`

That single call:

- Renders the latest roll into the “Latest Roll” panel
- Enables Copy
- Appends the roll to history and persists it (history display intentionally omits timestamps and other “noise”)

## Pages / Variants

All pages live in the project root and can be opened directly in a browser:

- [index.html](index.html): Classic Stat Roller (animated d20)
- [stat-roller-dnd5e.html](stat-roller-dnd5e.html): D&D 5e Stat Roller
- [stat-roller-min-10.html](stat-roller-min-10.html): Pathfinder Stat Roller (Min 10)
- [stat-roller-caedis-cauldron.html](stat-roller-caedis-cauldron.html): Caedi's Cauldron of Awesome Stats (Min 50, animated d20)

## Rules Summary (High Level)

Across variants, the common pattern is:

- Roll **4d6**, drop the lowest die, sum the remaining 3.
- Reject stats below a minimum threshold (varies by page).
- Some variants roll **7 stats** and drop the lowest stat to produce the final 6.
- Some variants compute a “point buy” heuristic from the final 6.

## Run Locally

### Option A: Open files directly

Open [index.html](index.html) (or any other page) in a browser.

### Option B: Serve the folder (recommended)

Any static server works. Examples:

- Python:
  - `python -m http.server 8000`
  - Open `http://127.0.0.1:8000/index.html`

- Node:
  - `npx serve .`

## Project Structure

- `*.html`: page-specific rules and markup
- `assets/app.css`: shared design system + layout
- `assets/app.js`: shared UI behavior (theme, results, history, copy/clear, shortcuts)
- `images/`: d20 assets

## Development Notes

### Where to change UI/UX

- Layout, colors, typography, pills/buttons/cards: `assets/app.css`
- Keyboard shortcuts, history, copy/clear behavior, rendering: `assets/app.js`

### Where to change rules

Each roller’s game logic is in that page’s inline `<script>` block. Typical knobs:

- Minimum allowed stat threshold (reject low rolls)
- Whether dice re-roll `1`s
- Whether the variant rolls 6 stats vs 7-and-drop-lowest
- “Min point target” loops (e.g., keep trying until point buy >= N)

## Compatibility & Data

- Works in modern browsers.
- Uses `localStorage` for theme + history.
- No external services and no server-side dependencies.

## What I’d Improve Next (If This Were Shipping)

- **Accessibility verification**: run axe + Lighthouse, then do manual keyboard-only and screen-reader passes (NVDA/JAWS/VoiceOver) and document findings.
- **Automated tests**:
  - Unit tests for the shared UI helpers (`formatClipboard`, history persistence, clear/reset behavior).
  - Deterministic tests for each roller’s rule logic (inject a seeded RNG / deterministic dice function).
- **Tooling & CI**:
  - Add linting/formatting (ESLint + Prettier or a minimal alternative) and a CI workflow to run them on PRs.
  - Add a simple HTML validation step and link checking.
- **Hardening & performance**:
  - Add stronger error states (e.g., clipboard permission issues) with accessible messaging.
  - Track and cap history size more explicitly and add an optional “export history” text area for power users.

