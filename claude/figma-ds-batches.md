# Collca design system in Figma: batches

> This document was generated with AI.

24 Nov 2026 · Isaac Forman

Target file: **Collca DS components** (`b87ZMgtHyvpfWpvqgR4WdN`). Source of truth stays the code: `src/index.css`, `prototypes/shared/src/theme-warm.css`, `prototypes/shared/src/category-look.*`, `src/components/ui/`, `prototypes/pantry-app/src/components.tsx`, `mobile/src/ui/`.

## What's different from the earlier mirror

There is already a Figma mirror (the "Untitled" file `iFhn6OwEnxTzQDkx4PNuGe`, recorded in `GAPS.md`). It mirrors the **taupe** design system: 18 shadcn components, square corners. Collca doesn't look like that. Both Collca web apps load the **warm reskin** (`theme-warm.css`: cream, brown and olive, 4px radius, Dejanire for display and title), and the phone copies the same hexes into `mobile/src/ui/theme.ts`. So this file should be built on the warm tokens, not copied from the old file.

What carries over from the old mirror is the method, and the Figma limits it already found (all in `GAPS.md`): oklch converted to sRGB, `calc()` radii as fixed numbers, alpha needing its own tokens because opacity on a bound paint is lost in instances, rings as drop shadows or outside strokes, weights mapped by style name, the 240-variant Button being heavy.

## Decisions for you before Batch 1

1. **Which themes become modes.** Recommendation: two modes, Light and Dark, from `theme-warm.css`, plus a third **Focus** mode for the always-dark phone screens (item sheet, cooking view, toast). Trade-off: Focus as a mode keeps components single; the alternative, a `tone` variant on each row, is what the old mirror planned and doubles the variants.
2. **The phone's dark palette doesn't match the web's.** Web dark background is `#2A1D15`, panel `#34241A`, border `#544136`; the phone uses `#1F1712`, `#2C2119`, `#45362A`. Figma can hold one Dark. Recommendation: pick one and change the other app to match; until then, use the web values and note the gap.
3. **One library or two.** Recommendation: one file, with a Web page and a Phone page sharing tokens. The phone kit is React Native and doesn't use the shadcn pieces, so its components are separate, but the colours are the same.
4. **Leave out the taupe system.** The shadcn components exist in taupe form in the old file. Recommendation: rebuild them here in warm only, and stop maintaining the old file.
5. **Fonts.** Stevie Sans and Dejanire Text must be installed on the Mac for Figma to render them. The phone currently substitutes Figtree and the system serif (licence not checked). The Figma file should show the real faces.

## Before any batch: access

Neither route to the file works yet.

- The Figma connector says this account doesn't have **edit access** to the file. Share it with the account the connector uses (or open the connector's account in Figma and check which one it is).
- The **Desktop Bridge** plugin isn't open, so the console tools have no file. Open the file in Figma desktop and run the plugin, if you want that route as well.

## Batch 1: Foundations (done 24 Nov 2026)

Built through the Desktop Bridge plugin; details and gaps in `GAPS-COLLCA.md`. Component-specific text styles moved to Batch 2. Decisions 1, 3, 4 and 5 were taken as recommended. Decision 2: the web's dark palette wins, and the phone's `theme.ts` was changed to match.

No components. Everything else binds to these.

