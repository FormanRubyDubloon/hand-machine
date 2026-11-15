# Pantry app: design handoff

**Date:** 14 November 2026 (categories added late on 14 November)
**Status:** Working design, not final
**Intent:** [../shopping-list/intent.md](../shopping-list/intent.md). The pantry app and the shopping app share one intent, so there is one copy. Read it before building or changing anything.
**Design canvas:** "Shopping list app: 5 versions" on claude.ai, page "Pantry explorations". The `screens/` folder has a copy of each screen as it stood when this was written.
**Sister prototype:** `prototypes/shopping-list` (the phone shopping app). Same design system, same data.

This file is for building the pantry admin app in Figma and in code. It lists the screens, how they link, how they behave, which hand-machine components to use, and what's still open.

## What this app is

The desktop app I use at my desk to manage the pantry. It's where items, minimums, stock, recipes, stores and the Claude connection are set up. It's one of four parts of the same system (see the intent):

| Part | Where | What it does |
| --- | --- | --- |
| **Pantry app (this one)** | Desktop web | Manage items, stock, recipes, the shopping list, stores, settings |
| Shopping app | iPhone web, offline | Tick things off in shops, sync when I choose |
| Kitchen app | Phone web, later | Quick stock jobs and cooking. Not designed yet. |
| Claude connection | Claude apps | Read and change the same data through an MCP server |

The pantry app is online. It's the place where the data lives, so it doesn't sync the way the phone does. It only needs to handle changes from the phone arriving through a phone sync (PAN-19).

## How to use this

1. Open the files in `screens/` in a browser. Each is 1440 × 900. The top menu, Settings and the "See all" links work between screens. Buttons don't.
2. In Figma, build one 1440 × 900 frame per screen, named by its ID (for example `PAN-10 · Pantry table`), in the groups below.
3. Use the components and variables from the hand-machine Figma file (`iFhn6OwEnxTzQDkx4PNuGe`) and `src/components/ui`. Don't redraw anything a component already covers.
4. Where the Components table says **new**, build it in `prototypes/pantry-app/src/components.tsx`, the same way the shopping app did. Some pieces already exist in `prototypes/shopping-list/src/components.tsx` (for example `RecipePill`). Reuse or move them, but ask Isaac before promoting anything to `src/components/ui`.
5. Use semantic colour variables, not the hex values in the HTML. Dark mode comes from the tokens, the same as the shopping app.
6. The names, prices, dates and amounts in the screens are made up. Several numbers don't add up across screens (see "Mockup inconsistencies"). Work them out from the seed data. Don't copy them.

## Screens

The canvas IDs are kept, so there are gaps in the numbers. The screens not listed here were explorations.

### Home, pantry and items

| ID | Screen | File | What it's for |
| --- | --- | --- | --- |
| PAN-09 | Home | `screens/PAN-09.html` | Quick use: a big "What did you use?" search, tiles for the items used most often ("Used 1" / "All", or "Finished it" / "Opened one" for bulk), History down the right, and "Cook these first". |
| PAN-10 | Pantry table | `screens/PAN-10.html` | Every item in one table, with filters in a sidebar: location, Staples, below minimum, out, use within 3 days, counted or bulk, shop or aisle. Steppers change stock in place. |
| PAN-11 | Item selected | `screens/PAN-11.html` | Click a name and a side panel opens over the table: every field, units with their own use-by dates, recipes that use it, notes, history. Save, Cancel, Delete, Merge. |
| PAN-16 | Bulk item selected | `screens/PAN-16.html` | The same panel for a bulk item (Plain flour): pack size, one row per pack with "Finished it" and "Open it". |
| PAN-12 | Add item | `screens/PAN-12.html` | The same panel, empty. Type, minimum (a minimum above 0 makes a Staple), other names. A line at the bottom says whether it goes on the list. |
| PAN-15 | Import | `screens/PAN-15.html` | Six ways in (paste, spreadsheet, receipt, online order, Notion, Claude). Paste is shown. Every method ends in the same "check before adding" table. |
| PAN-17 | Merge two items | `screens/PAN-17.html` | Pick the item to keep and the one to merge in, then see what happens to stock, minimum, other names, use-by dates and recipe links. |
| PAN-18 | Delete item | `screens/PAN-18.html` | Warns which recipes lose their link and that it comes off the list. Offers Merge instead. |
| PAN-19 | Changed in two places | `screens/PAN-19.html` | After a phone sync: for each item, keep this app's value, keep the phone's, or enter the real count. |
| PAN-20 | Search results | `screens/PAN-20.html` | Search in the top bar drops down results from the pantry, recipes and the shopping list together. |
| PAN-21 | No search results | `screens/PAN-21.html` | "Did you mean", add as an item, add to the list, or save the spelling as another name. |

