# Warm reskin: design handoff

**Date:** 15 November 2026
**Status:** Ready to build. Tokens are final apart from the open questions at the end.
**Applies to:** `prototypes/pantry-app` and `prototypes/shopping-list` only
**Tokens in code:** [src/theme-warm.css](src/theme-warm.css), wired into both apps by `src/warm-theme.ts` (15 November 2026). Add `?theme=ds` to the address to see an app on the design system instead.
**Design canvas:** "Shopping list app: 5 versions" on claude.ai, page "Warm palette". Boards: TOKENS-01 (colour), TOKENS-02 (type, spacing, radius and the rest), the two component sheets, PAN-10 and PAN-11 warm, REC-10 warm light and dark.
**Intent:** [../shopping-list/intent.md](../shopping-list/intent.md)

## What this is

A new look for the two pantry apps: cream, brown and olive in place of the design system's stone greys, Dejanire for big headings and recipe text, and 4px corners.

It's a reskin for this project only. **The hand-machine design system isn't changed.** `src/index.css`, `src/components/ui` and the Figma design system file (`iFhn6OwEnxTzQDkx4PNuGe`) stay as they are. The warm values sit in one extra stylesheet that both apps load on top of the design system, switched on by a `theme-warm` class on `<html>`. Take the class away and the app is back on the design system.

Anything this file doesn't mention is unchanged and still comes from the design system: spacing, sizes, icon sizes, shadows, motion (150ms ease-in-out, 100ms enter and exit), z-index, the `@theme` mapping and the radius scale maths.

## How to use this

