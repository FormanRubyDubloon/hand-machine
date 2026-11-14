# Shopping list app: design handoff

**Date:** 14 November 2026 (second version, replaces the first one from earlier today)
**Status:** Working design, not final
**Intent:** [intent.md](intent.md). This is a copy of the latest version from the Hand & Machine project. It replaces the older Notion version that was here.
**Design canvas:** "Shopping list app: 5 versions" on claude.ai, page "Shopping list app". The `screens/` folder has a copy of each screen as it stood when this was written.

This file is for building the shopping app in Figma and in code. It lists the screens, how they link, how they behave, which hand-machine components to use, and what has changed since the first handoff and the coded prototype.

## What changed since the first handoff

The intent changed a lot. In short:

1. **Notion is gone.** The pantry now lives in our own system, shared by four parts: this shopping app, a desktop pantry admin app, a kitchen app (later) and a Claude connection. The shopping app syncs with "your pantry", not Notion. Every "Notion" label, mock and data mapping in the prototype needs to change.
2. **Staples.** Any item with a minimum above 0 is a Staple. Only Staples go on the list by themselves when they drop below their minimum. Items with a minimum of 0 only appear if you add them by hand or a recipe adds them.
3. **Counted and bulk items.** Counted items (eggs, tins, lemons) are tracked by number. Bulk items (rice, flour, oil) are tracked as whole packs, and the app knows whether one is open. Only full packs count towards the minimum. See SHOP-08.
4. **Recipes.** Recipes can be viewed in the shopping app. Recipes marked "Want to cook" are saved on the phone so they open with no signal, and the ingredients you're short of go on the list, labelled with the recipe. See RECIPE-01, RECIPE-02 and the "also for…" line on Fennel in SHOP-01.
5. **Sign in.** All apps need a login: email link or passkey, no password. You stay signed in. See SIGNIN-01.
6. **Row gestures and drawers** from the coded prototype (commit `03b939c`) are now in the designs: swipe left gets one, swipe right undoes one, tap the count box to get all (with an undo toast), tap the name to open the item editor. Aisles and Menu are drawers.
7. **New screens:** HOME-02, SHOP-05 to SHOP-08, SIGNIN-01, RECIPE-01, RECIPE-02.

## How to use this

1. Open each file in `screens/` in a browser. Links between screens work. They're plain HTML with inline styles, so they show layout, copy and sizes but don't use the real components.
2. In Figma, build one 390 × 844 frame per screen, named by its ID (for example `SHOP-01 · Aisle list`), in the rows listed below.
3. Use the components and variables from the hand-machine Figma file (`iFhn6OwEnxTzQDkx4PNuGe`) and `src/components/ui`. Don't redraw anything a component already covers.
4. Where the Components table says **new**, build it locally and note it under "Gaps found". Don't add it to the design system without asking Isaac.
5. Use semantic colour variables, not the hex values in the HTML (see "Colours").

## Screens