### Recipes

| ID | Screen | File | What it's for |
| --- | --- | --- | --- |
| REC-07 | What to cook (default tab) | `screens/REC-07.html` | A "Use first" strip of items going off soon, then three columns: Cook now, Nearly (short of 1 or 2), Needs a shop. |
| REC-08 | All recipes tab | `screens/REC-08.html` | Every recipe in a table with filters: stock, short of, uses up, time, servings, tags, Want to cook. |
| REC-09 | Recipe in a side panel | `screens/REC-09.html` | Click a recipe on either tab: ingredients against stock, method and notes in an 800px panel. It can go full screen. |
| REC-10 | Recipe full screen | `screens/REC-10.html` | The same recipe at full size, with a button back to the side panel. |
| REC-11 | Cooked it | `screens/REC-11.html` | Check what you used before stock changes. Counted items are filled in from the recipe. Bulk items have a "Finished it" tick. |
| REC-12 | Pack-size warning | `screens/REC-12.html` | Scaled to 8 servings, the rice needs more than the 1 kg bag holds. Offers "Add 1 bag to the list". |
| REC-13 | Want to cook: added | `screens/REC-13.html` | A message saying what went on the list, that the recipe is saved to the phone, and an Undo. |
| REC-14 | Delete recipe | `screens/REC-14.html` | What stays in the pantry, with an option to take the recipe's items off the list. |
| REC-15 | No recipes yet | `screens/REC-15.html` | How to add recipes through Claude, with example messages. |

### Shopping list

| ID | Screen | File | What it's for |
| --- | --- | --- | --- |
| LIST-01 | Shopping list | `screens/LIST-01.html` | The list in aisle order for the chosen store. Each row says why it's there (Staple below minimum, a recipe, added by me or Claude). A side column has the estimated total, the store choice and when the phone last synced. |
| LIST-05 | Add to list | `screens/LIST-05.html` | Search the pantry, add something as a one-off, or create a new pantry item. |
| LIST-06 | Nothing to buy | `screens/LIST-06.html` | Every Staple is stocked, plus what's likely to run low next. |

### Sign in and settings

| ID | Screen | File | What it's for |
| --- | --- | --- | --- |
| AUTH-01 | Sign in | `screens/AUTH-01.html` | Email link or passkey. One account for all the apps. |
| SET-01 | Stores and aisles | `screens/SET-01.html` | Stores, and each store's aisles in walking order (drag to reorder, a number on each). The same data the phone edits. |
| SET-02 | Claude connection | `screens/SET-02.html` | Connected or not, the address to add in Claude, what Claude can do without asking and what it asks first, and Claude's recent changes. |
| SET-03 | Account | `screens/SET-03.html` | Sign-in methods, the devices you're signed in on, export, delete account. Sharing is marked "Coming later". |
| SET-04 | Categories | `screens/SET-04.html` | Every category in a table: kind (aisle or shop), items, Staples, which stores give it an aisle number. Shown while adding one: a new row at the top with a name, Aisle or Shop, and Add. |
| SET-05 | Rename a category | `screens/SET-05.html` | The pencil turns the name into a field with Save and Cancel. The new name shows everywhere. |
| SET-06 | Remove a category | `screens/SET-06.html` | Confirmation. The category's items must move to another category first. Says which stores lose an aisle number. |

### How the screens link

- **Top menu, every screen:** Home (PAN-09), Pantry (PAN-10), Recipes (REC-07), Shopping list (LIST-01). Then search, the phone's last sync time, Settings (SET-01) and a main button: "Add item" (PAN-12), or "Add with Claude" on recipe screens.
- **PAN-09:** typing in "What did you use?" searches items. "See all … items in the pantry" goes to PAN-10. "Cook these first" goes to the recipe in REC-09.
- **PAN-10:** an item name opens PAN-11 (or PAN-16 for bulk). Import goes to PAN-15. Merge and Delete in the panel open PAN-17 and PAN-18 over the table.
- **REC-07 and REC-08:** the two tabs switch between them. A recipe opens REC-09. Full screen goes to REC-10, and back again. "Cooked it" opens REC-11. "Want to cook" shows REC-13.
- **LIST-01:** "Add to list" opens LIST-05. With nothing on the list it shows LIST-06.
- **Settings:** the left column switches between SET-01 (Stores and aisles), SET-04 (Categories), SET-02 (Claude connection) and SET-03 (Account). On SET-04, the pencil on a row gives SET-05 and the bin gives SET-06.
- **PAN-19** appears after the phone syncs, if anything changed in both places.
- **AUTH-01** comes before everything else until you're signed in.