1. Don't edit `src/index.css` or anything in `src/components/ui`. If a change seems to need one, ask Isaac.
2. In both `main.tsx` files, import `../../shared/src/theme-warm.css` straight after `@/index.css`, and add the class before the first render: `document.documentElement.classList.add("theme-warm")`. `followSystemTheme()` still adds `.dark`, and `.theme-warm.dark` outranks the design system's `.dark`.
3. Use the semantic Tailwind classes as now (`bg-background`, `text-muted-foreground`, `border-border`). Don't type hex values into components. The new colours come through the same variables.
4. For the three serif styles, use the classes in the stylesheet: `type-display`, `type-title`, `type-lead`. Everything else keeps its current Tailwind classes.
5. Update the `theme-color` meta tags (see Build steps).
6. Check both apps in light and dark, and in Storybook check nothing changed (Storybook doesn't load the warm file, so it should look exactly as before).

## Colour

Values in code are oklch, to match `index.css`. The hex is what the mockups use and is in a comment beside each value. "Generated" means Claude filled the gap from the ten swatches. "Changed" means it differs from the boards.

### Light

| Token | Design system | Warm | Where it came from |
| --- | --- | --- | --- |
| `--background` | #FFFFFF | **#F2EFE3** | Swatch |
| `--foreground` | #0C0A09 | **#3D2B1F** | Swatch |
| `--card`, `--popover` | #FFFFFF | **#F2EFE3** | Swatch (same as the page) |
| `--card-foreground`, `--popover-foreground` | #0C0A09 | **#3D2B1F** | Swatch |
| `--primary` | #1D1816 | **#7A6840** | Swatch |
| `--primary-foreground` | #FBFAF9 | **#FFFFE6** | Added (near swatch #FFFFD0) |
| `--secondary`, `--muted`, `--accent` | #F3F1F1 | **#E8E5D8** | Edited by Isaac from swatch #E8E5DA |
| `--secondary-foreground`, `--accent-foreground` | #1D1816 | **#3D2B1F** | Generated |
| `--muted-foreground` | #7C6D67 | **#6B5142** | Swatch |
| `--border`, `--input` | #E8E4E3 | **#D6D1C2** | Added |
| `--ring` | #ABA09C | **#7A6840** | **Changed.** The boards use #C0BCAE (1.7:1). See Focus. |
| `--destructive` | #E7000B | **#9A3324** | Added |
| `--destructive-foreground` | broken (`0 0% 98%`) | **#FFFFE6** | Generated |
| `--chart-1` to `--chart-5` | grey ramp | **#DCC79D, #C2A86A, #8C7740, #6B5142, #3D2B1F** | Generated |
| `--sidebar-*` | copies of the main tokens | copies of the warm tokens | Generated |

### Dark

| Token | Design system | Warm | Where it came from |
| --- | --- | --- | --- |
| `--background` | #0C0A09 | **#2A1D15** | Added |
| `--foreground` | #FBFAF9 | **#F2EFE3** | Swatch |
| `--card`, `--popover` | #1D1816 | **#34241A** | Generated (one step lighter than the page) |
| `--card-foreground`, `--popover-foreground` | #FBFAF9 | **#F2EFE3** | Swatch |
| `--primary` | #E8E4E3 | **#C2A86A** | Swatch |
| `--primary-foreground` | #1D1816 | **#2A1D15** | Added |
| `--secondary`, `--muted`, `--accent` | #2B2422 | **#3D2B1F** | Swatch |
| `--secondary-foreground`, `--accent-foreground` | #FBFAF9 | **#F2EFE3** | Swatch |
| `--muted-foreground` | #ABA09C | **#C0BCAE** | Swatch |
| `--border`, `--input` | white 10%, 15% | **#544136** | Added |
| `--ring` | #7C6D67 | **#C2A86A** | **Changed.** The boards use #6B5142 (2.2:1). See Focus. |
| `--destructive` | #FF6467 | **#E59A86** | Added |
| `--destructive-foreground` | broken | **#2A1D15** | Generated |
| `--chart-1` to `--chart-5` | grey ramp | **#FFFFD0, #DCC79D, #C2A86A, #A79055, #8C7740** | Generated (chart-4 is new) |
| `--sidebar-*` | copies, plus a stray blue primary | copies of the warm tokens, on #34241A | Generated |

### Colours that aren't tokens

The mockups use a few values that don't map to a token. Keep them inside the component that uses them, as the shopping app does with its one-off pieces:

- **The dimmed page behind panels and dialogs:** foreground at 24%, as now.
- **The New review pill:** gold fill #C2A86A, border #7A6840, a soft glow and a dot (see the pantry handoff, "Ingredients list"). In dark, the same gold on #2A1D15 text.
- **Lines inside the warm boards** drawn in #C0BCAE (light) and #6B5142 (dark): use `border-border` instead. The difference is small and it saves a token.

### Contrast

All text passes 4.5:1 in both modes. Two things to know:

- Light: button text #FFFFE6 on the brighter gold #8C7740 is 4.3:1. Don't put text on chart colours.
- Light: chart-1 and chart-2 are under 3:1 on the page. Label them or give them an outline.

## Focus

The ring on the boards fails 3:1 in both modes. In this reskin the ring is primary: #7A6840 on the page is 4.7:1 (4.3:1 on muted), and #C2A86A on the dark page is 7.1:1 (6.4:1 on a card).

The design system also draws its focus ring at 30 to 50% opacity, which would fail again. The warm stylesheet draws a solid 2px outline with a 2px gap on `:focus-visible`, inside `.theme-warm` only. Check that buttons don't show the outline and the faint shadow ring together. If they do, say so rather than changing `button.tsx`.

## Type

Two families, both from the Adobe Fonts kit `tvk6fub` that both `index.html` files already load:

- `--font-sans`: Stevie Sans, then Figtree, then sans-serif. Same as now, with Figtree added as the fallback the mockups use.
- `--font-serif` (new): Dejanire Text (`dejanire-text`), then Georgia, then serif. Regular 400 and Bold 700, with italics.

Only three styles change. The rest of the scale is the same as the current handoffs.

| Style | Was | Warm | Use for |
| --- | --- | --- | --- |
| `type-display` | Stevie Sans 600, 40px, caps | **Dejanire 700**, 40px, line height 1, 0.03em, caps | Recipe titles (REC-10) |
| `type-title` | Stevie Sans 600, 30px, caps | **Dejanire 700**, 30px, line height 1, 0.04em, caps | Page titles |
| `type-lead` | Stevie Sans 400, 17/26 | **Dejanire 400**, 17/26 | Method steps, the recipe intro |

Method steps are drawn at 16/26 on REC-10. Build them at 17/26, the token. The board is 1px small.

Unchanged, all Stevie Sans: step numbers 22 (600), section headings 18 (600, caps, 0.04em), wordmark 16 (600, caps, 0.12em), item names 15/22 (600), body 14/19, small 13/18, captions 12/17, buttons 12 (600, caps, 0.1em), labels 10 (600, caps, 0.1em). As before, use Bold where the mockups say 600 and Regular where they say 500.

## Radius

`--radius` is 4px in this reskin (the design system's is 0.625rem). The `--radius-sm` to `--radius-4xl` steps still work it out from that.

The design system's components hard-code `rounded-none`, so setting `--radius` alone changes nothing. The warm stylesheet rounds them by their `data-slot`, inside `.theme-warm` only:

- **4px:** buttons, toggles, checkboxes, cards, dialogs, popovers, select menus, tooltips, command menus, the table frame, toasts, badges that aren't pills.
- **Round the group, square the inside:** segmented controls (`toggle-group` with no spacing) and steppers (a `role="group"` holding buttons). The group gets 4px and hides overflow. The buttons inside are square.
- **Stays as it is:** pills (`rounded-full`, for example Recipe, Staple, Short, New), underline text fields and selects (a curved underline looks wrong), the side sheet (it sits against the edge of the window), menu items inside a menu, the progress bar.

If a piece the boards show rounded stays square, add its `data-slot` to the list in `theme-warm.css`. Don't add a class to the component in `src/components/ui`.

## Build steps

1. Wire in `theme-warm.css` in `prototypes/pantry-app/src/main.tsx` and `prototypes/shopping-list/src/main.tsx` (see How to use this, step 2). Both can share one small helper next to `system-theme.ts`, for example `useWarmTheme()`.
2. Shopping list `index.html`: change the `theme-color` tags to `#F2EFE3` (light) and `#2A1D15` (dark). Add the same two tags to the pantry app's `index.html`, which has none.
3. Swap the three heading styles for `type-display`, `type-title` and `type-lead` where the table above says. In the pantry app that's the page titles, the REC-10 recipe title and its method. In the shopping list, its recipe screens.
4. Look for hard-coded colours in the two apps' own code (`prototypes/*/src`), such as `text-white` on the destructive buttons in `recipe.tsx`. Change them to the token (`text-destructive-foreground`), or they won't follow the reskin.
5. Light and dark pass on every screen, then `pnpm build` and `pnpm exec vitest run`.

## What the reskin doesn't do

- It doesn't change the Figma design system file. If the warm screens go to Figma, they go in their own file with their own variables (see GAPS.md for how oklch maps to sRGB).
- It doesn't change Storybook or the component showcase page.
- It doesn't touch the Claude connection's consent page (`prototypes/claude-connection`). Say if it should match.

## Open questions

- **Consent page:** reskin it too, so signing in from Claude looks like the pantry?
- **Joined-group selector:** the stepper rule finds a `role="group"` that holds buttons. If a group in either app shouldn't be rounded, give it its own class instead.
- **Promoting it later:** if the warm look is ever wanted across hand-machine, it would become a theme in `src/index.css` and a Figma mode. Not part of this.
