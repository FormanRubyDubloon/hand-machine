# Shopping list: design handoff

**Date:** 14 November 2026
**Status:** Working design, not final
**Intent:** [intent.md](intent.md)
**Design canvas:** "Shopping list app: 5 versions" on claude.ai, page "Working design". The `screens/` folder has a copy of each screen as it stood when this was written.

This file is for building the screens in Figma (with Figma Console in Claude Code) and, later, in code. It lists the screens, how they link, which hand-machine components to use, and where no component exists yet.

## How to use this

1. Open each file in `screens/` in a browser to see the screen. Links between screens work. They are plain HTML with inline styles, so they show layout, copy and sizes but don't use the real components.
2. In Figma, build one 390 × 844 frame per screen, named by its ID (for example `SHOP-01 · Aisle list`). Put them on a page called `Shopping list`, in the rows listed below.
3. Use the components and variables from the hand-machine Figma file (`iFhn6OwEnxTzQDkx4PNuGe`). Don't redraw anything a component already covers.
4. Where the table under "Components" says **new**, build it as a local component in the shopping list page and list it in "Gaps found" at the end of this file. Don't add it to the design system without asking Isaac.
5. Use semantic colour variables, not the hex values in the HTML. The hex values are sRGB approximations of the oklch tokens (see "Colours").

## Screens

| ID | Screen | File | What it's for |
| --- | --- | --- | --- |
| HOME-01 | Summary and store choice | `screens/HOME-01.html` | Landing page. Counts of what to get, then the stores with how many items each. Tap a store to start. |
| SHOP-01 | Aisle list | `screens/SHOP-01.html` | One aisle at a time. Items with stock pills, swipe and tap actions, filter chips. |
| SHOP-02 | Aisles | `screens/SHOP-02.html` | Every aisle in the current store, in aisle-number order, with items left in each. |
| SHOP-03 | Menu | `screens/SHOP-03.html` | Current store, change store, edit current store, sync. |
| SHOP-04 | End of shop | `screens/SHOP-04.html` | After the last aisle: counts, what's still to get, what was skipped, sync. |
| STORE-01 | Store selector | `screens/STORE-01.html` | Pick a store to shop at, edit a store (pencil), or add one. |
| STORE-02 | Edit store | `screens/STORE-02.html` | Store name and an aisle number per category. |
| STORE-03 | Set aisle number | `screens/STORE-03.html` | STORE-02 with the keypad open for one category. Replaces the iOS keyboard. |
| SYNC-01 | Review before sending | `screens/SYNC-01.html` | What will go to Notion and what will come back. |
| SYNC-02 | Same item changed twice | `screens/SYNC-02.html` | Choose which value wins when the app and Notion disagree. |
| SYNC-03 | In progress | `screens/SYNC-03.html` | Sync running while you keep shopping. |
| SYNC-04 | No signal | `screens/SYNC-04.html` | Couldn't reach Notion. Changes are kept on the phone. |

All twelve screens use the same layout: header with a close or back button, list rows with count boxes, and a footer with a main button plus a second button beside the menu button. SYNC-03 is SHOP-01 with a "Syncing" bar under the header.

### How the screens link

- HOME-01 → a store row → SHOP-01. "Edit stores" → STORE-01. Menu button → SHOP-03.
- SHOP-01 → "Aisles" button → SHOP-02 → an aisle → SHOP-01. Menu button → SHOP-03.
- SHOP-03 → "Change store" → STORE-01. "Edit current store" → STORE-02. "Sync with Notion" → sync.
- STORE-01 → a store name → SHOP-01 for that store. Pencil → STORE-02 for that store. "Add store" → STORE-02 empty (not drawn yet).
- STORE-02 → an aisle row → STORE-03 (keypad).
- SHOP-04 → "Sync with Notion", "Shop at another store" → STORE-01, menu → SHOP-03.
- SYNC-01 → "Sync now" (sends and pulls), "Back to list" → SHOP-01. SYNC-02 → "Decide later" → SHOP-01. SYNC-04 → "Keep shopping" → SHOP-01, "Try again".