## How it behaves

### Items and stock

- **Staple:** any item with a minimum above 0. Staples below their minimum go on the shopping list by themselves. Items with a minimum of 0 show "Not a Staple" in the table.
- **Counted items** are tracked by number. **Bulk items** are tracked as whole packs, and the app knows whether one is open. Show quantities the way you'd say them: "2 bags · 1 open".
- **How many to buy:** counted, the minimum minus what you have. Bulk, the minimum minus full packs, because an open pack doesn't count.
- **Use-by dates:** if the minimum is above 1, each unit (or pack) has its own date. Otherwise the item has one date.
- **Recording use:**
  - Counted items: the stepper in PAN-10, "Used 1" / "All" on PAN-09, or the unit rows in the panel.
  - Bulk items: "Finished it" takes a pack off. "Open it" / "Opened one" marks a pack as open.
- **Other names** are used to match recipe ingredients and in search ("tumeric" can become another name for Turmeric).
- **Preferred brand** shows here and nowhere in the shopping app. "Any" means no preference.
- **Add item (PAN-12)** defaults to a minimum of 0. The summary line says whether it will be a Staple and whether it goes on the list.
- **Import (PAN-15)** never adds anything until you press "Add N items". A row matching an existing item adds to it. A row with no location must be fixed or unticked. New items start at a minimum of 0.
- **Merge (PAN-17):** stock is added together, the higher minimum is kept, the other item's name becomes one of the other names, and recipe links move across.
- **Delete (PAN-18):** recipes keep their wording but lose the link, and the item comes off the list.
- **Undo:** a merge or a delete can be undone from History on the same day.

### History (right of PAN-09)

- Every change, with who made it (You, Claude, Shopping app) and when. Filters: All, You, Claude, Shopping app. "Show older" at the bottom.
- The mockup shows Undo on today's stock changes too. The intent only says merges and deletes. See open questions.

### Recipes

- Recipes come in through Claude ("Add with Claude"). Claude links clear matches, creates new items (minimum 0) for unknown ingredients, and asks when it isn't sure. There's no "new recipe" form in this app.
- Each ingredient keeps the recipe's wording ("2 × 120 g tins sardines") and a link to a pantry item.
- **Stock marks on ingredients:**
  - Have it: dark tick.
  - Have some: light tick, for a bulk item with a pack in stock. The app doesn't know if it's enough.
  - Short: solid pill.
  - On your list: label.
- **What to cook (REC-07)** ranks recipes that use food close to its use-by date first. Columns: everything in stock, short of 1 or 2, short of 3 or more.
- **Servings** scale the amounts.
- **Want to cook** adds what you're short of to the list, labelled with the recipe, and saves the recipe to the phone for offline reading (REC-13). Pressing it again shows "On the list".
- **Cooked it (REC-11):** nothing changes until "Update stock". Counted amounts are filled in and can be changed. Each bulk item has a "Finished it" tick. The summary line says what changes and what drops below its minimum. It also marks the recipe as cooked today.
- **Pack-size warning (REC-12):** when a bulk item has a pack size and the recipe needs more than your packs could hold.

### Shopping list (LIST-01)

- The same list the phone shows, in the chosen store's aisle order. Changing an amount here reaches the phone at its next sync.
- Each row says why it's there: "Staple · Have 1, keep 2", "For Sardine linguine · Want to cook", "Added by Claude · Undo", "Added by you · one-off".
- Filters: All, Staples, For recipes, Added.
- "Skip this time" isn't in the intent. See open questions.
- The estimated total uses each item's price.

### Changes from the phone and from Claude

- The phone syncs when you choose. If an item changed in both places since its last sync, PAN-19 asks which to keep. Until you choose, this app keeps its own value and the rest of the sync goes through.
- Claude can add items, stock, list entries and recipes without asking, and take used things off stock without asking. It must ask before any other edit or delete. That asking happens in the Claude chat, so this app doesn't need an approval queue. Claude's changes show in History, marked Claude.

### Sign in and settings