- **Primitives** (hidden): the ten warm swatches and the generated ones, named by hex role (for example `warm-cream-50`), oklch strings in the descriptions. Alpha primitives as needed (the press overlays `rgba(61,43,31,0.1)` and `rgba(242,239,227,0.12)`, the dark row text at 70% and border at 20%).
- **Semantic** (Light, Dark, Focus): every variable in `theme-warm.css`, including `line-strong`, plus the phone-only roles (`placeholder`, `press`, Focus's `gold`, `place`, `label`, `field`).
- **Tag hues:** the twelve named hues in `category-look.css`, with `--category-tint` as the opacity. They're always drawn as a tint over the background, so the tokens should be the tinted result per mode, not the solid hue (opacity on a bound paint is lost in instances).
- **Radius:** `radius` 4 and the derived steps, fixed.
- **Spacing:** the same step variables as the old mirror, added to as later batches need.
- **Type styles:** `display`, `title`, `lead` (Dejanire, uppercase where the code says so), then the Stevie Sans slot styles (`button`, `label`, `badge`, `card-title`, `input`, and so on), plus the phone kit's `Body`, `Caption`, `Name`, `Display`, `Label`.
- **Effects:** `shadow-sm`, `shadow-md`, the ring styles.
- **Foundations page:** swatches in all three modes, the type scale, spacing, radius, tag hues.

Check: screenshot each mode against the Storybook Foundations stories (with the warm class on).

## Batch 2: Core controls (web) (done 24 Nov 2026)

Built with an Icons page (28 interface icons, 63 tag icons). Details and gaps in `GAPS-COLLCA.md`.


The shadcn primitives everything else is built from, in the warm theme.

`button`, `badge` (including `solid` and `outlined` pills), `label`, `input`, `textarea`, `input-group`, `checkbox`, `radio-group`, `switch` (rounded track, as of today), `select`, `toggle`, `toggle-group`, `separator`, `tooltip`.

- Button: start with `state` default, hover, focus-visible and disabled only, to avoid the 240-variant problem. Add `aria-invalid` if you want it.
- Icons: a real swappable Lucide icon component (instance swap), not the placeholder vector the old mirror used. That needs a small icon set first: the ones the apps use most.

## Batch 3: Containers and overlays (web) (done 24 Nov 2026)

Details and gaps in `GAPS-COLLCA.md`.


`card`, `alert`, `dialog`, `sheet`, `drawer`, `popover`, `command`, `tabs`, `table`, `sonner` (dark toast), `skeleton`, `progress`, `avatar`.

Most of these are composition. Build parts (header, content, footer) as their own components so instances stay editable.

## Batch 4: Collca rows and counters (web) (done 24 Nov 2026)

Details and gaps in `GAPS-COLLCA.md`. The current row is primary, not Focus, so it has its own tone variants.


The design system's own components, written for the shopping list and pantry and never built in Figma.

`count-box`, `tick-box`, `list-row`, `item-row`, `swipe-row` (static frames: resting, shifted, action showing), `segment-bar`, `summary-stats` (with the clickable stat and chevron), `keypad`, `sync-bar`, `filter-chips`, `store-row`, `choice-row`.

- Dark rows (`list-row` `data-tone=current`) come out of the Focus mode if decision 1 goes that way.

## Batch 5: Collca web app pieces (done 24 Nov 2026)

Promoted to the Figma library only; the code stays in the pantry app. Details and gaps in `GAPS-COLLCA.md`.


From `prototypes/pantry-app/src/components.tsx`. These were built locally in the app; putting them in the library is a promotion, so check the list first.

- **Status and labels:** `StockPill`, `OrderedPill`, `TagPill` (twelve hues and an icon slot), `NewPill`, `EstimateMark`, `StockMark`, `ExpiryAlert`.
- **Headings:** `Eyebrow`, `PageTitle`, `SectionTitle`, `HeadingTip`, `ZigZag`.
- **Controls:** `Stepper`, `Segmented`, `Field`, `SortSelect`.
- **Filters and panels:** `FilterGroup`, `FilterChecks`, `FilterSidebar`, `SidePanel` (the item panel's frame).
- **Rows:** `HistoryRow` (who: you, phone, Claude, Collca), `UnitRow`, `NavRow`, `Empty`.
- **Brand:** the Collca emblem and splash emblem.

## Batch 6: Phone kit (done 24 Nov 2026)

On a Phone page. The kit's `dark` prop is the Focus mode. Details and gaps in `GAPS-COLLCA.md`.


From `mobile/src/ui/kit.tsx` and its neighbours, on a Phone page, at iPhone sizes.

`Button`, `IconButton`, `BackLink`, `Stepper` (the In stock and Minimum pair), `Toggle`, `Segmented`, `Chip`, `Pill`, `InfoBox`, `Field`, `Picker`, `AisleField`, `Divider`, `Row`, the bottom sheet, the toast, the conflict card, the timer button, and the top tab bar (emblem as Home, word tabs, search, settings).

- Focus-mode screens (item sheet, cooking view) use the Focus mode.
- Press states are the `press` overlay, not a colour change.

## Batch 7: Check and record (done 24 Nov 2026)

Web measured in Storybook (all matched but one row height, fixed); phone compared with the simulator. Gaps found: Storybook doesn't load the font kit, and the phone's list row, count box, Home tiles and location cards aren't in the kit. Details in `GAPS-COLLCA.md`.


- Screenshot every component set in each mode and compare with Storybook (web) and the simulator (phone).
- Start a Collca section in `GAPS.md`, or a new `GAPS-COLLCA.md`, for where this file and the code differ. Recommendation: a new file, so the old mirror's notes stay readable.
- Optional: Code Connect, so Dev Mode shows the real component code.

## Batch 6b: Phone screen pieces (done 24 Nov 2026)

The pieces Batch 7 found in the phone's screens rather than `mobile/src/ui`: the list row and its count box, the list heading (aisle header with the filter button), the Home tiles and the Pantry location cards. On the Phone page, under the phone kit. Details in `GAPS-COLLCA.md`.

## Not included

- The shopping-list web app's own components (`RecipePill`, `SyncReminder` and others): the app is switched off.
- Screens. This is the component library; screens can follow once it's in place.
- Prototype interactions and motion.

## Size

About 75 components over six build batches, 10 to 20 each. Batch 1 is the one to get right: every later batch binds to it, and changing token names afterwards means rebinding.
