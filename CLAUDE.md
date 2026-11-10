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
- No test runner is configured.
- Add shadcn components with `pnpm dlx shadcn add <name>` (configured via `components.json`).

## Architecture

- **Path alias:** `@/*` → `src/*`, defined in both `vite.config.ts` and `tsconfig.app.json`. Keep them in sync.
- **Theming:** all tokens live in `src/index.css`. Colours are CSS variables on `:root` (oklch values) and mapped into Tailwind through an `@theme` block (`--color-*`). The `@theme` block wraps values in `hsl(var(--x))`, while the `:root` values are oklch, so check this mismatch when changing tokens. Dark mode uses `@custom-variant dark (&:is(.dark *))`, i.e. a `.dark` class on an ancestor.
- **Components:** `src/components/ui/` holds shadcn primitives (badge, button, card, input, label, separator) built on `radix-ui`, `class-variance-authority`, and the `cn()` helper in `src/lib/utils.ts`.
- **Typeface:** Stevie Sans, loaded from Adobe Fonts via a Typekit stylesheet in `index.html`. `@fontsource-variable/inter` is still imported in `index.css` as a fallback.

## Gotchas

- `README.md` is the unmodified Vite template and doesn't describe this project.
- The parent directory's git repo also tracks the sibling `../fluido` project; work here is scoped to `hand-machine`.