- Email link or passkey, no password. You stay signed in on each device.
- SET-01 edits the same stores and aisle numbers as the phone's STORE screens.
- SET-02 lists Claude's permissions as fixed rules (from the intent), not switches.

### Categories (SET-04 to SET-06)

See "Categories" in the intent. Every item has one category, and each store gives a category an aisle number, so the list follows the walk round the shop. Today's set is Notion's 18.

- **Two kinds (design only, dropped).** The screens show an **aisle** (part of a store) and a **shop** (a whole shop). Left out of the build on 14 November: a shop category is just the only aisle in its store.
- **Add:** "Add category" puts a new row at the top: name, Aisle or Shop, Add. A new category appears in every store's aisle order with no number until one is set in Stores and aisles (SET-01). Until then, its items don't show on that store's list.
- **Rename:** the new name shows on every item, on the shopping list and in every store's aisles, here and on the phone.
- **Remove:** you can't remove a category that still has items. The confirmation says how many and asks which category to move them to. It names the stores that lose an aisle number. Recipes don't change. It can be undone from History on the same day.
- **Phone:** categories reach the shopping app when it syncs, like stores and aisles.
- **A category with no aisle number in any store** is shown in bold ("No aisle number yet"), so it's easy to spot.
- **Claude:** whether it can add or rename categories is an open question in the intent. Until that's settled, it uses the ones that exist and asks before changing one.

## Data

All of it is shared with the shopping app and the Claude connection. The fields are the same as in the intent.

**Pantry item:** name, other names, type (counted or bulk), quantity, unit, pack size, open pack, minimum, shop or aisle, location (fridge, freezer, cupboard), use-by dates (one per unit or pack when the minimum is above 1), price, preferred brand, notes.

**Recipe:** name, ingredients (wording, amount, pantry item link), method steps, servings, prep and cook time, tags, source, notes, Want to cook flag, last cooked.

**List entry:** pantry item or one-off name, amount, source (Staple below minimum, by hand, Claude, recipe name).

**Category:** name. The screens also show a kind (aisle or shop), which isn't in the intent or the code yet.

**Store:** name, default or not, an aisle number per category.

**History entry:** who (you, Claude, shopping app, kitchen app later), when, what changed, and whether it can be undone.

Worked out, not stored: Staple, Low or Out, how many to buy, whether a recipe can be cooked and what it's short of, the estimated total.

The shopping prototype keeps its mock pantry in `prototypes/shopping-list/src/remote-pantry.ts`, with data in localStorage. Both prototypes run on the same site, so the pantry app could read and write the same mock. Then a change here would show on the phone after a sync. That's Isaac's call. It needs a shared seed (see the next section).

## Mockup inconsistencies

Fix these in the seed data, not by copying the screens:

- **Store names.** LIST-01 and SET-01 use "Sainsbury's, Stoke Newington". The phone uses "Supermarket". Pick one.
- **Want to cook.** Here it's Sardine linguine. On the phone it's Fennel and orange salad. Use one seed where both are Want to cook.
- **Counts.** Some counts don't agree between screens. For example, PAN-10 says 11 items are below minimum, but LIST-01 lists 12 Staples to buy. Work them out from the seed.
- **Categories.** SET-04 shows 14 made-up categories. The data has Notion's 18. Use the data.
- **Sync time.** "Synced today, 10:02" in the top bar is the phone's last sync. Label it that way ("Phone synced …") or move it. See open questions.

## Components

Components are in `src/components/ui/` (shadcn `radix-sera`: square corners, uppercase buttons). Desktop needs several pieces the phone didn't.