| ID | Screen | File | What it's for |
| --- | --- | --- | --- |
| HOME-01 | Summary and store choice | `screens/HOME-01.html` | Landing page. Counts (to get, out of stock, want to cook), then stores with how many items each. Tap a store to start. |
| HOME-02 | Sync reminder | `screens/HOME-02.html` | HOME-01 when the last shop hasn't been synced: a reminder bar with Sync. |
| SHOP-01 | Aisle list | `screens/SHOP-01.html` | One aisle at a time. Rows with stock pills, gestures, filter chips. Shows a got-all toast with Undo. |
| SHOP-02 | Aisles drawer | `screens/SHOP-02.html` | Every aisle in the current store in aisle order, with what's left in each. |
| SHOP-03 | Menu drawer | `screens/SHOP-03.html` | Back to the list, recipes, change store, edit current store, finish this shop, sync. |
| SHOP-04 | End of shop | `screens/SHOP-04.html` | After the last aisle: counts, what's still to get, what was skipped, sync. |
| SHOP-05 | Item details | `screens/SHOP-05.html` | Tap an item name: inline editor with name, to get, got, skip. |
| SHOP-06 | Aisle done | `screens/SHOP-06.html` | An aisle with nothing left. The footer becomes "Next aisle". |
| SHOP-07 | Add item | `screens/SHOP-07.html` | Add an item to this aisle: name and how many. |
| SHOP-08 | Aisle with bags and bottles | `screens/SHOP-08.html` | Bulk items (open packs), a recipe item, and what you have after ticking one off. |
| STORE-01 | Store selector | `screens/STORE-01.html` | Pick a store, edit one (pencil), or add one. |
| STORE-02 | Edit store | `screens/STORE-02.html` | Store name and an aisle number per category. |
| STORE-03 | Set aisle number | `screens/STORE-03.html` | STORE-02 with the keypad open. Replaces the iOS keyboard. Unchanged since the first handoff. |
| SYNC-01 | Review before sending | `screens/SYNC-01.html` | What goes to your pantry and what comes back, including items added for a recipe. |
| SYNC-02 | Same item changed twice | `screens/SYNC-02.html` | Choose which value to keep when the phone and the pantry app disagree. |
| SYNC-03 | In progress | `screens/SYNC-03.html` | Sync running while you keep shopping. |
| SYNC-04 | No signal | `screens/SYNC-04.html` | Couldn't reach your pantry. Changes are kept on the phone. |
| SIGNIN-01 | Sign in | `screens/SIGNIN-01.html` | Passkey or email link. Once per phone. |
| RECIPE-01 | Recipes | `screens/RECIPE-01.html` | "Want to cook" recipes first, saved on this phone. All recipes below (need signal). |
| RECIPE-02 | Recipe in the shop | `screens/RECIPE-02.html` | Ingredients against stock and the list, with Add for anything missing. Ingredients and Method tabs. |

### How the screens link

- SIGNIN-01 → HOME-01 (first launch only).
- HOME-01 → a store row → SHOP-01. "Edit stores" → STORE-01. "Want to cook" count → RECIPE-01. Menu button → SHOP-03.
- SHOP-01 → "Aisles" → SHOP-02 (drawer) → an aisle → SHOP-01. Menu → SHOP-03 (drawer). Tap a name → SHOP-05. "Add new item" → SHOP-07.
- SHOP-06 → "Next aisle" → SHOP-01 for the next aisle, or SHOP-04 after the last one.
- SHOP-03 → "Recipes" → RECIPE-01. "Change store" → STORE-01. "Edit current store" → STORE-02. "Finish this shop" → SHOP-04. "Sync pantry" → SYNC-01.
- STORE-01 → a store → SHOP-01 for that store. Pencil → STORE-02. "Add store" → STORE-02 empty (not drawn).
- STORE-02 → an aisle row → STORE-03.
- SHOP-04 → "Sync pantry" → SYNC-01. "Shop at another store" → STORE-01.
- SYNC-01 → "Sync now" → SYNC-03, then back to where you were. If something changed in both places → SYNC-02. No signal → SYNC-04.
- RECIPE-01 → a recipe → RECIPE-02 → back to RECIPE-01.

## How it behaves

### The list

- **What's on it.** Staples below their minimum, items added by hand, and ingredients you're short of for recipes marked "Want to cook".
- **How many to buy.** Counted: minimum minus what you have. Bulk: minimum minus full packs, so an open pack doesn't count. One open bag of rice with a minimum of 2 means buy 2.
- **Leaving the list.** An item goes once what you've ticked brings it back to its minimum.
- **Sub-line on each row.** The unit or note ("1 bulb", "Habanero"), progress ("Got 2 of 4"), the bulk state ("1 bag, open · keep 2") and, if a recipe needs it, "also for Fennel and orange salad" or "for Sardine linguine".
- **Pills after the name.** **Out** (solid) and **Low** (outline) are for Staples only. **Recipe** (grey) is for an item that's only on the list because of a recipe. A fully got item loses its pill. A skipped item keeps it.
- **Preferred brand doesn't show** in this app. It's for online shopping in the admin app.

### Gestures on a row

