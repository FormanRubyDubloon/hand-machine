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

## Batch 3: Containers and overlays (24 November 2026)

On the Components page: card (with `card-header`, `card-content`, `card-footer`), alert, skeleton, progress, avatar and `avatar-group`, `dialog-content` and `dialog`, sheet, `drawer-content`, `popover-content`, `tabs-trigger` and `tabs-list`, `table-row` and `table`, `command-item` and `command`, and `toast` (Sonner). Checked in Light and Dark.

### Which pieces the warm theme rounds

Card, dialog, popover, command, the table container and the toast are rounded to `radius` (4). Alert, sheet, drawer, tabs, skeleton and progress aren't in the theme's list, so they stay square. The toast's action button stays square (`!rounded-none`). Titles stay in Stevie Sans: `font-heading` is the sans in the warm theme, which only moves display, title and lead to Dejanire.

### Tokens and styles added

- `state/`: `foreground-5` (card ring), `overlay` (black 20%), `destructive-90`, `muted-50`, `primary-foreground-70`, `tab-text`, `tab-active-bg`, `tab-active-border` (transparent in Light, `input` in Dark). Raw values, invented names.
- `spacing/card-spacing` (aliases `spacing-8`) and `spacing/card-spacing-sm` (aliases `spacing-5`); the second name is invented, since the code switches one variable with `data-[size=sm]`.
- Text styles: `role/card-title` (also sheet and drawer titles), `role/card-description` (all the leading-relaxed descriptions), `role/dialog-title`, `role/popover-title`, `role/tabs-trigger`, `role/table-head`, `role/shortcut`, `role/alert-title`, `role/toast-title`, `role/toast-description`.
- Effect styles: `card` (shadow-sm plus a 1px foreground/5 ring), `toast` (Sonner's own 0 4px 12px shadow).

### Card

- `card` (size default, sm) holds instances of `card-header`, `card-content` and `card-footer` of the same size; `header`, `content` and `footer` toggles. The header instance is exposed, so its `title`, `description`, `show-description` and `action` show on the card.
- Width 380 (code: fluid). The header is a grid in code (`1fr auto`); auto layout here. Not built: the optional header and footer borders, images, container queries.

### Alert

- `variant` × `action`; action is a variant because it changes the right padding (`pr-18`). The 2px indicator runs down the left edge over the border. Width 420.
- **Linked properties share one starting value.** The destructive variants start with the default text and info icon; change them on the instance. (Same with the pill samples in Batch 2.)

### Skeleton, Progress, Avatar

- Skeleton: one muted rectangle, no pulse.
- Progress: five steps (0 to 100), 2px tall, width 320.
- Avatar: `size` (sm 24, default 32, lg 40), `initials`, `badge`. A plain border here; the code blends it (`mix-blend-darken`, `dark:mix-blend-lighten`), which Figma can't switch by mode. No image. Avatar group overlaps by 8 with a 2px background ring, later avatars on top as in the browser.

### Dialog, Sheet, Drawer, Popover

- `dialog-content`: 448 wide, header (gap-2 plus the description's `mt-0.5`, so 10), footer in its `sm:` layout (row, right-aligned), close button (ghost icon-sm on `bg-secondary`, `x` icon). `dialog`: the content centred on a 1200 × 760 overlay (20% black, 8px background blur; Figma's blur doesn't match a CSS pixel blur exactly).
- `sheet`: right (384 wide, 760 tall) and bottom (1200 wide, hugs). Left and top not built. Footer buttons fill the width (`flex-col`).
- `drawer-content`: bottom only, 390 wide (phone), centred header, muted handle. `md:text-left` not built.
- `popover-content`: 288 wide, header and a body placeholder.
- In each, the description's `mt-0.5` is folded into the header gap: Figma text layers can't take padding.

### Tabs

- `tabs-trigger`: `variant` (default, line) × `state` (default, hover, active, focus-visible, disabled), horizontal only, 31 high. Line's active bar is 2px, 5px below the trigger. Focus uses the control focus style; the code's `ring-[3px] ring-ring/50` and 1px outline are approximated.
- `tabs-list`: three triggers, first active. Triggers hug their labels here; in code they share the width (`flex-1`). Vertical tabs not built.

### Table

- `table-row`: header, body (default, hover, selected) and footer, four cells with `col-1` to `col-4` text properties (body rows only). Cell widths are fixed placeholders; HTML tables size columns to content.
- `table`: header, three rows, caption. The last row drops its border by hand (code: `[&_tr:last-child]:border-0`).

### Command

- `command-item`: default, selected, disabled; `icon`, `label`, `shortcut` properties. `command`: search (an `input-group` instance), two groups with headings, a separator. 320 wide. No shadow (CommandDialog puts it in dialog-content). Empty state and checked items not built.

### Toast (Sonner)

- Dark toast: primary fill and border, primary-foreground text, description at 70%. In Dark mode that's gold with dark text, as the code says.
- Sonner's own CSS sets the layout (356 wide, 16 padding, 6 gap, 13px text); these numbers come from Sonner's defaults, not this repo, so they aren't bound to tokens.
- Only the info icon is in the set (Sonner also uses circle-check, triangle-alert, octagon-x and a spinner). Cancel button not built.

### Figma limit found

- **Text layers can't take padding.** Setting it threw "object is not extensible"; spacing that the code puts on text (`mt-0.5`) goes into the parent's gap.

## Batch 4: Collca rows and counters (24 November 2026)

One section, "rows and counters", on the Components page: `count-box`, `tick-box`, `list-row-text`, `list-row`, `item-row`, `swipe-row`, `segment-bar`, `summary-stat` and `summary-stats`, `sync-bar`, `keypad-key` and `keypad`, `filter-chip` and `filter-chips`, `store-row`, `choice-row`. All at phone width (390). Checked in Light, Dark and Focus.

These were written for the phone web app, which is switched off; the native app has its own kit (Batch 6). They're still the design system's components, and the pantry app uses some.

### The "current" row isn't Focus

The plan said dark rows would come from the Focus mode. They don't: a current row (`tone=current`) uses `bg-primary text-primary-foreground`, so it's olive in Light and gold in Dark and Focus, not dark brown. Count box, list-row text and tick box have a `tone` (or `inverse`) variant for a current row instead; the code flips them with `group-data-[tone=current]`, which Figma can't read from a parent.

### Shape

None of these are in the warm theme's rounding list, so they're square on the web, except the filter chips, which are `rounded-full` pills. (The native app rounds its own count boxes; that's Batch 6.)

### Tokens and styles added

- `state/primary-foreground-10`, `-20`, `-40` (things on a current row). Raw values, invented names.
- Spacing `13` (52, count box), `15` (60, keypad key), `21` (84) and `23` (92) (row heights).
- Icons `delete` (keypad), `circle-check` and `octagon-x` (the toast types Batch 3 was missing).
- Text styles under `row/`: `count`, `count-sm`, `count-wide`, `title-lg`, `title-md`, `title-sm`, `description`, `description-sm`, `stat-value`, `keypad`, `chip-count`, `sync-note`. `font-medium` titles render the 400 face, as elsewhere.

### Components

- **count-box** (30): `variant` (default, filled, done, skipped, add) × `size` (default 52, sm 40, wide 44 × at least 56) × `tone`. The code's `inverse` variant is the same as default on a current row, so it isn't separate. Dashes are 3/3 (browsers draw their own). Done's check is stroke 2.5.
- **tick-box** (4): `checked` × `inverse`. 28px, 18px check.
- **list-row-text** (6): `title-size` (lg 22, md 20, sm 17) × `tone`, with `eyebrow` and `description` toggles. The code widens the gap to 6 when there's an eyebrow; one component can't, so it stays 4.
- **list-row** (12): `tone` (default, current, muted, quiet) × `size` (min height 64, 84, 92). The text and count box are exposed instances; `trailing` hides the box. Focus ring not built.
- **item-row** (6): to get (no pill, Out, Low), partly got, got (struck through, grey, done box, no pill), skipped (muted row, struck through, eyebrow-style sub-line, skipped box). A badge can replace the pill. The name and box are separate buttons in code; their focus rings aren't built.
- **swipe-row** (3): still frames of a gesture. `left` shows Got 1 (primary) on the right, `right` shows Undo (muted) on the left, the row moved 104px. The icon's 125% "armed" scale isn't shown.
- **segment-bar** (5): four 2px segments, `filled` 0 to 4.
- **summary-stat** (2) and **summary-stats**: three equal cells, the third clickable with a chevron. The last cell's right border is turned off by hand.
- **sync-bar** (2): two progress positions; the refresh icon spins in code.
- **keypad-key** (6): digit, label (Clear) or delete × default or pressed (hover and active are both bg-muted; the 1px press isn't built). **keypad**: 1 to 9, Clear, 0, Delete in a 3-column wrap, 350 wide.
- **filter-chip** (3): off, hover, on, with an optional count. **filter-chips**: All, Out, Low with the first on.
- **store-row** (2): tick box and name (one button), and an outline icon-lg Edit button (18px pencil). On a current row the button's border is primary-foreground/20.
- **choice-row** (2): a whole-row button (size lg) with tick box, eyebrow, md title and description; selected is a muted row.

### Figma limit found (again)

- **Resizing after setting "hug" fixes the size.** `resize()` quietly turns a hugging frame back to a fixed one. It cut off the store row's description and fixed the sync bar at 80. All Components-page frames were checked for content taller than the frame; none are left.
- **One long script timed out** (three minutes) with nothing saved; the same work in four smaller scripts took under a second each. Something in the long one stalled; keep scripts short.

## Batch 5: Collca web app pieces (24 November 2026)

A "pantry app" section on the Components page, from `prototypes/pantry-app/src/components.tsx`, `category-look.tsx` and `splash-emblem.tsx`. Checked in Light and Dark.

**These are promoted to the library, not the code.** The components file says to ask before promoting any of them into `src/components/ui`; Isaac's go-ahead for Batch 5 covers the Figma library only. The code stays in the pantry app.

### What's built

- **Headings:** `eyebrow`, `page-title` (Dejanire title, 13px subtitle, an action on the right; 900 wide), `zig-zag` (the rule under a page header), `section-title`, `heading-tip` (a column heading with a dotted underline; Figma has no dotted underline, so it's a 1/2 dashed line).
- **Marks and pills:** `expiry-alert` (14px red triangle), `estimate-mark` (sm 16, lg 24, boxed ≈), `tag-pill` (plain: Staple, Recipe, Claude, One-off; ordered: check and Ordered), `new-pill`, `stock-mark` (have, some, listed, little, missing). Out and Low are the badge's `solid` and `outlined` variants, so StockPill isn't separate.
- **Tags:** `category-mark` (42: the twelve tints, none and empty, at sm 20, md 28, lg 36; rounded-sm; icon stroke 1.75, swappable from the tag icons) and `category-label`.
- **Controls:** `stepper` (sm 28, md 40), `segmented` (default, sm), `field` (label, an exposed control, optional hint), `sort-select` (190 wide).
- **Filters and panels:** `filter-option` (default, hover, selected), `filter-check`, `filter-sidebar` (240 wide, 640 tall here), `side-panel` (560 × 760; header with eyebrow, title, badges and description; body; footer; close).
- **Rows:** `history-row` (default, undone, compact), `unit-row` (in stock, empty), `nav-row` (default, hover, current), `empty`.
- **Brand:** `collca-emblem`, `surface` panel (as on the splash: primary fill, ink in primary-foreground, cut-outs in primary) or page (ink in primary, cut-outs in background).

### Gaps

- **New pill uses fixed colours in code** (`#7A6840`, `#C2A86A`, `#2A1D15`, glow `rgb(194 168 106 / 0.6)`), not tokens, so it's bound to the primitives and doesn't change with the mode. The glow is a static colour.
- **Groups of buttons round as a whole.** The warm theme rounds a `role=group` of buttons and squares its buttons, so the stepper and segmented control round only their outer corners. Their buttons and toggles have their radius overridden to 0 in the instance.
- **Segmented choice is set by hand.** Its items are toggle instances; the chosen one has its fill and text recoloured, since the code's `data-[state=on]:bg-primary` isn't a toggle variant.
- **Side panel title** is the card-title style overridden to 22px, leading-tight, tracking 0.04em (SheetTitle with the panel's classes). Header actions (absolute, top right) aren't built.
- **Filter option icon** is a category mark here; the code takes any icon.
- **Zig-zag** is a vector 612 wide clipped to 600; in code it's a CSS mask repeated to any width. Stretching the component shows the end of the line.
- **Tooltips** (expiry alert, estimate mark, stock pill, New pill, heading tip) aren't attached; use the tooltip component.
- **History links** (the title and item names as links) aren't built.

### The emblem

- The drawing is the code's own SVG: the React component was rendered to static markup with React's server renderer and imported. Ink and cut-out colours are bound to tokens.
- **Figma has no text on a path.** COLLCA (Dejanire Bold 80, letter spacing 2) and WHAT TO BUY (Stevie Sans Bold 15, letter spacing 4) are single letters placed and rotated along the code's arc (radius 146) and curve. The spacing follows the SVG rule (spacing after every letter, the run centred on the path), so it should match within a pixel or two, but it hasn't been compared with the browser side by side.
- The other lines are live text set on the code's baselines. Baselines were measured from a capital H's ink in each font: 0.972 × size for Dejanire Bold and 0.95 for Stevie Sans, from the top of an auto-height text box.
- `font-weight` 500 (WHAT TO COOK) renders the 400 face on the web, so it's Regular; 600 and 700 are Bold.
- The intro illustration (`IntroIllustration`) isn't built.

### Figma limits and slips found

- **Spacing steps 14 (56), 20 and 24 were missing** and were added.
- **An instance can only be exposed once it's inside a component.** Setting it first fails.
- **Swapping an instance renames it** to the new component, so finding it by its old name fails; find it by position.
- **The jar came out solid** on the first emblem build: the test for the cut-out marker colour was wrong (magenta has no green, and the test looked for green). Fixed by rebuilding.
- One call took 103 seconds for no clear reason; the rest took under half a second.

## Batch 6: Phone kit (24 November 2026)

A **Phone** page, "phone kit" section, from `mobile/src/ui/` (`kit.tsx`, `sheet.tsx`, `toast.tsx`, `conflict.tsx`, `tags.tsx`, `timers.tsx`) and the tab bar in `src/app/(tabs)/_layout.tsx`. 390 wide. Checked in Light, Dark and Focus with a mock screen built from the kit.

### The Focus mode is the kit's `dark` prop

Most kit components take `dark` for the always-dark screens (list item sheet, cooking view), which swaps `theme.ts` colours for the `focus` palette. Those map onto the Semantic Focus mode: olive becomes gold (primary), ink the light ink (foreground), the field fill `focus.field`, lines `focus.line`. So each component is built once; set an instance (or its screen) to Focus for the dark version. The code's `gold` and `goldOutline` button kinds are primary and secondary in Focus, so they aren't separate variants. The toast is always dark, so its component is fixed to Focus.

### Tokens and styles added

- `phone/on-danger` (white in Light; the web uses cream), `phone/field` (the page colour, or `focus.field` in Focus), `phone/field-line` (stone, or the Focus line), `phone/overlay` (black 40%), `phone/place` (`focus.place`, the aisle name; not used by a component yet).
- Text styles `phone/button`, `segment`, `segment-on`, `chip`, `chip-on`, `pill`, `field`, `picker`, `number`, `title`, `toast`, `tab`, `back`, `timer`, `dialog-title`, `option-value`, beside the five from Batch 1. The app draws **Figtree** for now (Stevie Sans licence not checked); Figma shows Stevie Sans as planned, with 500 as Medium and 600 and 700 as Bold. Letter spacing is in points, as in React Native.

### Components

- **phone-button** (15): primary, secondary, quiet, danger, danger-fill × default, pressed, disabled. Min height 56, full width (350). Pressed shows the press tint; the app also scales to 0.97 (not with Reduce Motion), which Figma can't show.
- **phone-icon-button** (6): outline, filled, plain × default, pressed. 48 square.
- **phone-back-link**, **phone-stepper** (44 boxes, at-min), **phone-toggle** (on, off; the iOS switch drawn at 51 × 31, though iOS 26 draws its own shape and may ignore the thumb colour), **phone-segment** and **phone-segmented**, **phone-chip** (off, on, dashed), **phone-pill** (panel, olive), **phone-info-box**.
- **phone-field** (placeholder, filled, focused), **phone-picker** (closed, open in place), **phone-aisle-field** (with a value, none yet), **phone-row** (chevron or nothing), **phone-divider**, **phone-tag-mark** (tint, plain, empty × 22, 32, 44; radius 4, where the web uses rounded-sm).
- **phone-sheet-header** (title or back link, Done), **phone-toast** (with or without Undo; Focus), **phone-conflict-dialog** (the card; the backdrop isn't built), **phone-timer-button** (idle, running, done), **phone-timer-row** (running, done), **phone-tab-bar** (home, list, recipes, pantry).

### Gaps

- **Hairlines.** The code draws rows and dividers two hairlines thick (`StyleSheet.hairlineWidth * 2`), which is 1pt on a 2× or 3× screen. Figma uses 1.
- **Press states** show the tint only; the scale and the 60% fade (tabs, Done, back link) aren't shown.
- **Safe areas** aren't built; the tab bar and full-screen sheet headers sit under the status bar in the app.
- **Not built:** the item sheet and cooking view screens (they're compositions), the Home tiles, the aisle question, the sync note under the tab bar, art and location illustrations (`art.tsx`, `locations.tsx`), and the conflict backdrop.
- **Spacing** in the phone kit is in points and mostly not on the 4px scale (14, 18, 6, 10); those values are typed, not bound. Radii are bound (`radius`, `radius-pill`, `radius-dialog`).

### Figma limit found (again)

- The resize-after-hug trap squashed the tab bar's labels to one letter each. Fixed, and every fixed-width frame on the Phone page was checked for content wider than the frame; none are left.