Some links in the copied screens point at screens that no longer exist. They've been sent to the nearest current screen. For example, STORE-02's back button goes to STORE-01.

## How it behaves

- **Tap a row** adds one unit. **Swipe right** gets all of it. **Swipe left** skips it ("not here").
- **Bought** items: struck through, grey text, solid black tick box. **Skipped** items: struck through, grey row, dashed box with a skip icon, "Skipped / not here" label. They must look different.
- **Stock pills** after the item name: **Out** (solid) and **Low** (outline). They come from the Stock status formula in Notion. Once an item is fully bought it loses its pill. A skipped item keeps it.
- **Filter chips** (All · Out · Low) on HOME-01, SHOP-01 and SHOP-02. Counts sit inside each chip. All is the default. Undecided: whether the filter stays on across screens and shops.
- **Aisle numbers** are set per store. A category with no number isn't sold there and drops out of that store's list. Two categories sharing a number is undecided.
- **Sync is manual and two-way.** Taps change the app only, until you sync.
- **"Add new item"** is the last row of each aisle. The add form isn't drawn yet.

## Components

Components are in `src/components/ui/`. The style is shadcn `radix-sera`: square corners, uppercase buttons.

| What's on screen | Use | Notes |
| --- | --- | --- |
| Primary buttons (Sync with Notion, Save store, Done, Add store) | `Button` default, size `lg` | Mockups are 56px high, `lg` is 44px. Check with Isaac before going taller. |
| Secondary buttons (Add new item, Shop at another store, Not sold here) | `Button` outline | |
| Quiet text buttons (Edit stores, Remove this store) | `Button` ghost or link. Remove uses `destructive` | |
| Square icon buttons (menu, close, back, pencil, settings) | `Button` outline, size `icon` or `icon-lg` | Mockups are 48–56px. |
| Store name field | `Input` + `Label` | The underline style matches. |
| Small uppercase labels ("Current store", "Aisle number") | `Label` | |
| Thin progress line | `Progress` | |
| Row dividers | `Separator` | Or a border on the row. |
| Keypad panel (STORE-03) | `Dialog` | Needs to sit at the bottom like a sheet. There's no sheet component yet. |
| Switch (EXP-16 only, not used in the working design) | `Switch` | |
| **Stock pill** (Out, Low) | **new**, or a `Badge` variant | `Badge` is text only with no fill or border. The pill needs fill (Out) and outline (Low), height 20, fully rounded. |
| **Filter chips** | **new** (toggle group) | There's no `ToggleGroup` in the repo. Radix has one. Chips are 36px high, fully rounded, with a count inside. |
| **Item row** (name, sub-line, pill, count box) | **new** | States: to get, partly got, got, skipped. |
| **Swipe row** | **new** | Item row plus left and right actions. Static frames only in Figma. |
| **Count box** (52 × 52 number in a square) | **new** | States: outline, filled (current aisle), tick (got), dashed (skipped). |
| **Aisle segment bar** (5 short lines) | **new** | `Progress` is one bar. This is one segment per aisle. |
| **Store row** (radio square, name, sub-line, pencil) | **new** | |
| **Summary counts** (3 big numbers) | **new** | Used on HOME-01 and SHOP-04. |
| **Keypad** (3 × 4 keys) | **new** | |
| **Choice row** (SYNC-02: tick box, label, value, sub-line) | **new** | Same tick box as the store row. Could share a component. |
| **Sync bar** (SYNC-03: dark bar with status and progress line) | **new** | Uses `Progress` inside. |

## Colours

The mockups use hex values. In Figma use the semantic variables.