| Action | Result |
| --- | --- |
| Swipe left | Got one unit (or one pack) |
| Swipe right | Undo one |
| Tap the count box | Got all of it, with an undo toast at the top |
| Tap the name | Opens the item editor (SHOP-05): change how many to get or got, or skip |
| Skip | Crossed out on a grey row with a dashed box and "Skipped / not here". Must look different from got. |

After ticking a bulk item, the sub-line and toast say what you now have, in the words you'd use: "Got 2 bags of basmati rice. You now have 3 bags, 1 open."

### Filters, aisles and stores

- Filter chips All · Out · Low, with counts. Same as the first handoff.
- Aisle numbers are per store. A category with no number isn't sold there and drops out of that store's list. Stores and aisles can also be edited in the admin app (Settings → Stores and aisles).

### Syncing

- Manual and two-way. Taps change the phone only until you sync.
- If a shop ends without a sync, HOME-02 shows a reminder.
- If an item changed on the phone and in the pantry app since the last sync, SYNC-02 asks which to keep. Until you choose, the item keeps the phone's value and the rest of the sync goes through. There are two choices now (this phone or the pantry app), not three. "Add them up" from the prototype is gone.
- Changes from Claude and the admin app arrive through sync, for example "Added by Claude · 3 to get" and recipe items ("For Fennel and orange salad · you chose Want to cook").
- Must work with no signal: the list, ticking, and recipes marked Want to cook all work offline. SYNC-04 explains that nothing is lost.

### Recipes

- RECIPE-01 lists "Want to cook" recipes first, marked "Saved on this phone". The rest need signal.
- RECIPE-02 shows each ingredient as "On your list", a dark tick (have it), a light tick (have an open pack, so some but maybe not enough), or an Add button. "Add 2 to the list" adds everything missing. The Method tab shows the steps.
- Cooking and marking a recipe as cooked happen in the kitchen app and the admin app, not here.

### Sign in

- Passkey or an email link. No password. You stay signed in, so the list opens in a shop with no signal.

## Data the app needs

From the pantry (synced, cached on the phone):

