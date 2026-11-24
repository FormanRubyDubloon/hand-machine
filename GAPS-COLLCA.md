# GAPS: Collca

Where the Collca Figma library and the code differ, and decisions made while building it. The plan is in `claude/figma-ds-batches.md`. `GAPS.md` covers the older taupe mirror, and its notes on Figma limits apply here too.

Figma file: "Collca DS components" (`b87ZMgtHyvpfWpvqgR4WdN`), built through the Figma Console Desktop Bridge plugin. Sources of truth: `prototypes/shared/src/theme-warm.css` (colour, type, radius), `prototypes/shared/src/category-look.*` (tags), `src/index.css` (spacing, radius maths), `mobile/src/ui/theme.ts` and `kit.tsx` (phone).

## Batch 1: Foundations (24 November 2026)

### Collections

| Figma | Code | Note |
|---|---|---|
| `Primitives` (Default, hidden) | none | Every distinct colour from the warm theme and the phone. Names are invented: family (`earth`, `gold`, `red`) and a number from oklch lightness, (1 − L) × 1000 rounded to 10. The hex is in each description. |
| `Semantic` (Light, Dark, Focus) | `theme-warm.css` `:root.theme-warm` and `.dark` | Names match the CSS variables. Each aliases a primitive, except `tag/*` (see Tags). |
| `Theme` (Default) | `@theme inline`, `--radius`, `--spacing`, fonts, text sizes | Mode-independent numbers and strings. |

### Decisions taken as recommended in the plan

- **Focus is a third mode.** It's the phone's always-dark screens (`theme.ts` `focus`: item sheet, cooking view, toast). The web has no Focus. Mapped: background `#3D2B1F`, card, popover, secondary, muted and accent `#2A1D15` (the phone's `field` and `toast`), primary and ring `#C2A86A` (`gold`), primary-foreground `#1F1712` (`onGold`), muted-foreground `#C0BCAE` (`label`), border and input `#F2EFE3` at 18% (`line`). Charts and sidebar copy Dark: the phone has neither. The phone's `place` colour (`#DCC79D`) isn't a token yet; add it in Batch 6 if it's used.
- **Dark is the web's palette, and the phone now matches it** (Isaac's decision, 24 November 2026). The phone's dark colours in `mobile/src/ui/theme.ts` changed: background `#1F1712` → `#2A1D15`, panel `#2C2119` → `#3D2B1F` (web `muted`), line `#45362A` → `#544136`, muted text `#C4B6A3` → `#C0BCAE`, stone `#5E4C3D` → `#6B5142` (web `line-strong`), text on olive and on danger `#1F1712` → `#2A1D15`. The old primitives were removed from Figma. `placeholder` and `press` are still phone only. The Focus palette (always-dark screens) is unchanged and keeps `#1F1712` for text on gold.
- **Warm only.** No taupe tokens.

### Colour

- **Phone-only tokens:** `placeholder` (web placeholders use `muted-foreground`) and `press` (the pressed overlay, an alpha colour).
- **`destructive-foreground`** is `#FFFFE6` on the web (marked "generated" in the CSS); the phone's `onDanger` is `#FFFFFF` in light. The white primitive exists but isn't used.
- **The warm theme's hexes are taken from the CSS comments,** not converted from the oklch values. They're the mockup values the oklch was made from, so they should match within rounding.
- `--ring` in both modes was changed from the mockups for contrast (noted in the CSS); Figma follows the CSS.

### Tags

- Twelve solid hues in `Primitives` (`tag-hue/*`, converted from `oklch(0.7 0.13 h)`), and twelve tints in `Semantic` (`tag/*`).
- **Tints are raw values, not aliases.** The code draws the hue at `--category-tint` opacity (34% light, 26% dark) over whatever is behind. An alias can't change alpha, and opacity on a bound paint is lost in instances (`GAPS.md`), so each tint holds the hue with the alpha built in. Changing a hue means changing it in both places.
- **Focus uses 26%**, like Dark. The code has no Focus tint.
- **Teal is outside sRGB.** Its red channel (−0.38) is clipped to 0.
- `category-tint` is also a number variable (34, 26, 26), for reference.
- Tag icons (63 Lucide names) aren't in Batch 1; they come with the icon set in Batch 2.

### Radius

- `radius` is 4 (warm theme). The steps (`sm` 2.4, `md` 3.2, `xl` 5.6, `2xl` 7.2, `3xl` 8.8, `4xl` 10.4) are `calc()` in code and fixed numbers here: they won't follow `radius`. `radius-lg` aliases `radius`.
- Added `radius-pill` (9999, for `rounded-full` pills) and the phone's `radius-sheet` (12) and `radius-dialog` (8).
- The warm theme rounds components by overriding `rounded-none` with `[data-slot]` rules. Components in Batch 2 will bind `radius` directly.

### Spacing

- Same approach as `GAPS.md`: one fixed variable per step (`spacing-1_5` = 6, and so on), scoped to Gap and Width/Height. The set is the old mirror's, without `0_25`, `6_25` and `8_25`, plus `12`. Add steps when a component needs them.
- Phone `space-screen` (20) and `space-row` (12) alias `spacing-5` and `spacing-3`.

### Type

- **Fonts.** Stevie Sans and Dejanire Text, both installed. The phone currently draws Figtree and Georgia (licence not checked); Figma shows the real faces, as planned.
- **Weights.** As in `GAPS.md`: the web kit serves 400 and 700, so semibold and bold become Bold, medium and normal become Regular. Dejanire's 700 is Bold.
- **Phone weights.** Figtree 500 (`Name`) is shown as Stevie Sans Medium, which the web never uses. Figtree 600 (`Label`) is Stevie Sans Bold: there's no semibold face.
- **Styles:** `serif/display`, `serif/title`, `serif/lead` (the warm theme's three), the sans scale `sans/text-xs` to `sans/text-2xl` in Regular and Bold, roles used across the pantry app (`role/eyebrow`, `role/page-subtitle`, `role/section-title`, `role/label`, `role/button`), and the phone kit (`phone/display`, `name`, `body`, `caption`, `label`). Component-specific styles (select item, tabs trigger and so on) come with their components in Batch 2.
- **Unitless line heights** (`leading-none` on title and display, `leading-tight` on section title) are px or percent. Display and title bind to `text-display--line-height` and `text-title--line-height` as px.
- **Sizes not on the scale** (10px eyebrow, 13px subtitle, 22px section title, the phone's 13, 14/19, 16/22, 18/23) aren't bound to variables.
- **`phone/display` is size 30.** The kit's `Display` takes any size; line height and spacing are worked out from it (× 1.08, × 0.035). Other sizes need their own style or an override.

### Effects

- `shadow-sm` and `shadow-md`: Tailwind's values, black at 10%, not bound (as in code).
- `focus-ring`: the warm theme draws focus as `outline: 2px solid var(--ring); outline-offset: 2px`, not the design system's translucent ring. Built as two spread shadows, ring at 4px under background at 2px, both bound. On a node with no fill, use an outside stroke instead.
- **Figma limit found:** `setBoundVariableForEffect` reset the shadow spread to 0. The spread had to be set again after binding.
- The design system's translucent ring styles (`ring-2 ring-ring-30` and so on) aren't created: the warm theme overrides them.

### Foundations page

Swatches for every semantic colour in all three modes, the tag tints, every text style, radius, spacing and effects. All bound to variables, so it updates when a token changes.