| Hex in mockups | Variable | Used for |
| --- | --- | --- |
| `#0c0a09` | `foreground` | Text |
| `#1c1917` | `primary` | Filled buttons, current row, Out pill, selected chip |
| `#fafaf9` | `primary-foreground` | Text on primary |
| `#ffffff` | `background` | Page |
| `#f5f4f3` | `muted` / `secondary` | Skipped rows, active row, grey bars |
| `#7c6d67` | `muted-foreground` | Secondary text |
| `#e7e3e1` | `border` | Dividers, quiet button borders |
| `#ab9f9a` | `ring` | Empty boxes, dashed borders |
| `#d6d0cd` | close to `chart-1` | Secondary text on dark rows. No exact semantic token, so check with Isaac. |
| `#57504c` | none | Border on dark rows. No token. |
| `#b91c1c` | `destructive` | Remove this store |

## Type

- One family: **Stevie Sans** (Adobe Fonts kit `tvk6fub`). The mockups fall back to Figtree because the canvas couldn't load the kit.
- The kit only serves 400 and 700. In the browser, 600 shows as Bold and 500 as Regular (see `GAPS.md`). In Figma use Bold where the mockups say 600, and Regular where they say 500.
- Sizes used: 30 (screen titles, uppercase), 22 (item and store names), 20, 17, 14 (secondary), 12 (button text, uppercase, wide tracking), 10 (labels, uppercase, wide tracking), 40 (summary numbers).

## Data (Notion: Pantry database)

| Column | Type | Used for |
| --- | --- | --- |
| Item | Title | Item name |
| Target | Number | How many to keep |
| In stock | Number | What the app writes back |
| Unit | Text | Sub-line, for example "1 bulb" |
| To buy | Formula | Target minus In stock |
| Stock status | Formula | Out, Low or In stock. Drives the pills and filter. |
| Ordered | Checkbox | "On order" count on HOME-01 |
| Category | Select | Maps to aisles |
| Where | Multi-select | Which stores sell it. Still empty in Notion. |
| Notes | Text | Sub-line, for example "Habanero" |

Stores and aisle numbers aren't in Notion. The app would keep them itself. That isn't in the intent yet.

## Not drawn yet

- Add store (STORE-02 empty, no Remove button)
- Add new item form
- Undo for got all and skip
- Login

## Open questions

- Does the stock filter stay on across aisles, screens and shops?
- Can two categories share an aisle number? If yes, do they show as one aisle?
- Does a new item go only on today's list, or become a Pantry row at the next sync?
- Does the app remember the last store, or ask each time?
- If an item changes in the app and in Notion between syncs, which wins? (SYNC-02 offers three answers.)

## Gaps found

_Add anything Figma or the components couldn't match while building these screens, as in `GAPS.md`._

### Code build, 14 November 2026

Built at `prototypes/shopping-list/` (run `pnpm dev`, open `/prototypes/shopping-list/`). Notion sync is mocked; see `src/mock-notion.ts`.

- **Components.** Every **new** row in the Components table is now in `src/components/ui` with a story. Stock pill is Badge `solid` / `outlined`. Filter chips are built on shadcn ToggleGroup. The keypad sheet is shadcn Drawer. Undo uses shadcn Sonner. See `GAPS.md`, "Third batch".
- **Button height.** 44px (`lg`), not 56px.
- **Dark-row colours.** `primary-foreground` at 70% (text) and 20% (borders), not new tokens.
- **Open questions answered for this build:** remembers the last store; filter stays on through a shop and resets when the shop ends; categories sharing an aisle number merge into one aisle (names joined with ·); undo toast after Got all and Skip.
- **Not in the drawings, added to make it work:**
  - SHOP-01 had no way to the next aisle. When an aisle is cleared, the footer becomes "Next aisle" (or "Finish shop" on the last one) with Aisles and Menu below.
  - Menu has "Back to the list" and "Finish this shop" while a shop is running, plus a "Prototype only" section (pretend no signal, reset demo data).
  - Add new item opens a minimal drawer (name, how many). It adds to the first category in the aisle and goes to Notion as a new item at the next sync.
  - Remove this store asks for confirmation in a Dialog.
  - Item rows are sorted (to get, skipped, got) when you enter an aisle, and then stay put, so rows don't move under your thumb.
  - The keypad drawer leaves the list visible and scrolls the row you're editing above it. The first key replaces the old number.
  - Sync review marks an item changed in both places ("also changed here") and counts it once.