| Field | Used for |
| --- | --- |
| Name, other names | Row name, search |
| Type (counted or bulk), quantity, unit, pack size, open pack | Sub-line, how many to buy, what you have after ticking |
| Minimum | Staple or not, how many to buy, Low and Out pills |
| Shop or aisle | Which aisle it shows in, per store |
| Notes | Sub-line |
| List entries | Items added by hand, by Claude, or for a recipe (with the recipe's name) |
| Recipes marked Want to cook | Name, times, servings, ingredients with wording and pantry links, method. Downloaded for offline. |

Kept by the app, editable here and in the admin app: stores, and an aisle number per category per store.

Not used here: price, preferred brand, use-by dates, location (fridge, freezer, cupboard).

## Components

Components are in `src/components/ui/`, shadcn style `radix-sera` (square corners, uppercase buttons). Everything marked **new** in the first handoff now exists: `item-row`, `swipe-row`, `count-box`, `filter-chips`, `segment-bar`, `store-row`, `summary-stats`, `keypad`, `choice-row`, `tick-box`, `sync-bar`, `list-row`, `drawer`, `sonner`.

| What's on screen | Use | Notes |
| --- | --- | --- |
| Item rows with gestures | `swipe-row` + `item-row` + `count-box` | States: to get, partly got, got, skipped. Sub-line needs the bulk and recipe wording above. |
| Out and Low pills | `badge` `solid` / `outlined` | |
| **Recipe pill** | **new** `badge` variant | Grey fill (`muted`) with a `border` outline. |
| Filter chips | `filter-chips` | |
| Aisle progress | `segment-bar` | |
| Aisles and Menu | `drawer` | |
| Undo and got-all messages | `sonner` | Top of the screen, with an Undo button. |
| Store rows | `store-row` | |
| Summary numbers | `summary-stats` | HOME-01's third number is now "Want to cook" and is a link. |
| Keypad | `keypad` in `drawer` | |
| Sync choices | `choice-row` | Two choices now. |
| Sync running | `sync-bar` | |
| Menu entries, sync rows | `list-row` | |
| **Recipe list row** | **new** (or `list-row` with a pill and an offline line) | Name, time, short-of line, "Saved on this phone", pill. |
| **Ingredient row** | **new** | Recipe wording, pantry item and stock, then one of: "On your list" label, tick, light tick, Add button. |
| Ingredients / Method switch | `tabs` | |
| **Info note** (SHOP-08 "Bags and bottles") | **new**, or `alert` | Grey panel with a label and one sentence. |
| Sign-in fields and buttons | `input`, `label`, `button` | Passkey button has a key icon. |

## Colours

| Hex in mockups | Variable | Used for |
| --- | --- | --- |
| `#0c0a09` | `foreground` | Text |
| `#1c1917` | `primary` | Filled buttons, Out pill, selected chip, dark ticks |
| `#fafaf9` | `primary-foreground` | Text on primary |
| `#ffffff` | `background` | Page |
| `#f5f4f3` | `muted` | Skipped rows, Recipe pill, info notes, rows with something missing |
| `#7c6d67` | `muted-foreground` | Secondary text |
| `#e7e3e1` | `border` | Dividers, quiet borders |
| `#ab9f9a` | `ring` | Empty and dashed boxes, light ticks |
| `#d6d0cd` | `primary-foreground` at 70% | Secondary text on dark rows (as built) |
| `#b91c1c` | `destructive` | Remove this store |

## Type

Unchanged from the first handoff: Stevie Sans (kit `tvk6fub`), falling back to Figtree in the mockups. The kit serves only 400 and 700, so use Bold where the mockups say 600 and Regular where they say 500. Sizes: 30 titles, 22 item names, 20, 17, 14 secondary, 12 buttons, 10 labels, 40 summary numbers.

## Changes needed in the coded prototype

`src/` still follows the first handoff. To match this one:

1. Replace Notion. `src/mock-notion.ts`, the Notion comments in `src/model.ts`, "Sync with Notion" / "Get latest from Notion" in `home.tsx`, "Going to Notion" in `sync.tsx`, and the remove-store dialog in `edit-store.tsx` should all say "your pantry". The mock can stay, renamed to a mock pantry.
2. Model: add item type (counted or bulk), pack size, open packs, other names, and list entries with a source (Staple, by hand, Claude, recipe name). Staple = minimum above 0. To-buy for bulk uses full packs only.
3. Sync conflict: two choices, not three. Remove "Add them up". Keep the phone's value until you choose.
4. Rows: Recipe pill and the "for…" / "also for…" sub-line. Bulk sub-line and toast wording.
5. Home: the third number becomes "Want to cook" and links to recipes. "On order" goes (it isn't in the intent).
6. Menu: add Recipes.
7. New screens: SIGNIN-01, RECIPE-01, RECIPE-02, with recipes cached for offline.

There's an uncommitted change in `src/screens/shop.tsx`. This handoff didn't touch it.

## Not drawn yet

- Add store (STORE-02 empty)
- Recipe method tab (RECIPE-02 shows the Ingredients tab only)
- First sync after sign-in (loading the pantry for the first time)
- An empty list ("Nothing to buy") on the phone. The desktop version is LIST-06 on the Pantry explorations page.

## Open questions

- Does the filter stay on across aisles and shops? (The prototype keeps it through a shop and resets after.)
- Can two categories share an aisle number? (The prototype merges them.)
- Should "Add item" here create a pantry item, a one-off, or ask? The desktop add-to-list (LIST-05) offers both.
- Should "Might also need" suggestions from the desktop list appear on the phone? The suggestion so far is no.
- From the intent: online shopping in scope or not, and use-by warnings.

## Gaps found

_Add anything Figma or the components couldn't match while building these screens._

### Code build, 14 November 2026 (first handoff)

These notes are from building the first handoff. They still apply unless this file says otherwise.

- Button height is 44px (`lg`), not 56px.
- Dark-row colours use `primary-foreground` at 70% (text) and 20% (borders), not new tokens.
- Remembers the last store. Filter stays on through a shop and resets when the shop ends. Categories sharing an aisle number merge into one aisle. Undo toast after Got all and Skip.
- When an aisle is cleared, the footer becomes "Next aisle" (or "Finish shop" on the last one). This is now drawn as SHOP-06.
- Menu has a "Prototype only" section (pretend no signal, reset demo data).
- Add new item opens a minimal drawer (name, how many). This is now drawn as SHOP-07.
- Remove this store asks for confirmation in a Dialog.
- Rows are sorted (to get, skipped, got) when you enter an aisle, then stay put.
- The keypad drawer keeps the list visible and scrolls the row being edited above it. The first key replaces the old number.
- Sync review marks an item changed in both places and counts it once.

### Code build, second handoff (prototype updated to match this file)

Done in `prototypes/shopping-list/src`:

- Notion is gone. `mock-notion.ts` is now `remote-pantry.ts`, and every label says "your pantry" or "the pantry app". Saved data moved to `hm-shopping-list:v2`, so old data is dropped.
- Model: items are counted or bulk, bulk items track whole packs and one open pack, and only full packs count towards the minimum. Staple means minimum above 0. List entries carry a source (by hand, Claude, or a recipe name). Bought entries leave the list at sync.
- Sync conflict has two choices. Keeps the phone's value until you choose.
- Rows: Recipe pill, "for…" and "also for…" sub-lines, bulk sub-line ("1 bag, open · keep 2") and toast ("Got 2 bags of basmati rice. You now have 3 bags, 1 open.").
- Home: third number is "Want to cook" and links to recipes. "On order" is gone. HOME-02 reminder shows after a shop that hasn't been synced.
- Menu has Recipes. New screens: sign in, recipes, recipe.
- Motion (`motion/react`, respects "reduce motion"): screen fade and slide, rows collapsing, the item editor, drawers' contents, the sync reminder sliding in, ingredient status swapping when you Add, the Add button collapsing, tab content fading, recipe rows fading in, and the sign-in steps.

Notes for the essay and for Isaac:

- **Built locally, not in the design system** (as step 4 says): `RecipePill`, `InfoNote`, `SyncReminder`, `RecipeRow`, `IngredientRow` in `src/components.tsx`. Ask Isaac before promoting any of them.
- **Changed existing components** (additive): `summary-stats` takes `onClick`, `item-row` takes `badge`. See `GAPS.md`.
- **Tabs**: the active tab is filled dark in the mockup. The `tabs` component's default is white on grey, so the active trigger is overridden with classes in `recipes.tsx`.
- **Counts differ from the mockups.** The mockups were drawn with 14 items to get. The code seed has more (bulk items, recipe items), so Home says 20. "Short N" on recipes is worked out from stock, so Sardine linguine says Short 1 (parsley), not Short 2, because Linguine is already on the list.
- **Mockup inconsistency:** SHOP-08 puts Linguine on the list "for Sardine linguine", but RECIPE-01 shows only Fennel and orange salad as Want to cook. The code follows SHOP-08 and doesn't enforce the rule.
- **Oranges** start on the phone already (the post-sync state). SYNC-01 shows them arriving, so that row is missing from the demo sync. Tissues (added by Claude) does arrive.
- **Placeholders:** the Method steps, the recipe list (4 recipes, not 12), and the sign-in "Check your email" step with its "Pretend I opened the link" button are invented, because the handoff doesn't draw them. Sign out is in the menu's Prototype only section.
- **Recipes screen has a back button.** RECIPE-01 only draws the menu button, but there's no other way back to Home.
- **No way to mark Want to cook on the phone.** The handoff doesn't draw one. It comes from the pantry, so the prototype has the flag in its seed data only.
- **Add item** now makes a one-off (minimum 0), not a Staple. The old drawer made a Staple.
- **Skipping** moved into the item editor when the swipe gestures changed (before this handoff). It isn't in SHOP-05's mockup as a separate step, but the Skip button is.