| What's on screen | Use | Notes |
| --- | --- | --- |
| Buttons (primary, outline, quiet, red) | `button` default / outline / ghost / destructive | 40px high on desktop (`default`), 44 for main actions. |
| Square icon buttons (close, full screen, settings) | `button` outline, size `icon` | |
| Text fields with an underline | `input` + `label` | |
| Segmented choices (Type, Location, Default store) | `toggle-group` | |
| Filter chips with counts | `filter-chips` | |
| Out, Low pills | `badge` solid / outlined | |
| Staple, Recipe, Short N, Can cook pills | `badge` variants, or `RecipePill` from the shopping prototype | Short 1–2 uses an outline, Can cook is solid. |
| Tabs (What to cook / All recipes) | `tabs` | Underline style in the mockup. The shopping prototype overrides the tab style with classes. Do the same, or ask about a variant. |
| Dialogs (Merge, Delete, Cooked it, Changed in two places) | `dialog` | Widths 560 to 920. |
| Checkboxes ("Finished it", import rows) | `checkbox` | |
| Radio choices (PAN-19) | `radio-group` or `choice-row` | |
| Switch | `switch` | |
| Messages with Undo (REC-13) | `sonner` | Dark, at the bottom of the panel. |
| Rows in History, settings, merge preview | `list-row`, `separator` | |
| Stock stepper (−, number, +) | **new** | 28px in tables, 40px in the panel. |
| **Data table** (PAN-10, REC-08, LIST-01, PAN-15) | **new**. Ask about shadcn `table`. | Sortable headers aren't drawn. The selected row has a muted background and a dark left edge. |
| **Side panel over the page** (PAN-11, PAN-12, PAN-16, REC-09, LIST-05) | **new**. Ask about shadcn `sheet`. | `drawer` comes up from the bottom, which suits the phone. Desktop needs a right-hand sheet: 520–800px, dimmed page behind, a fixed footer for actions. |
| **App header with top menu** | **new** | Links with a 2px underline for the current page, search, sync time, Settings, main button. |
| **Filter sidebar** (PAN-10, REC-08) | **new** | Grouped list of filters with counts. The selected one has a muted background. |
| **Search dropdown** (PAN-20, PAN-21) | **new**. Ask about shadcn `command` + `popover`. | Results grouped by pantry, recipes and list, with keyboard movement. |
| **Quick-use tile** (PAN-09) | **new** | Name, location, big number, pill, "Used 1" and "All" (or bulk actions). |
| **History row** | **new**, or `list-row` | Who, when, what, a sub-line, optional Undo icon. |
| **Unit or pack row** (PAN-11, PAN-16) | **new** | Label, use-by, sub-line, action. Muted when the slot is empty. |
| **Recipe card in a column** (REC-07) and **Use-first tile** | **new** | |
| **Ingredient row** | **new**, or reuse `IngredientRow` from the shopping prototype | Recipe wording, pantry link, stock mark. |
| **Reorderable aisle list** (SET-01) | **new** | Drag handle, number box (dashed when empty), name, item count. Drag and drop isn't in the repo. |
| **Settings navigation** | **new**, or `list-row` | Title and sub-line, current one with a dark left edge. Four entries now. |
| Categories table (SET-04) | `table` | Same table as PAN-10. Small square icon buttons for rename (pencil) and remove (bin, in red). |
| Inline add and rename rows (SET-04, SET-05) | `input` + `button` + `toggle-group` | Muted row background while editing. |
| "Move the items to" choice (SET-06) | `select` | Lists every other category. |
| **Sign-in layout** (AUTH-01) | page layout | Dark panel on the left, form on the right. |

## Colours and type

Same as the shopping handoff: semantic variables, not the hex values (`#0c0a09` foreground, `#1c1917` primary, `#fafaf9` primary-foreground, `#f5f4f3` muted, `#7c6d67` muted-foreground, `#e7e3e1` border, `#ab9f9a` ring, `#b91c1c` destructive). The dimmed page behind panels and dialogs is foreground at 24%.

Stevie Sans (kit `tvk6fub`), falling back to Figtree in the mockups. Use Bold where the mockups say 600 and Regular where they say 500. Desktop sizes: 30 page titles (uppercase), 36–40 recipe titles, 22 panel and section titles, 15–16 body and table names, 14 table cells, 13 secondary, 12 buttons (uppercase, wide tracking), 10 labels (uppercase, wide tracking), 44 summary numbers.

## Not drawn yet

- Notion import (the one-off import of pantry, list and recipes)
- Spreadsheet, receipt, online order and Ask Claude tabs of Import
- Edit recipe (if recipes can be edited here, not only through Claude)
- Add store (SET-01 empty state) and delete-store confirmation
- Sorting and column choice in the tables ("Columns" button)
- The kitchen app

## Open questions

- **Undo:** the intent says merges and deletes can be undone the same day. PAN-09 also shows Undo on stock changes. Is every change undoable for a day?
- **Skip this time:** LIST-01 has it. Does a skipped item come back on the next list, and does the phone see it?
- **Editing recipes here:** both recipe screens have an Edit button. In or out?
- **Sync time in the top bar:** keep it as the phone's last sync, or drop it from desktop?
- **Sharing the mock pantry with the shopping prototype:** worth it for the demo?
- **Naming:** the intent and the code now say "category". The item panel (PAN-11, PAN-12, PAN-16), the table column and the filters still say "Shop or aisle". Change them to "Category".
- ~~**Aisle and shop kinds:** worth storing?~~ **Decided 14 November: left out.** A shop category is simply the only aisle in its store.
- **Add and rename in two places:** the first build adds and renames categories inside SET-01. Keep that as a shortcut, or move it all to SET-04?
- From the intent: online shopping, use-by warnings, Notion field mapping, sharing.

