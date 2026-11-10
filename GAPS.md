# GAPS

Things in the code that the Figma mirror cannot express exactly, or where a decision was made. Update this file whenever Figma and code diverge.

Figma file: "Untitled" (`iFhn6OwEnxTzQDkx4PNuGe`). Source of truth for tokens: `src/index.css`. Components used for type: `src/components/ui/*.tsx`.

## Structure decisions

| Figma | Code | Note |
|---|---|---|
| `Primitives` (Default) | no equivalent | The code has no primitive layer; `:root` and `.dark` hold raw oklch values. Primitives were derived from the distinct values and named after Tailwind's theme variables (`--color-taupe-50` etc.). These names exist in Tailwind, not in this repo's CSS. |
| `Semantic` (Light, Dark) | `:root` and `.dark` | Names match the CSS variables without `--`. Each aliases a primitive. |
| `Theme` (Default) | `@theme inline` and `:root --radius` | Added so mode-independent tokens (radius, fonts) don't sit in a two-mode collection with duplicate values. This collection is a structure choice, not a code concept. |

Primitives are scoped to none and hidden from publishing. Semantic tokens carry scopes by role (backgrounds: frame and shape fill, foregrounds: text and shape fill, border and input: stroke, ring: stroke and effect, chart: all fills). Every variable has a WEB code syntax of `var(--name)`.

## Colour

- **oklch to sRGB.** Figma has no oklch. Values were converted to sRGB and the original oklch string is in each primitive's description. The file colour profile is sRGB.
- **Clipped colours.** `color-red-600` (green channel -0.122, clipped to 0) and `color-red-400` (red channel 1.006, clipped to 1). Both are `--destructive`. `color-blue-700` fits in sRGB. Switching the file to Display P3 would keep more of the original gamut; not done.
- **Alpha primitives.** The dark `--border` is `oklch(1 0 0 / 10%)` and `--input` is `oklch(1 0 0 / 15%)`. Created as `color-white-alpha-10` and `color-white-alpha-15`. The names are invented; the code has the alpha inline.
- **`--destructive-foreground: 0 0% 98%`** is invalid CSS (a leftover from the old HSL setup, nothing reads it). Not created in Figma. Should be deleted from `index.css` or replaced with a real value.
- **Dark `--sidebar-primary`** is a blue (`oklch(0.488 0.243 264.376)`) outside the taupe palette. Mirrored as-is.
- **Charts** use the same values in both modes.
- **`.dark` class vs Figma modes.** Code switches with a `.dark` class on an ancestor; Figma switches by variable mode on a frame. Same values, different mechanism.

## Radius

- `--radius-sm/md/xl/2xl/3xl/4xl` are `calc()` of `--radius` in code. Figma variables can't do arithmetic, so these are fixed px values (6, 8, 14, 18, 22, 26 from `--radius` = 10). Changing `radius` in Figma will not move them. The formula is in each description.
- `radius-lg` aliases `radius`, as in code.
- rem converted to px at 16px.
- Components set `rounded-none` explicitly, so most of the sera components don't use these tokens.

## Typography

- **No named type styles in code.** The code has `--font-sans` and `--font-heading` only. Text styles were created from the Tailwind utilities the components use, and named after each component's `data-slot`. Each style's description holds the original classes.

| Style | Code classes |
|---|---|
| `button` | `text-xs font-semibold tracking-widest uppercase` |
| `badge` | `text-[0.625rem] font-semibold tracking-widest uppercase` |
| `card` | `text-sm` |
| `card-title` | `font-heading text-lg font-semibold tracking-wider uppercase` |
| `card-description` | `text-sm leading-relaxed` |
| `input` | `text-base` |
| `input@md` | `md:text-sm` (responsive; Figma has no breakpoints, so it is a second style) |
| `input-file` | `file:text-sm file:font-medium` |
| `label` | `text-xs font-semibold tracking-wide uppercase` |

