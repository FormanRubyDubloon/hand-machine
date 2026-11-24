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

## Batch 2: Core controls (24 November 2026)

Pages: **Icons** (91 components) and **Components** (15 component sets, 347 variants, plus `select-label`, `select-separator` and `select-content`). All in the warm theme, checked in Light and Dark.

### Icons

- Lucide 1.70.0 (the version in `node_modules`), 24 × 24, stroke 2. 28 interface icons (the ones the apps use most) as `icon/*`, and the 63 tag icons from `category-look.ts` as `tag-icon/*`. Strokes are bound to `foreground`; override the colour in an instance.
- **Stroke width doesn't scale.** In code a 14px icon draws a 1.17px stroke (the SVG scales). In Figma the stroke stays 2 when an instance is resized, so the components here set it by hand (2 × size ÷ 24). Do the same when resizing an icon instance.
- Lucide 1.x renamed some icons; `trash-2` is an alias for `trash`. The Figma names follow the code's imports.
- The plugin has no network access, so the paths were read from `node_modules` and passed in.

### Tokens added

In `Semantic`, under `state/`, all raw values (an alias can't carry alpha) with invented names: `primary-80`, `ring-30`, `outline-hover`, `secondary-hover`, `ghost-hover`, `destructive-bg`, `destructive-bg-hover`, `destructive-40`, `destructive-invalid`, `destructive-ring`, `foreground-70`, `destructive-70`, `foreground-10`, `input-50`, `border-50`, `switch-thumb`, `switch-thumb-checked`. Each description has the code. `secondary-hover` is an oklch `color-mix` in code, worked out once in sRGB here. In Focus, alpha tokens over `input` (`outline-hover`, `input-50`) use the Focus line colour.

Spacing `8_25` (33) and `6_25` (25) for the switch. Text styles `role/badge`, `role/label-control`, `role/select-label`. Effect styles `focus-ring-control`, `invalid-ring`, `popover`.

### Focus in the warm theme

`theme-warm.css` draws a solid 2px outline at 2px offset on every `:focus-visible` element, on top of each component's own focus classes. So:

- **Buttons, toggles, checkboxes, radios and switches** (`focus-ring-control`): the component's `ring-2 ring-ring/30` fills the first 2px, the outline the next 2px. Built as three spread shadows: ring at 4px, background at 2px, ring/30 at 2px. The border also turns `ring`.
- **Inputs, textarea, select trigger** (`focus-ring`): underline turns `ring`, and the outline draws round the whole field, square.
- **Input group:** the outline goes round the focused input inside the group, not the group.

**Figma limits found:**
- **Shadow spread only draws on a frame that clips its content.** Every component with a ring has clip content on.
- **Spread also needs a fill to cast from.** Variants with no fill (outline, ghost and link buttons, unchecked checkbox and radio, unpressed toggles, inputs) get a `background` fill in their focus or invalid state. On a normal page it looks the same; on another surface (a card, a muted panel) it will show as a background-coloured box.
- An exported single node leaves its shadows out. Check rings in a parent frame.

### Button (192 variants)

- `variant` × `size` (default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg) × `state` (default, hover, focus-visible, disabled). `aria-invalid` isn't built; add it if a screen needs it.
- Properties: `label`, `icon-start` and `icon-end` (booleans), `icon-start-swap` and `icon-end-swap` (instance swap). Icon sizes show the start icon only.
- Not built: the smaller padding beside an icon (`has-data-[icon=inline-start]:pl-4`), the 1px press (`active:translate-y-px`), `aria-expanded`.
- **`bg-clip-padding` isn't modelled.** The 1px transparent border sits over the fill here; in code the fill stops inside it.
- `link` doesn't use the `label` property (Figma copies text formatting across every linked text, so the underline spread). Edit its text directly.

### Badge (14 variants)

- `variant` (the six text variants, plus `solid` and `outlined`, the Out and Low pills) × `state` (default, hover). Pills have no hover in code. Hover on default, secondary, destructive and outline only happens when the badge is a link. Focus ring not modelled.

### Label, Separator

- Label `beside` = none or control (the sentence-case style next to a checkbox, radio or switch) × `state`. Figma can't see a neighbouring input, so pick disabled by hand.
- Separator lengths are placeholders (code: full width or stretch).

### Input, Textarea, Input group (8 variants each)

- `value` (placeholder, filled) × `state` (default, focus-visible, aria-invalid, disabled). Two text properties, `placeholder` and `value`.
- **Desktop size only:** `text-sm` (`md:text-sm`). The base `text-base` is for phone widths, and the phone uses the native app.
- Width 320 (code: full width). Input `type=file` not built. Textarea hugs its text with `min-h-16`.
- Input group: `addon-start` (an icon, swappable) and `addon-end` (text) toggles. Block-start and block-end addons and `InputGroupButton` aren't built.

### Checkbox, Radio, Switch (8, 8, 16 variants)

- `checked` × `state` (default, focus-visible, aria-invalid, disabled); Switch also `size`. Checkbox is rounded by the warm theme; radio is always round.
- Unchecked checkbox and radio have a `background` fill (code: transparent), for the rings.
- Checked + invalid keeps the checked border with the red ring (the code sets both; output order decides, as noted in `GAPS.md`).
- Switch thumb corners are 2 (code: `calc(var(--radius) - 2px)`); the track binds `radius`. The thumb sits 1px inside the border at each end.
- Hit areas (`after:-inset-*`) and the Field-group rules aren't modelled.

### Toggle (48), Toggle group (2)

- Toggle: `variant` × `size` × `pressed` × `state`. Focus is drawn with the 2px control ring (code: `ring-[3px]`).
- Toggle group: joined (`spacing=0`) only, three toggle instances, first pressed. The group is rounded and clips; the items are square, and outline items drop their left border except the first. Edit `pressed` and `label` on each item.

### Select

- `select-trigger` (16): `size` × `value` × `state`. Fixed 220 wide (code: `w-fit`) so the chevron sits at the right. Square.
- `select-item` (6): `checked` × `state` (default, focus, disabled); focus is CSS `:focus`, the highlight.
- `select-label`, `select-separator` (`border/50`; the `-mx-1.5` bleed isn't modelled), and `select-content`: an example menu, 260 wide (code: `min-w-36`, grows to fit), popover fill, rounded, `shadow-md ring-1 ring-foreground/10`. Scroll buttons not built.

### Tooltip (4)

- `side` (top, bottom, left, right) is where the tooltip sits. The arrow is a 10px square at 45°, its centre 2px inside the edge facing the trigger. Rounded by the warm theme. `max-w-xs` not enforced.

### Not in Batch 2

`input-otp`, `kbd` and `field` aren't in the repo. Prototype interactions and transitions aren't built.