## Changes for the next build (categories)

Added to the design after the first code build.

1. **Built (14 November):** a Categories entry in the settings menu and the SET-04 page (`screens/settings.tsx`), with add and rename inline (SET-05).
2. **Built:** remove (SET-06). Only an empty category can be removed (the intent). If it has items, the dialog says how many and offers "Move items" to another category (you choose; there's no default), and Remove category stays disabled until it's empty. The move and the removal are separate History entries, each undoable today; undoing a removal brings the category back with its old aisle numbers. This differs from the SET-06 mockup, which moved and removed in one step.
3. **Not built:** a kind (aisle or shop) on each category. `Category` in `prototypes/shared/src/pantry.ts` is `{ id, name }` only, and the Supabase `categories` table would need the column too. Isaac decided to leave it out, so the Kind column and the Aisle/Shop choice aren't built.
4. **Built:** item and Staple counts per category, and which stores give it an aisle number.

**Built:** Sync sends new, renamed and removed categories to Supabase and pulls changes made there (migration `20261114160000_category_writes`). Stores and their aisle numbers sync too (migration `20261114170000_stores`): a store and its numbers are one unit, and if it changed in both places this computer's version wins. Which store is the default stays on each device. Recipes sync as well (migration `20261114180000_recipe_writes`); a recipe changed in both places keeps this computer's version. A category renamed in both places keeps this computer's name. One that items in Supabase still use isn't deleted there until they move; Sync says so and tries again next time. The phone still gets categories from the pantry app through localStorage.

## Gaps found

_Add anything Figma or the components couldn't match while building these screens, as in `GAPS.md`._

### First code build (14 November 2026)

Decisions taken with Isaac before building:

- Every change can be undone from History on the same day, not only merges and deletes. The intent still says merges and deletes; update it.
- "Skip this time" is out of LIST-01 for now.
- Recipes can be edited here as well as through Claude. The edit panel wasn't drawn; the code has a plain first take for review.
- The top bar says "Phone synced 10:02".
- One shared seed for both prototypes, with real store names (Sainsbury's, Stoke Newington). Sardine linguine and Fennel and orange salad are both Want to cook.
- Aisles reorder by drag (dnd-kit).

What the build added or changed from the screens:

- shadcn `table`, `sheet`, `command`, `popover` (and `input-group`, which `command` needs) are now in `src/components/ui`, stock radix-sera, each with a story. The handoff's "new" pieces live in `src/components.tsx`.
- A "Demo" menu in the top bar: simulate a phone sync, open the shopping app, reset both apps' data, sign out. Not a real feature.
- PAN-19 only appears from the Demo menu. The phone already settles conflicts on its own screen before it writes back, so a real conflict never reaches this app. Which device asks first is an open question for the intent.
- Ingredients gained a "part-used" flag (a clove of garlic, some milk). Cooked it shows "Finished it" for those instead of a count, which is what REC-11 does with linguine and garlic.
- "On the list" on a recipe takes its items off the list when clicked. The screens don't say what pressing it again does.
- The shop picker on LIST-01 only changes this list's aisle order. "Sets the aisle order on your phone" would mean the desktop choosing the phone's store, which the phone does itself.
- Toasts sit bottom left so they never cover a panel's buttons. REC-13 drew the message inside the panel.
- In dark mode, the sign-in's dark panel turns light, because it uses the primary colour, which flips.
- `sonner.tsx` didn't colour toast descriptions or cancel buttons, so they were dark on dark. Fixed in the design system.

What the AI got wrong on the way (caught in testing):

- Bulk tiles on Home overflowed ("Open another" didn't fit).
- Scaled ingredients read "4 jar kimchi" and "1200 g rice" until the scaler learned plurals and kilograms.
- Cooked it said Lemons "drops below its minimum" when it was already below.
- Import put "coconut milk 4 tins" in the fridge under Dairy because "milk" beat "tins".
- `shadcn add` emitted `import { cn } from "cn"` again and added the `cn` package; both reverted, as CLAUDE.md warns.