- **Font weights.** The Adobe Fonts kit in `index.html` serves only 400 and 700 (plus italics). In the browser `font-semibold` (600) renders Bold; `font-medium` (500) and `font-normal` render the 400 face. Figma maps weight numbers differently (Book 400, Regular 500, Medium 600), so a bound weight variable picked the wrong face. Weight variables were removed. Styles use font style names directly: semibold becomes Bold, medium and normal become Regular. **Assumes the kit's 400 face is Regular, not Book. Check visually.**
- **Letter spacing.** Tailwind tracking is in em. A bound Figma variable forces pixels, so one `tracking-widest` value cannot be right at both 12px and 10px. Tracking variables were removed. Styles carry percent values directly (widest 10, wider 5, wide 2.5, normal 0). Not variable-bound.
- **`leading-relaxed`** is a unitless multiplier (1.625). Same problem: set as 162.5% on `card-description`, not variable-bound. Other styles bind line height to px variables (`text-xs--line-height` etc.).
- **Bound to variables:** font size, line height (where a fixed rem), and font family. `card-title` binds `font-heading`; the rest bind `font-sans`.
- **Font family name.** CSS is `"stevie-sans", sans-serif`; Figma is `Stevie Sans`. The `sans-serif` fallback can't be expressed. Stevie Sans must be installed locally for Figma to render it.
- **`text-[0.625rem]`** (badge). Figma variable names can't contain `.`, so it is `text-[0_625rem]`. Its code syntax keeps the real name. The badge sets no line height, so the style uses Auto.
- **Not created:** label's `peer-data-[slot=checkbox|radio-group-item|switch]` overrides (`text-sm font-normal tracking-normal normal-case`). Those components aren't in the repo yet. Body and `html` set a font family but no size, so there is no base style.
- **Uppercase** is expressed as text case on the style (it isn't a variable).

## Spacing

- **Base token.** `--spacing: 0.25rem` is `spacing` (4) in Primitives, hidden and unscoped.
- **Steps are fixed numbers.** Tailwind v4 has no named scale variables; utilities are `calc(var(--spacing) * N)`. Figma can't multiply, so each step the components use is its own variable: `spacing-0`, `spacing-px` (1px), `spacing-1`, `spacing-1_5` (6), `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `10`, `11`. Changing `spacing` in Figma will not move them. The names are invented (the code uses utility classes, not named variables). Figma can't hold `.`, so 1.5 is `1_5`. Only steps used in `src/components/ui` exist; add more when a component needs them.
- **Scopes.** Steps are scoped to Gap and Width/Height. Figma has no separate padding scope, so Gap covers padding too.
- **`--card-spacing`** is `card-spacing` (aliases `spacing-8`) in Theme. The `data-[size=sm]` override (`--spacing(5)`) is `card-spacing-sm`, an invented name: Figma variables don't switch on an element attribute. In the component, the size variant would pick which one to bind.
- **Heights and widths** (`h-7/9/10/11`, `size-*`, `h-px`) use the same steps.
- Not mirrored: `min-w-0`, `w-full`, `w-fit` (not fixed sizes).

## Shadows and rings

- **One shadow is used:** `shadow-sm` on Card. It is an effect style of two drop shadows (Tailwind's value). Figma variables can't hold a composite shadow, so there is no variable. The shadow colour is a static black at 10% (a literal in Tailwind), not bound to a variable, and it does not change in dark mode, as in code.
- **Rings are drop shadows** with 0 blur and a spread of 1, 2 or 3px, which is how Tailwind builds them (a `box-shadow`). Ring width is typed in the effect, not bound.
- **Alpha colours need their own tokens.** A Figma effect colour bound to a variable keeps that variable's alpha, so `ring-foreground/5` can't be "foreground at 5%". Created hidden alpha primitives (`color-taupe-950-alpha-5`, `color-taupe-50-alpha-5`, `color-taupe-400-alpha-30`, `color-taupe-500-alpha-30`, `color-taupe-400-alpha-50`, `color-taupe-500-alpha-50`, `color-red-600-alpha-20`, `color-red-400-alpha-40`) and four Semantic tokens scoped to Effect colour: `ring-foreground-5`, `ring-ring-30`, `ring-ring-50`, `ring-destructive`. These names are invented; the code writes the alpha inline. Checked in both modes.
- **`ring-destructive`** is `/20` in light and `dark:/40` in dark, so the name carries no alpha.
- **Effect styles** (names are the utility classes; the description holds the exact code):

| Style | Code | Used by |
|---|---|---|
| `shadow-sm` | `shadow-sm` | standalone |
| `card` | `ring-1 ring-foreground/5 shadow-sm` | Card (one node can hold one effect style, so ring and shadow are combined) |
| `ring-2 ring-ring-30` | `focus-visible:ring-2 focus-visible:ring-ring/30` | Button focus |
| `ring-[3px] ring-ring-50` | `focus-visible:ring-[3px] focus-visible:ring-ring/50` | Badge focus. Not used in Figma components: see the Badge section |
| `ring-2 ring-destructive` | `aria-invalid:ring-2 ring-destructive/20 dark:/40` | Button invalid |
| `ring-[3px] ring-destructive` | `focus-visible:ring-destructive/20 dark:/40` | Badge destructive variant focus. Not used in Figma components: see the Badge section |

- **Combining.** In code a focused and invalid element gets one ring (the later class wins). In Figma each state is a separate style; applying one replaces the other, so nothing combines.
- **Other states.** `focus-visible:border-ring` is a border colour (use the `ring` variable). `outline-ring/50` in the base layer of `index.css` only sets an outline colour; every component uses `outline-none`, so it is not mirrored.
- **Input** has no ring; it uses a bottom border colour change on focus.

## Components (Components page)

Built as a test: `button` (component set) and `card` (component set plus its parts). Every size, gap, padding, fill, stroke, effect and text style is bound to a variable or style. Variants and properties use the code's own names.

### Figma limit that shaped the build

**Opacity on a variable-bound paint is lost in instances.** The main component reports `0.1`; an instance of it reports `1` and renders solid. Node opacity and alpha stored inside a variable both survive. So every translucent fill and stroke in Button uses an alpha token instead of `bg-x/NN`. This added tokens the code doesn't have (names are invented; the code writes the alpha inline):

| Token (Semantic) | Code |
|---|---|
| `primary-hover` | default: `hover:bg-primary/80` |
| `secondary-hover` | secondary: `hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]` |
| `outline-hover` | outline: `hover:bg-muted`, `dark:hover:bg-input/30` |
| `ghost-hover` | ghost: `hover:bg-muted`, `dark:hover:bg-muted/50` |
| `destructive-bg` | destructive: `bg-destructive/10`, `dark:bg-destructive/20` |
| `destructive-bg-hover` | destructive: `hover:bg-destructive/20`, `dark:hover:bg-destructive/30` |
| `destructive-border-focus` | destructive: `focus-visible:border-destructive/40` |
| `destructive-border-invalid` | `aria-invalid:border-destructive`, `dark:aria-invalid:border-destructive/50` |

They alias new hidden alpha primitives (`color-taupe-900-alpha-80`, `color-red-600-alpha-10`, and so on). The light and dark differences in the code are now expressed through modes. The `secondary` hover is an oklch `color-mix`; it was computed once into two static primitives (`color-taupe-100-mix-taupe-950-5`, `color-taupe-800-mix-taupe-50-5`) and will not follow if `secondary` or `foreground` change.

### Button (`button`, 240 variants)

- **Properties:** `variant` (default, outline, secondary, ghost, destructive, link) × `size` (default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg) × `state` (default, hover, focus-visible, aria-invalid, disabled), plus a `children` text property. The code has no `state`; CSS pseudo-states can only be shown as variants in Figma.
- **Not built:** `active:` (1px press), `aria-expanded:`, `transition-all`, `select-none`, pointer-events, `asChild`. Prototype transitions between states were not added.
- **`bg-clip-padding` with a 1px transparent border** is modelled as an outer frame (1px, holds the border and ring) around a `padding-box` frame (holds the fill and content). The 1px width is a fixed number, not a variable (it is a border width, not a spacing token).
- **Label colour for outline and ghost** has no class in the code (inherited). Modelled as `foreground`.
- **Icons** are a placeholder (lucide `mail`, drawn as vectors, stroke bound to the label colour, 14px or 12px for `icon-xs`). Not a swappable component. There is no icon-plus-text variant, so `has-data-[icon=inline-start|end]` padding changes are not built.
- **`link` label is not bound to `children`.** Figma syncs text formatting across every text node linked to one property, so underlining Link also underlined every other variant. Link's text is unlinked: edit it directly in an instance. Underline offset 4px is expressed.
- **Disabled** is node opacity 50%.
- **Size:** 240 variants is heavy. If it slows the file, drop `state` to default and hover only, or split icon sizes into their own set.

### Card (`card`, 2 variants, plus parts)

- **Parts:** `card-title`, `card-description`, `card-action`, `card-header`, `card-content`, `card-footer`. `card-content-text` is a helper (the content placeholder text) and is not a code component.
- **Properties:** `card`: `size` (default, sm), booleans `card-header`, `card-content`, `card-footer`. `card-header`: booleans `description` (on) and `action` (off), as the code reacts to `has-data-[slot=...]`.
- **Spacing:** `size=sm` binds the card and its parts to `card-spacing-sm`. The padding on the nested header, content and footer is an instance override; swapping those instances resets it.
- **Width is fixed at 380.** The code is fluid (it is `w-[380px]` only in the story). Resize the instance; the parts stretch.
- **No slots.** The plugin API here cannot create slots. Content is placeholder: a text line for content, Save and Cancel buttons in the footer, and an outline `xs` button for `card-action`. The `gap-2` between footer buttons comes from the story, not from `CardFooter`.
- **Header grid** (`grid-cols-[1fr_auto]`, `row-span-2`, `self-start`) is approximated with auto layout: a text column that fills, and the action at its natural size.
- **Not built:** `[.border-b]:pb-…` and `[.border-t]:pt-…` (optional header and footer borders), `has-[>img:first-child]:pt-0` and the first and last image rules, `@container/card-header`, `group/*`.
- **Text edits** go through the nested title, description and content instances. They are not exposed as properties on the card.
- `overflow-hidden` is clip content; `shadow-sm ring-1 ring-foreground/5` is the `card` effect style.

### Badge (`badge`, 18 variants)

- **Properties:** `variant` (default, secondary, destructive, outline, ghost, link) × `state` (default, hover, focus-visible), plus `children` and booleans `icon-start` and `icon-end`. No `size`; the code has none.
- **Hover is anchor-only for four variants.** In code, hover colours for default, secondary, destructive and outline are `[a]:hover:`, so they apply only when the badge is rendered as a link (`asChild`). Ghost and link hover on any element. Modelled as `state=hover` for all six. This added two alpha text tokens: `foreground-70` (`text-foreground/70`) and `destructive-70` (`text-destructive/70`).
- **Focus ring is an outside 3px stroke, not the effect style.** The badge has no fill, so a drop-shadow ring follows the text instead of the box. The stroke is bound to `ring-ring-50` (or `ring-destructive` for the destructive variant). Those ring tokens now also carry the Stroke colour scope. The effect styles `ring-[3px] ring-ring-50` and `ring-[3px] ring-destructive` are therefore unused.
- **`aria-invalid` is not modelled.** `aria-invalid:border-destructive` has no effect because of `border-0`, and `aria-invalid:ring-destructive/20` sets only a colour: the ring has no width without focus. In code an invalid badge looks the same as a normal one unless focused.
- **`focus-visible:border-ring`** also has no effect (`border-0`).
- **Finding: link hover underline is clipped.** `overflow-hidden` is on the badge and the box is only as tall as the text, so `hover:underline` with `underline-offset-4` falls outside it. In Figma, Link hover looks the same as default. Whether it shows in the browser depends on the inherited line height; worth checking in Storybook. Fixed by removing `overflow-hidden` or setting a line height.
- **`link` label is unlinked from `children`** (formatting sync, as in Button): edit its text in the instance.
- **Icons** are the same placeholder mail icon at 12px (`[&>svg]:size-3!`). `has-data-[icon]` padding rules are no-ops (padding is already 0).
- Not built: transitions, `group/badge`, pointer-events.

### Input (`input`, 24 variants)

- **Properties:** `type` (text, file) × `breakpoint` (base, md) × `value` (placeholder, filled) × `state` (default, focus-visible, aria-invalid, disabled), plus `placeholder` and `value` text properties. `type=file` exists only as `value=placeholder`.
- **`breakpoint`** models `text-base` with `md:text-sm`. Figma has no breakpoints, so it is a property, bound to the `input` and `input@md` text styles.
- **Borders:** only the bottom border has a colour (`input`, then `ring` on focus, then `destructive-border-invalid`). The three transparent 1px borders are modelled as 1px padding. There is no ring or background. The 1px widths are fixed numbers.
- **`dark:aria-invalid:border-b-destructive/50`** is carried by the `destructive-border-invalid` token added for Button, so it follows the mode.
- **Width is fixed at 320** (code is `w-full`).
- **`file:`**: the native file control is approximated: a `file-selector-button` frame (`h-7`, `input-file` style) beside "No file chosen". The real control's text and spacing are drawn by the browser; the 8px gap (`spacing-2`) is a guess.
- **Value and placeholder colours:** placeholder uses `muted-foreground`; a typed value has no colour class (inherited), so it uses `foreground`.
- Not built: `transition-[color,border-color]`, `min-w-0`, `disabled:pointer-events-none`, `disabled:cursor-not-allowed`. Disabled is node opacity 50%.

### Label (`label`, 2 variants)

- **Properties:** `state` (default, disabled) and `children`. Disabled is opacity 50% and models both `peer-disabled` and `group-data-[disabled=true]`. Figma can't react to a neighbouring input, so a designer picks `disabled` by hand.
- Text colour has no class in code (inherited); modelled as `foreground`.
- **Not built:** the `peer-data-[slot=checkbox|radio-group-item|switch]` overrides (`text-sm font-normal tracking-normal normal-case`), because those components are not in the repo. `select-none` and the `flex items-center` slot for child elements (only text is modelled; `gap-2` is bound, but there is no icon).

### Separator (`separator`, 2 variants)

- **Property:** `orientation` (horizontal, vertical). Fill is `border`; the thickness is bound to `spacing-px`.
- **Placeholder lengths.** Horizontal is 320 wide (`w-full`); vertical is 24 tall (`self-stretch`, which follows its parent in code). Both are fixed numbers, not variables. Resize the instance, or put it in an auto-layout frame and set it to fill.
- `decorative` (accessibility only) has no Figma equivalent. `shrink-0` is not relevant.

### Second batch: alert, avatar, checkbox, dialog, progress, radio-group, select, skeleton, switch, tabs, textarea, tooltip

All twelve were built the same way as the first six: every size, gap, padding, fill, stroke, effect and text style is bound to a variable or style, and the properties use the code's names. They were checked in both modes.

**New tokens (names invented; the code writes these inline).** Spacing steps `0_5`, `0_25`, `2_5`, `3_5`, `4_5`, `6_25`, `8_25`, `16`, `18`, `36` (fixed pixels, not multiples of `spacing`). Alpha and mode tokens in Semantic:

| Token | Code |
|---|---|
| `dialog-overlay` | `bg-black/20` |
| `ring-foreground-10` | `ring-foreground/10` (dialog and select content) |
| `destructive-90` | alert destructive description `text-destructive/90` |
| `input-50` | switch unchecked `border-input/50` |
| `border-50` | select separator `bg-border/50` |
| `switch-thumb`, `switch-thumb-checked` | thumb `bg-background`, `dark:bg-foreground` (unchecked), `dark:bg-primary-foreground` (checked) |
| `tab-text` | `text-foreground/60`, `dark:text-muted-foreground` |
| `tab-active-bg` | `data-active:bg-background`, `dark:bg-input/30` |
| `tab-active-border` | `dark:data-active:border-input` (transparent in light) |

Scopes were widened on existing tokens so they can be used where the code uses them: `input` (also fills), `background` (also text and effect), `foreground` (also frame fill and stroke), `primary` (also stroke), `border` (also fills), `muted-foreground` (also shapes). New effect styles: `shadow-md`, `ring-1 ring-foreground-10 shadow-md`, `ring-2 ring-background`, `backdrop-blur-sm`. New text styles (named after the slot): `alert-title`, `alert-description`, `avatar-fallback`, `avatar-fallback@sm`, `dialog-title`, `dialog-description`, `select-trigger`, `select-label`, `select-item`, `tabs-trigger`, `tabs-content`, `textarea`, `textarea@md`, `tooltip-content`.

**Applies to several components**
- **Focus and invalid rings on controls with no fill** (checkbox, radio, tabs trigger) are an outside stroke on a wrapper frame, not the effect style: a drop shadow on a hollow shape follows its edge. Switch has a fill, so it uses the effect styles.
- **Checked plus invalid or focus.** The code sets both `border-destructive` (or `border-ring`) and `data-checked:border-primary`. Which wins depends on CSS output order, which the source does not settle. Modelled as the checked colour (primary for checkbox and switch, foreground for radio) with the destructive or focus ring still shown. Check this in Storybook.
- **`after:-inset-*` hit areas** (checkbox, radio, switch) are invisible click targets and are not modelled. `group-has-[:focus-visible]/field-label:*` and `group-has-disabled/field:*` rules refer to a Field component that is not in the repo.
- **Transitions and animations** (including `animate-pulse`, `animate-in/out`) are not built. No prototype interactions.

**Skeleton.** One component. Size and shape come from `className`, so resize the instance (and set a corner radius for a circle). The pulse is not animated.

**Progress.** `value` is a 0 to 100 number in code. Figma has five steps (0, 25, 50, 75, 100). Width is fixed at 320, height is `spacing-0_5` (2px). `transition-all` is not built.

**Textarea.** As Input: `breakpoint` base or md, `value` placeholder or filled, and the text properties `placeholder` and `value`. Width is fixed at 320. `field-sizing-content` (grows with text) is approximated by auto layout; `min-h-16` is the minimum height. `resize-none` has no equivalent.

**Checkbox.** `checked` × `state`. No indeterminate state (the code has none). The check icon is a drawn vector, 14px.

**Radio group.** `radio-group-item` (`checked` × `state`) and `radio-group` (three items, first checked). No labels in the component; the label pairing in stories is composition.

**Switch.** `size` (default 33×18, sm 25×14) × `checked` × `state`. The thumb is positioned by hand (`translate-x-[calc(100%+2px)]` becomes 2px from the edge in both positions).

**Avatar.** `size` (default, sm, lg) with `children` (initials) and a `badge` toggle. `avatar-group` has three avatars and a count at size default only.
- **Not expressible:** the avatar's 1px border uses `mix-blend-darken` in light and `mix-blend-lighten` in dark. Figma can't switch blend mode with a variable, so it is a normal border.
- **Not modelled:** `AvatarImage` (no images in Figma), and the small icon that can sit inside the badge.
- **Group overlap** is a fixed -8 (`-space-x-2`).

**Alert.** `variant` × `action` (a variant, because it changes the right padding to `pr-18`), a `title` and `description` text property, and an `icon` toggle (a placeholder terminal icon).
- **Indicator and action:** the 2px left indicator (`after:`) and the action are absolutely positioned. The action is an outline xs Button instance.
- **Width:** fixed at 420 (the story's width; the code is fluid).
- **Not modelled:** `text-balance` and `text-pretty`, and link styles inside title and description.

**Dialog.** Parts: `dialog-header`, `dialog-footer`, `dialog-content` (toggle `close-button`) and `dialog` (overlay with content centred).
- **Fixed sizes:** the overlay is a placeholder 1200×760 viewport, and the content is 448 wide (`sm:max-w-md`).
- **Blur:** `backdrop-blur-sm` is an 8px background blur. Figma's blur radius does not equal a CSS pixel blur exactly.
- **Close button:** it is redrawn (ghost icon-sm with `bg-secondary` and an X) rather than a Button instance, because the Button component holds a placeholder icon that can't be swapped.
- **Footer:** only the `sm:` layout (row, right-aligned) is modelled; the mobile stack is not. Trigger, Portal and Close wrappers are behaviour, not visuals.

**Select.** Parts: `select-trigger` (`size` × `value` × `state`), `select-item` (`checked` × `state`: default, focus, disabled), `select-label`, `select-separator`, `select-content`.
- **Trigger width:** `w-fit` in code; fixed at 220 here so the chevron sits at the right.
- **Content width:** fixed at 200 (`min-w-36` is 144).
- **Item focus:** the `focus` state means CSS `:focus` (keyboard or pointer highlight), not `focus-visible`.
- **Not modelled:** the scroll up and down buttons, the `item-aligned` vs `popper` positions, and the separator's `-mx-1.5` bleed.

**Tabs.** Parts: `tabs-trigger` (list `variant` × `orientation` × `state`: default, hover, active, focus-visible, disabled), `tabs-list` (variant × orientation, first tab active), `tabs-content`, and `tabs` (orientation × variant).
- **Focus:** the 3px ring is an outside stroke and the 1px border is the trigger's stroke. The extra `focus-visible:outline-1 outline-ring` is not built (Figma has one stroke per node).
- **Trigger height:** 31px fixed for horizontal tabs (`h-[calc(100%-1px)]` of a 32px list); vertical tabs hug.
- **Line indicator:** the active bar (`after:`) is an absolutely positioned 2px rectangle, 5px beyond the trigger edge.
- **Not modelled:** `flex-1` equal-width triggers, and icon-plus-text triggers (`has-data-[icon]` padding).

**Tooltip.** `side` (top, bottom, left, right), `children`. The arrow is a hand-placed 10px square rotated 45°, its centre 2px inside the edge facing the trigger, centred along the edge. `max-w-xs` is not enforced, and the `kbd` slot is not modelled.

## Not yet mirrored

Border widths as variables, and prototype interactions. All eighteen components in `src/components/ui` are now built in Figma.
