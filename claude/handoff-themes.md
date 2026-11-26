# Handoff: Green and mustard theme and theme picker, Collca

> This document was generated with AI.

**Designs:**
- [TOKENS-03 · Green and mustard](https://claude.ai/artifact/EAbWvdpVP5MdwCXwTuhgyE#artboard-Tokens-RhythmThyme) (canvas page "Style exploration", file `Tokens-RhythmThyme.dc.html`). The source for the new theme's colours.
- [SET-07 · Settings · Appearance](https://claude.ai/artifact/EAbWvdpVP5MdwCXwTuhgyE#artboard-Set-Appearance) (canvas page "Pantry app", file `Set-Appearance.dc.html`). The desktop theme picker. Clickable: the whole screen changes theme as you pick.
- [PROTO-1 · Settings with theme picker](https://claude.ai/artifact/EAbWvdpVP5MdwCXwTuhgyE#artboard-Mob-Appearance) (canvas page "Mobile app: simple", file `Mob-Appearance.dc.html`). The phone app's Settings screen with the picker added. Clickable.

**Related:** `handoff.md` (PROTO-1 phone app, section 3 has the phone's warm tokens) and TOKENS-01 (warm palette against the existing web tokens in `src/index.css`).
**Target build:** Collca on the web (desktop admin app) and the Collca phone app (Expo). Treat the prototypes' HTML and CSS as a visual reference, not code to port.
**Date:** 26 Nov 2026.

---

## 1. Overview

Collca gets a second colour theme, **Green and mustard**, alongside the current **Warm** theme. Both have a light and a dark version. People choose two things in Settings:

- **Colour theme:** Warm or Green and mustard.
- **Light or dark:** Light, Dark, or Match computer / Match phone.

That makes four colour sets: Warm light, Warm dark, Green light, Green dark. Every screen uses the same token names, and only the values change.

Goals that should guide any judgement calls:

- **Colours come from tokens only.** No screen should name a hex value. A third theme later should mean adding one more set of values, not touching screens.
- **The choice applies straight away.** There is no Save button.
- **No flash of the wrong theme** on load, on the web or on the phone.

## 2. Rules

| Rule | Detail |
|---|---|
| Default | Warm, Match computer / Match phone. |
| Where the colour theme is saved | On the account. Picking it on the web changes the phone too, and the other way round. The phone keeps a local copy so it works offline and starts in the right theme. |
| Where light or dark is saved | On each device. A dark phone and a light laptop is a normal setup. |
| Match computer / Match phone | Follows the system appearance and changes live when the system changes, without a reload. |
| When it applies | Immediately, on the current screen and every other screen. |
| Sync | The theme change goes with the next sync on the phone like any other setting. If the web and the phone both change it before a sync, the most recent change wins. No conflict dialog: it's only a preference. *(Assumption.)* |
| What isn't themed | Food illustrations, the splash illustration and photos. Charts use the theme's chart tokens. |

## 3. Design tokens

### How it's built (web)

The web app already uses CSS variables in `src/index.css` (the 32 shadcn-style tokens TOKENS-01 maps). Add the theme as an attribute on `<html>`:

```css
:root, [data-theme="warm-light"]  { /* current warm light values */ }
[data-theme="warm-dark"]          { /* current warm dark values */ }
[data-theme="green-light"]        { /* table below */ }
[data-theme="green-dark"]         { /* table below */ }
```

Set `data-theme` and `color-scheme` from a small inline script in `<head>`, before the app renders. It should read the saved choice from local storage and the system setting from `prefers-color-scheme`. This avoids the flash. Listen for `prefers-color-scheme` changes while Match computer is on.

### Existing tokens: Green and mustard values

"From TOKENS-03" means the value is on the TOKENS-03 board. "Generated" means I worked it out to fill a token the board doesn't cover, so please check these.

| Token | Green light | Green dark | Source | Used for |
|---|---|---|---|---|
| `--background` | #F2EDE0 | #344A31 | TOKENS-03 `bg` | Page |
| `--card`, `--popover` | #F2EDE0 | #3A5136 | Light from TOKENS-03; dark generated | Cards, menus, panels |
| `--foreground`, `--card-foreground`, `--popover-foreground` | #23331F | #F2EDE0 | TOKENS-03 `text` | Main text, icons |
| `--muted-foreground` | #4D5C48 | #D0D7C7 | TOKENS-03 `text-muted` | Labels, table headers, captions |
| `--primary` | #5C6A26 | #E5B83A | TOKENS-03 `primary` | Add item, selected filter, filter outline |
| `--primary-foreground` | #F2EDE0 | #23331F | TOKENS-03 `on-primary` | Text on primary |
| `--secondary`, `--muted`, `--accent` | #EEE3C3 | #405A3C | TOKENS-03 `bg-selected` | Selected row, hover, info boxes |
| `--secondary-foreground`, `--accent-foreground` | #23331F | #F2EDE0 | TOKENS-03 `text` | Text on those |
| `--border` | #DDD6C4 | #4B6345 | TOKENS-03 `line` | Row dividers, button outlines |
| `--input` | #B3AC98 | #677E60 | TOKENS-03 `line-input` | Search and field underlines (see section 8, item 2) |
| `--ring` | #4D5C48 | #D0D7C7 | Generated (= muted) | Focus ring. Passes 3:1, unlike warm's current ring |
| `--destructive` | #A3361F | #F7B9A6 | Generated | Delete actions. TOKENS-03 has no red |
| `--destructive-foreground` | #F2EDE0 | #23331F | Generated | Text on destructive |
| `--chart-1` to `--chart-5` | #F7EAC2, #E1B136, #E68A0A, #5C6A26, #23331F | #F7EAC2, #E5B83A, #E68A0A, #D0D7C7, #8FA486 | Generated | Charts. Light chart-1 and 2 are under 3:1 on the page, so label them or outline them |
| `--sidebar-*` | Copy the matching main token | Copy the matching main token | Generated | As the existing theme does |

The dark card is one step lighter than the page, the same as the warm dark theme does.

### New tokens, needed in all four sets

The warm screens drew these from primary. TOKENS-03 gives them their own colours, so they need their own tokens in both themes.

| Token | Warm light | Warm dark | Green light | Green dark | Used for |
|---|---|---|---|---|---|
| `--link` | #7A6840 | #C2A86A | #3D553A | #E5B83A | Text links |
| `--nav-active` | #7A6840 | #C2A86A | #E68A0A | #E68A0A | Underline on the current nav tab |
| `--status-out` | #7A6840 | #C2A86A | #E1B136 | #E5B83A | Out pill fill |
| `--status-out-foreground` | #FFFFE6 | #2A1D15 | #23331F | #23331F | Text on the Out pill |
| `--status-low` | #F2EFE3 | #2A1D15 | #F7EAC2 | #4F5A2A | Low pill fill |
| `--status-low-border` | #7A6840 | #C2A86A | #E1B136 | #E5B83A | Low pill outline |
| `--status-low-foreground` | #3D2B1F | #F2EFE3 | #23331F | #F2EDE0 | Text on the Low pill |

Warm values copy what PAN-10 and PAN-11 already draw, so Warm should look the same after the change.

### Phone tokens

The phone app has its own token names (`handoff.md`, section 3). Green and mustard values:

| Token | Green light | Green dark | Same as web |
|---|---|---|---|
| `bg` | #F2EDE0 | #344A31 | `--background` |
| `ink` | #23331F | #F2EDE0 | `--foreground` |
| `muted` | #4D5C48 | #D0D7C7 | `--muted-foreground` |
| `olive` | #5C6A26 | #E5B83A | `--primary` |
| `onOlive` | #F2EDE0 | #23331F | `--primary-foreground` |
| `panel` | #EEE3C3 | #405A3C | `--muted` |
| `line` | #DDD6C4 | #4B6345 | `--border` |
| `stone` | #B3AC98 | #677E60 | `--input` |
| `danger` | #A3361F | #F7B9A6 | `--destructive` |
| `onDanger` | #F2EDE0 | #23331F | `--destructive-foreground` |
| `press` | text at 10% | cream at 12% | – |

Add `link`, `navActive`, `statusOut`, `onStatusOut`, `statusLow`, `statusLowBorder` and `onStatusLow` to the phone too, with the values from the table above.

**Rename `olive` and `onOlive`** to `primary` and `onPrimary` while doing this. "olive" is mustard in the green dark theme, which will confuse whoever reads the code next.

**Always-dark screens.** The list item sheet, the cooking view and the toast are always dark brown in Warm. In Green and mustard they become deep green:

| Role | Warm (today) | Green and mustard |
|---|---|---|
| Sheet background | #3D2B1F | #23331F |
| Text | #F2EFE3 | #F2EDE0 |
| Main action and borders | #C2A86A | #E5B83A |
| Small caps location line | #DCC79D | #F7EAC2 |
| Field labels | #C0BCAE | #D0D7C7 |
| Input fill, toast | #2A1D15 | #1B2818 |
| Remove from list | #E59A86 | #F7B9A6 |

All of these text colours pass 4.5:1 on #23331F and on #1B2818. **The splash** stays #BA9E5F, because it matches the illustration.

## 4. Screens

### Desktop: Settings · Appearance (SET-07)

A new fifth section in the Settings sidebar, between Claude connection and Account: **Appearance**, "Colour theme, light or dark".

- **Title** "Appearance", then "Changes apply straight away. Showing: Green and mustard, light." The second sentence updates as you pick.
- **Colour theme** (small label), then two theme cards side by side, each 440 wide:
  - A live preview of the pantry, always in that card's theme and in the current light or dark. It shows the nav with its active underline, Add item, the All/Low filter, an Out pill, a selected row with a Low pill, and a link.
  - Below the preview: a radio circle, the theme name, one line of description and four colour dots.
    - Warm: "Cream, brown and olive. The original Collca colours."
    - Green and mustard: "Cream, deep green and mustard, with an orange highlight."
  - Selected card: 2px primary border and a filled radio. Other card: 1px line border.
- Under the cards: phone icon and "Saved to your account, so the shopping app on your phone uses it too."
- **Light or dark** (small label): segmented control, 440 wide: **Light**, **Dark**, **Match computer**.
- The note under it changes with the choice:
  - Light: "Light is easiest to read in daylight."
  - Dark: "Dark is easier on the eyes in the evening and in dim shops."
  - Match computer: "Follows this computer. It's dark right now."
  - Each ends with "This is set on each device."
- The settings gear in the header shows as current (selected fill, primary border) while in Settings.

The other Settings screens (SET-01 to SET-06) are still drawn in the old neutral palette. They should move to tokens as part of this work. Otherwise they won't change theme.

### Phone: Settings (PROTO-1)

The existing **Theme** section (Light / Dark / Match phone) becomes two sections, under the account box and above Shopping:

- **Colour theme:** two radio rows, 76 tall. Each row has a 56 × 56 tile drawn in that theme (nav underline, a primary bar, a text bar with an Out dot), the name, the description, and a radio on the right. Below: "Saved to your account, so Collca on the web uses it too."
- **Light or dark:** the existing segmented control, **Light**, **Dark**, **Match phone**, with the existing note. "Follows your phone. It's light right now." for Match phone.

The rest of Settings is unchanged.

## 5. Components

| Component | Variants | Notes |
|---|---|---|
| Theme card (desktop) | Selected, Not selected | A `role="radio"` button inside a `role="radiogroup"`. The preview inside is decoration (`aria-hidden`). |
| Theme row (phone) | Selected, Not selected | Same semantics as the card. 76 tall, so well over the 44 minimum. |
| Theme tile | One per theme | A small fixed drawing of the theme. It always uses that theme's own tokens, by wrapping it in its own `data-theme`. |
| Segmented control | 3 options | Existing component. Selected = primary fill. Uses `aria-pressed`. |
| Settings sidebar link | Current, Other | Current = selected fill and a 3px primary bar on the left. |

## 6. States and interactions

| Element | Action | Behaviour |
|---|---|---|
| Theme card or row | Click or tap | Selects it. The whole app changes theme at once and saves the choice to the account. |
| Theme radio group | Arrow keys | Moves the selection between themes, as a native radio group does. Only the selected option is in the tab order. |
| Light / Dark / Match | Click | Changes light or dark at once, saved on this device. The theme cards' previews change too. |
| Match computer / phone | System appearance changes | The app follows without a reload. The note updates ("It's dark right now"). |
| Theme changed on the other device | Next sync (phone) or next load (web) | The new colour theme applies. Light or dark is not touched. |
| Theme change | Transition | Instant. No fade. *(Assumption: a fade on every colour can feel slow and costs performance on large tables.)* |

## 7. Accessibility

**Semantics.**
- Theme choice is a `radiogroup` labelled "Colour theme", with `role="radio"` and `aria-checked`.
- Light or dark is a group of toggle buttons with `aria-pressed`.
- The previews and colour dots are hidden from screen readers. The name and description carry the meaning.

**Focus.** 2px `--ring` outline, 2px offset. The green ring passes 3:1 in both modes.

**Contrast, Green and mustard:**

| Pair | Light | Dark |
|---|---|---|
| Text on page | 11.5:1 | 8.3:1 |
| Text on selected row | 10.5:1 | 6.5:1 |
| Muted text on page | 6.1:1 | 6.6:1 |
| Muted text on selected row | 5.6:1 | 5.2:1 |
| Text on primary | 5.1:1 | 7.2:1 |
| Link on page | 7.0:1 | 5.2:1 |
| Text on Out pill | 6.7:1 | 7.2:1 |
| Text on Low pill | 11.2:1 | 6.4:1 |
| Destructive on page | 5.8:1 | 5.7:1 |
| Destructive on selected row | 5.3:1 | 4.5:1 |
| Focus ring on page (needs 3:1) | 6.1:1 | 6.6:1 |
| Nav underline on page (needs 3:1) | **2.2:1** | 3.7:1 |
| Field underline on page (needs 3:1) | **1.9:1** | **2.2:1** |

The two failures are covered in section 8.

## 8. Open questions and known gaps

1. **The orange nav underline is too faint in green light** (2.2:1 on cream). The current tab also has darker text, so it isn't shown by colour alone, but the line itself fails. #C4740A would pass (3.1:1) and still read as orange. Keep TOKENS-03's #E68A0A, or darken it in light only?
2. **Field underlines fail 3:1 in every theme, Warm included** (1.7–2.2:1). An underline-only field needs its edge to pass. Options: darken `--input` (for example #857F69 in green light, 3.4:1), or give fields a full outline.
3. **Theme names.** "Warm" and "Green and mustard" are working names. TOKENS-03's file is called "RhythmThyme". If you want food or kitchen names (say "Walnut" and "Thyme"), change them before build.
4. **Green dark generated values** (card #3A5136, destructive #F7B9A6, charts) need a look on real screens.
5. **Warm dark differs between web and phone.** Web page #2A1D15 (TOKENS-01), phone page #1F1712 (`handoff.md`). Pick one while the tokens are being touched.
6. **Theme saved to the account** is an assumption. If you'd rather each device keep its own theme, the "Saved to your account" lines go and nothing syncs.
7. **The phone's tab underline** uses `olive` today. With `navActive` it becomes orange in Green and mustard, matching the web. Confirm that's wanted on the phone.
8. **Old Settings screens** (SET-01 to SET-06) are drawn in the pre-warm neutral palette. They need moving to tokens to follow the theme.
9. **Illustrations.** The Shelves-tab food drawings use fixed colours and sit on a cream ground. Check they still look right on the green dark page.
10. **Default for new users.** Warm, as today. Change it if Green and mustard becomes the brand.
