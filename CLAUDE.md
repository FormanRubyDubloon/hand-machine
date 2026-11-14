# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

`hand-machine` is the build side of Isaac Forman's Hand & Machine study: what is the human designer for when a machine can generate the interface? The working thesis is that AI makes production cheap, so value moves to judgement, taste, framing the problem, knowing the user, and taking responsibility. This repo is where that thesis gets tested in practice: experiments, prototypes and components made with AI tools.

What this means for working here:

- **Isaac is a senior product designer (20+ years) and a self-described vibe coder.** He doesn't need design basics explained, but he does want code changes explained in plain terms: what changed, why, and what to check.
- **Design decisions are his.** When a change involves a visual or interaction choice (spacing, colour, hierarchy, copy, behaviour), offer a recommendation with the trade-offs rather than quietly picking one. Those choices are the point of the study.
- **Note what the AI got wrong.** If generated code or design needed correcting, or a tool hit a limit, say so briefly. These notes feed the essay and talk.
- **Plain, direct English.** No inflated phrasing or jargon metaphors.

## Overview

A design system foundation: a Vite + React 19 + TypeScript app styled with Tailwind CSS v4 and shadcn/ui (style `radix-sera`, base colour `taupe`, lucide icons). `src/App.tsx` is a component showcase page, not an application. The package manager is **pnpm**.

## Commands

- `pnpm dev`: Vite dev server (port 5173, see `.claude/launch.json`)
- `pnpm build`: `tsc -b && vite build`
- `pnpm lint`: `oxlint` (config in `.oxlintrc.json`; there is no ESLint)
- `pnpm storybook`: Storybook on port 6006. `pnpm build-storybook` builds it.
- Tests: vitest runs every story as a browser test (Chromium via Playwright, `@storybook/addon-vitest`). There is no `test` script; run `pnpm exec vitest run`, or `pnpm exec vitest run --project storybook -t "<story name>"` for one story. Confirmed working 14 November 2026 (129 tests, about 10 seconds).
- Add shadcn components with `pnpm dlx shadcn add <name>` (configured via `components.json`).

## Architecture

- **Path alias:** `@/*` → `src/*`, defined in both `vite.config.ts` and `tsconfig.app.json`. Keep them in sync.
- **Theming:** all tokens live in `src/index.css`. Colours are CSS variables on `:root` (oklch values) and mapped into Tailwind by the `@theme inline` block (`--color-*`); don't wrap them in `hsl()`. Dark mode uses `@custom-variant dark (&:is(.dark *))`, i.e. a `.dark` class on an ancestor.
- **shadcn CLI:** the root `tsconfig.json` must carry the `@/*` path alias, otherwise `shadcn add` writes into a literal `@/` folder. After adding or overwriting components, check they import `cn` from `@/lib/utils` (the CLI has emitted `from "cn"`, the unrelated npm package) and that stock `radix-sera` styling (square corners, uppercase buttons) is intact. `shadcn add` also rewrites `src/index.css` fonts (to Noto Sans and Playfair Display), `src/lib/utils.ts` and `button.tsx`, and re-adds the `cn` and `@fontsource-variable/*` packages. Revert those and keep only the new component files (`git checkout` them, then fix the `cn` import).
- **Components:** `src/components/ui/` holds shadcn primitives built on `radix-ui`, `class-variance-authority`, and the `cn()` helper in `src/lib/utils.ts`. Each component has a `<name>.stories.tsx` beside it; add one when you add a component.
- **Storybook:** config in `.storybook/`. Stories sort Foundations (`src/foundations/`: colour, typography, spacing, shape, motion) before UI. The Theme toolbar toggles the `.dark` class on `<html>` so portalled content (dialog, select, tooltip) follows. The a11y addon is set to `todo`, so violations show but don't fail tests.
- **Figma mirror:** `GAPS.md` records where Figma can't match the code (oklch to sRGB, `calc()` radii as fixed px, invented primitive names). Update it whenever Figma and code diverge. `src/index.css` is the source of truth for tokens.
- **Prototypes:** experiments live in `prototypes/<name>/`, each with its own `index.html` served by the root Vite app at `/prototypes/<name>/` (add it to `build.rollupOptions.input` in `vite.config.ts`; `tsconfig.app.json` includes `prototypes/*/src`). Prototypes import from `@/components/ui`. `prototypes/shopping-list` is the first: a phone web app that syncs with a mock pantry (`src/mock-pantry.ts`), state in localStorage. It follows `prototypes/shopping-list/HANDOFF.md` and `intent.md`; read `intent.md` before changing it. Pieces the handoff marks "new" live in `prototypes/shopping-list/src/components.tsx`, not in `src/components/ui`.
- **Typeface:** Stevie Sans, loaded from Adobe Fonts via a Typekit stylesheet in `index.html`. `@fontsource-variable/inter` is still imported in `index.css` as a fallback.

## Gotchas

- `README.md` is the unmodified Vite template and doesn't describe this project.
- The parent directory's git repo also tracks the sibling `../fluido` project; work here is scoped to `hand-machine`.
