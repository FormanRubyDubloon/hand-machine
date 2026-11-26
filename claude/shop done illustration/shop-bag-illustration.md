# Shop done illustration: the string bag

> This document was generated with AI.

**Design:** [DONE-F · String bag](https://claude.ai/artifact/W7YubxdaTJzqRCNkn9j5f5#artboard-Done-F-StringBag) and its [light version](https://claude.ai/artifact/W7YubxdaTJzqRCNkn9j5f5#artboard-Done-F-Light), on the "Shop done screen" canvas.
**Target:** the Collca phone app (`mobile/`), Shop done screen.
**Date:** 26 November 2026.

## What's in the pack

| File | What it is |
|---|---|
| `ShopBagArt.tsx` | The drawing as a `react-native-svg` component, written to sit in `mobile/src/ui/art.tsx`. Colours come in as a prop, so it follows the theme. |
| `collca-string-bag-focus.svg` | The drawing in Thyme's focus colours (for the dark green screen). Transparent background. |
| `collca-string-bag-light.svg` | The drawing in Thyme's light colours (for the cream screen). Transparent background. |

The two SVG files are for reference, Figma and the web. The app should use the component, not the files.

## The drawing

A net bag with one looped handle. A baguette and a leek stick out of the top; an orange, an apple and a green vegetable sit inside. The net is drawn last, over the food.

- Grid: 140 × 208 (viewBox `30 4 140 208`).
- Size on the screen: 118 wide, about 175 high, bottom-aligned with the "Shop done" heading block.
- Net lines are 2.5 on the grid, the rim and handle 4. Below about 90 wide the mesh starts to close up, so don't use it as an icon.
- It's decorative. The component sets `accessible={false}`, as the other drawings do. The heading carries the meaning.

## Colours

The component takes nine colours. These are the values on the two mock-ups and the token each should come from.

| Part (`colours` key) | Focus (dark green) | Token | Light | Token |
|---|---|---|---|---|
| Net and handle (`net`) | #E5B83A | `focus.gold` | #5C6A26 | `primary` |
| Baguette (`bread`) | #F7EAC2 | `focus.place` | #E1B136 | `statusOut` |
| Baguette slashes (`cut`) | #23331F | `focus.bg` | #23331F | `ink` |
| Leek leaves, orange leaf (`leaf`) | #8FA486 | none yet | #3D553A | `link` |
| Leek stalk (`stalk`) | #D0D7C7 | `focus.label` | #8FA486 | none yet |
| Bottom vegetable (`veg`) | #8FA486 | none yet | #8FA486 | none yet |
| Orange (`orange`) | #E68A0A | `navActive` (Thyme dark value) | #E68A0A | none: light `navActive` is #C4740A |
| Apple (`apple`) | #F7B9A6 | `focus.danger` | #A3361F | `danger` |
| Apple stalk (`stem`) | #F7EAC2 | `focus.place` | #23331F | `ink` |

## Adding it to the app

The app already has a Shop done drawing: `ShopDoneArt` in `mobile/src/ui/art.tsx` (the basket in the arched window), used once, in `mobile/src/ui/shop-done.tsx`. Both are uncommitted work in the repo as of this note.

1. Paste the type and the component from `ShopBagArt.tsx` into `art.tsx`, and add `Ellipse` to its `react-native-svg` import.
2. In `shop-done.tsx`, replace `<ShopDoneArt width={150} ink={focus.gold} cutout={focus.bg} />` with the `<ShopBagArt … />` call shown at the bottom of `ShopBagArt.tsx`.
3. Add the missing colour (see below) to `mobile/src/ui/theme.ts`, then swap the two hex values in that call for it.
4. Remove `ShopDoneArt` if nothing else uses it.
5. Run `npm run typecheck` and `npm test` in `mobile/`, and look at the screen in both colour themes.

The component hasn't been run or type-checked. It was written from the SVG and from how `art.tsx` is written.

## Decisions for Isaac

1. **A soft green token.** #8FA486 isn't in the phone's theme. It's the web's dark `--chart-5` in Thyme. Suggestion: add one colour to each focus set (say `focus.leaf`), #8FA486 in Thyme. Walnut needs its own value; a muted olive such as #A89B6E would sit with its browns, but that's a guess to check on screen.
2. **Walnut.** Through the tokens above, the Walnut bag comes out gold, cream and terracotta on dark brown. Nobody has looked at it yet. It needs a mock-up or a look on the phone before it ships.
3. **Focus or light.** Shop done was briefed as a focus screen (always dark). If it stays that way, only the focus column matters and the light SVG is spare. If it follows the theme, the light column needs the orange decided: #E68A0A as drawn, or light `navActive` #C4740A.
4. **Several colours.** Every other Collca drawing is one colour with cut-outs. This is the first in several. If that should be a rule for small celebratory drawings only, it's worth writing down in the intent's Look section.
5. **The emblem version.** Options A to D on the canvas still use the arch and basket. Decide whether `ShopDoneArt` is kept for anything or goes.

## What the AI got wrong, or couldn't do

- The first three options drew an empty basket inside the splash emblem's arch, because the answer to "which style" was "splash illustration". That was more ornate than wanted; the string bag came from a reference image Isaac supplied.
- The drawing was made as SVG code without being looked at. Isaac judged it on the canvas; the model did not check how it rendered.
- The light version was recoloured by rule (swap each focus colour for a light one). The apple had to change from pink to red by hand because pink was too faint on cream.
