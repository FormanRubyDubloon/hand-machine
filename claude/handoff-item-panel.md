# Handoff: Item panel (add and edit), Collca on the web

> This document was generated with AI.

**Designs:**
- [PANEL-G · Add a new item, one stepper for how many](https://claude.ai/artifact/EAbWvdpVP5MdwCXwTuhgyE#artboard-ItemPanel-V5-Add-23gj) (canvas page "Item panel", file `ItemPanel-V5-Add-23gj.dc.html`)
- [PANEL-H · Edit an item, details folded away](https://claude.ai/artifact/EAbWvdpVP5MdwCXwTuhgyE#artboard-ItemPanel-V4-Edit-n1ru) (canvas page "Item panel", file `ItemPanel-V4-Edit-n1ru.dc.html`)

The originals are ITEM-V5 Add and ITEM-V4 Edit on the Explorations page. PANEL-G and PANEL-H are the chosen copies; build from those.

**Source of truth for behaviour:** "Item panel requirements (functional)". Where the designs differ from it, the difference is listed under [Open questions](#10-open-questions-and-known-gaps).
**Target build:** the side panel in Collca on the web (desktop admin app). Both panels are 560 wide and full height, opening over the pantry table from the right with a scrim, as in PAN-11. Treat the prototype's HTML and CSS as a visual reference, not code to port.
**Date:** 21 Nov 2026. The prototypes pin "today" to Friday 20 Nov 2026 so dates read consistently.

---

## 1. Overview

One panel, two states:

- **Add** creates a new pantry item. It asks only for what's needed (name, where it lives, how many) and keeps everything else behind a click.
- **Edit** maintains an existing item. The item's units are the main content. Every other detail sits in a folded row that shows a one-line summary, and only one row opens at a time.

Design goals that should guide any judgement calls:

- **What you need most comes first.** Optional details stay out of the way until you ask for them.
- **Say it the way a person would.** "2 bags · 1 open", not "1.5". Every rule that affects the shopping list is explained in a sentence.
- **One live explanation.** Both states show a shopping-list box that updates as you change stock or rules, so cause and effect are always visible.

## 2. Panel structure

```
Add (PANEL-G)                         Edit (PANEL-H)
├─ Header: "Add to pantry", name      ├─ Header: location · aisle, name, Staple badge,
│  field, Close                       │  stock summary, ··· menu, Close
├─ Toast (after "add another")        │  └─ ··· menu: Rename, Merge with another item, Delete
├─ Duplicate notice (when matched)    ├─ Delete confirmation (inline)
├─ Where it lives                     ├─ Shopping-list box
│  ├─ Location (5 icon buttons)        ├─ Units list + Add + notice/Undo
│  └─ Shop aisle                      └─ Details (one row open at a time)
├─ What you're adding                    ├─ Stock rules
│  ├─ How many (stepper)                 ├─ Where it lives
│  ├─ "Some already open?" (Bulk)        ├─ Store, price, brand
│  ├─ Stock rules (folded)               ├─ Notes, other names
│  ├─ Has a use-by date + date(s)        ├─ Recipes
│  └─ Shopping-list box                  └─ History
├─ Optional details (+ chips)         Footer: "Changes save as you go."
└─ Footer: missing-fields line,
   Add another after this, Cancel,
   Add item
Done screen (after Add item)
```

## 3. Design tokens

The panels use the warm palette, the same values as the PROTO-1 handoff (`handoff.md`, section 3), light theme only. The values used here:

| Role | Value | Used for |
|---|---|---|
| Background | #F2EFE3 | Panel, buttons, inputs |
| Ink | #3D2B1F | Main text, icons |
| Muted | #6B5142 | Captions, small labels, summaries |
| Olive | #7A6840 | Primary buttons, selected segments, switch on, borders on controls |
| On olive | #FFFFE6 | Text and icons on olive |
| Panel | #E8E5D8 | Shopping-list box when on the list, duplicate notice, toast, custom unit box |
| Line | #D6D1C2 | Row dividers, quiet borders, stepper borders |
| Stone | #C0BCAE | Input underlines, dashed empty states, date-edit underline |
| Danger | #9A3324 | Delete in the menu, delete confirmation |
| Placeholder | #8A7868 | Input placeholder text |

**Contrast:** muted on background and on-olive on olive pass AA for body text. Stone and line are never behind or used as text.

### Typography

| Role | Family | Size / line height | Weight | Case |
|---|---|---|---|---|
| Item name (title and name field) | `dejanire-text` (serif) | 30 / 1.05 (28 in the rename field) | 700 | Sentence case, no extra tracking |
| Small labels and section headings | `stevie-sans` | 10 | 600 | Uppercase, +0.1em |
| Button labels | `stevie-sans` | 12 (11 on location buttons) | 600 | Uppercase, +0.1em (+0.08em) |
| Row titles and field labels | `stevie-sans` | 14–15 | 600 | Sentence case |
| Body and summaries | `stevie-sans` | 14–15 / 20–21 | 400 | Sentence case |
| Captions and hints | `stevie-sans` | 12–13 / 18 | 400 | Sentence case |
| Stepper values | `stevie-sans` | 22 (main), 20 (minimum), 17 (already open) | 600 | – |

The item name was changed from uppercase to sentence case on request. This differs from the PROTO-1 phone app, where display type is uppercase. See open questions.

### Spacing, size and shape

| Token (suggested name) | Value | Used for |
|---|---|---|
| `panel-width` | 560 | Panel |
| `panel-padding` | 24 top, 32 sides, 32 bottom | Scrolling content |
| `space-section` | 24 | Between sections |
| `space-group` | 14–20 | Inside a section; 24 above Shop aisle |
| `size-control` | 40 | Buttons, inputs, selects, segmented controls |
| `size-stepper` | 44 (How many), 40 (others) | Stepper buttons |
| `size-location` | 64 tall | Location icon buttons |
| `size-row` | 56 (detail rows), 60 (unit rows) | Minimum row heights |
| `radius` | 4 | Buttons, inputs, boxes |
| `radius-pill` | 9999 | Badges, Full/Open pills, optional-detail chips, switch |

Icons are stroke icons on a 24 grid: 1.75 stroke for location icons at 20, 2 stroke elsewhere at 14–18.

## 4. Shared components

| Component | Variants | Notes |
|---|---|---|
| Button | Primary (olive fill), Secondary (outline, line border), Danger (fill), Text link (underlined) | Uppercase label. Disabled = 45% opacity, not-allowed cursor. |
| Icon button | Close, ··· | 40 × 40, outline. Must have an accessible label. |
| Location selector | 5 options with icon above label | Fridge, Freezer, Cupboard, Counter (fruit bowl icon), Other (box icon). Selected = olive fill. 1px dividers between unselected neighbours only. Built as a group of toggle buttons. |
| Segmented control | 2 options | Counted / Bulk. Selected = olive fill. |
| Stepper | −  n  + | Minus disabled at the lower limit. Value is a live region. |
| Switch | On, Off | 48 × 28. On = olive track, cream knob on the right. `role="switch"`. |
| Folded row | Closed, Open | Full-width button: title (160 wide), one-line summary, chevron that turns 180° when open. Content appears below the row. |
| Shopping-list box | On the list, Not on the list | Cart icon, bold headline, muted reason. On the list = panel fill with olive border; otherwise background fill with line border. Live region. |
| Unit row (edit only) | Counted, Bulk full, Bulk open | Label, Full/Open pill, date, one action. See section 6. |
| Optional-detail chip | Store, Price, Preferred brand, Other names, Notes | Pill, dashed olive border, "+" icon. Clicking reveals that one field and removes the chip. |
| Badge | Staple | 20 tall pill, 10px uppercase. |
| Notice | Duplicate, Toast, Unit notice with Undo | Plain sentences; Undo is an underlined text button. |

## 5. Add state (PANEL-G)

### Header
- Small label "Add to pantry", then the **name field** in the serif title style. It starts as "New item". Focusing it selects the text, so typing replaces it. While the name is empty or "New item", the text and underline are muted; once it's valid, the underline turns olive.
- Close (resets the form).

### Duplicate notice
- Appears when the typed name matches an existing item's name or one of its other names (case-insensitive, trimmed).
- "You already have **Almonds**: 3 bags in the Cupboard."
- **Add 1 bag to stock instead** (primary) adds one unit to the existing item and goes to the done screen: "Almonds updated. Added 1 bag to Almonds. You now have 4 bags."
- **Add as a separate item** (text link) hides the notice for that name and carries on.

### Where it lives (required)
- Location selector, nothing selected at first.
- Shop aisle select, starting on "Choose an aisle" (muted).

### What you're adding
- **How many [plural]**, with a stepper (default 1, minimum 0). The caption says "Marked as bought today.", "Each one gets a use-by date." or, at 0, "None in stock yet. You can still add it."
- **Some already open?** (text link, Bulk only, when How many is above 0) reveals an **Already open** stepper (0 to How many) captioned "Open ones don't count towards your minimum."
- **Stock rules** (folded row). Summary: "Counted · items · minimum 0". Open, it shows:
  - **Minimum to keep** stepper. "Above 0 makes it a Staple."
  - **How you use it:** Counted / Bulk, with an explanation of the chosen type.
  - **Unit type** select (bag, packet, pack, tin, jar, bottle, box, carton, item) with **Add your own…**, and **Size of each** ("e.g. 350 g").
  - **Add your own…** opens a box with **One** and **More than one** fields and **Add** (disabled until both are filled). The new type is selected and offered from then on.
- **Has a use-by date** switch (off by default). When on and How many is above 0:
  - One date field: "Use by" (or "Use by, all 3"). It's focused straight away when the switch is turned on.
  - **Different dates?** (when there's more than one) swaps it for a two-column grid of dates, "Item 1 use by", "Item 2 use by"…, plus **Use one date for all**.
  - Empty date fields have an olive border to show they still need a value.
- **Shopping-list box** (see rules).

### Optional details
- Chips: **+ Store**, **+ Price**, **+ Preferred brand**, **+ Other names**, **+ Notes**. Each reveals its field.
- Store: all stores, with each store's aisle number once an aisle is chosen ("Sainsbury's · aisle 14"). Hint: "Choose an aisle to see each store's aisle number."
- Price each: "£" prefix. "Leave it blank and Claude will estimate it. Estimates are marked."
- Other names: "Used to match recipes and in search."

### Footer
- While anything required is missing: "To add it, give it a name, a location and a shop aisle." (lists only what's missing).
- **Add another after this** checkbox, **Cancel** (resets), **Add item** (disabled until name, location and aisle are set).
- **Add item** with the checkbox off goes to the done screen: tick icon, "Oat milk added", "2 cartons in the Fridge, on the Dairy & chilled aisle. It isn't a Staple." with **Add another item** and **Close**.
- **Add item** with the checkbox on resets the form, keeps the location, and shows a toast: "Added Oat milk to the Fridge. Ready for the next one."

## 6. Edit state (PANEL-H)

The prototype shows Plain flour: Bulk, bags of 1.5 kg, minimum 2, has use-by dates, use within 8 weeks of opening, one open bag and one full.

### Header
- Small label "Cupboard · Baking", name, **Staple** badge (minimum above 0).
- Stock summary: "2 bags · 1 open · soonest use by 12 Jan". Without use-by dates: "… · last bought 14 Nov". At 0: "None in stock".
- **···** menu: **Rename** (turns the title into a field with **Done**), **Merge with another item** (goes to the merge flow, PAN-17), **Delete** (danger).
- Delete asks inline: "Delete Plain flour and its 2 bags? This can't be undone. Recipes that use it will show it as missing." with **Keep it** and **Delete**.
- Close.

### Shopping-list box
Always visible, directly under the header. See rules for the wording.

### Units
- Heading is the plural unit type ("Bags"). Right-aligned sort hint: "Open first, then soonest use-by" (Bulk), "Soonest use-by first", or "Oldest first".
- Each row: label ("Bag 1", numbered after sorting), **Open** (olive fill) or **Full** (outline) pill for Bulk, the date, and one action.
  - Date with use-by on: "Use by 12 Jan", underlined with a dashed line; clicking turns it into a date field with **Done**. Dates within 14 days are bold. A unit with no date reads "Set use-by date".
  - Date with use-by off: "Bought 14 Nov", not editable.
  - Action: Bulk full = **Open it**, Bulk open = **Finished**, Counted = **Used it**.
- **Add a bag** (or **Add one** for Item) adds a full unit bought today. With use-by on, its date field opens straight away.
- A notice sits beside the Add button after each action: "Bag 2 opened, so use by is now 15 Jan.", "Bag 1 finished. Undo", "Added. Set its use-by date."
- No units: "No bags left" plus "Plain flour is on the shopping list." (Staple) or "It isn't a Staple, so it won't go on the list by itself."

### Details (folded rows, one open at a time)

| Row | Summary when closed | Contents when open |
|---|---|---|
| Stock rules | "Minimum 2 · Bulk · bags of 1.5 kg" | Minimum to keep; How you use it (Counted / Bulk + explanation); Unit type + Add your own…; Size of each; Has a use-by date switch; **Use within, once open** stepper in weeks (Bulk with use-by only) |
| Where it lives | "Cupboard · Baking" | Location selector; Shop aisle select ("Sets where it appears on the shopping list.") |
| Store, price, brand | "Any store · £1.80 (estimate) · Doves Farm" | Store select, limited to stores with this aisle, each with its aisle number; Price each, with "Estimated by Claude. Change it if you know the real price." until edited; Preferred brand |
| Notes, other names | "Also called Flour, all-purpose flour" | Other names ("Separate them with commas."); Notes |
| Recipes | "Used in 2 recipes" | Recipe links with the amount each uses, or "None yet" |
| History | "You opened a bag · Just now" | Last change and when; **See full history** link |

### Footer
"Changes save as you go." After the first change: "Saved just now. Changes save as you go." There is no Save or Cancel.

## 7. Rules the panels depend on

- **Staple:** minimum above 0. A Staple goes on the shopping list by itself when stock drops below the minimum.
- **What counts towards the minimum:** Counted = number of units; Bulk = **full units only**.
- **To buy:** minimum − what counts, never below 0.
- **Shopping-list box wording** (edit):
  - Minimum 0: "Not on the shopping list. It isn't a Staple, so it only goes on the list if you add it yourself."
  - Below minimum, Bulk with open units: "1 on the shopping list. Open bags don't count towards your minimum of 2. You have 1 full, so 1 is on the list."
  - Below minimum otherwise: "You have 1, below your minimum of 2." / "None left, and your minimum is 2."
  - At or above: "2 full bags meets your minimum of 2. It goes on the list when that drops below 2."
- **Shopping-list box wording** (add): "Not a Staple" / "A Staple, and 1 will go straight on the shopping list" / "A Staple, not on the shopping list yet", each with a reason sentence.
- **Opening a unit:** with use-by dates on, the unit's use-by becomes the earlier of its printed date and today plus the "use within" period. If it changes, the notice says so. *(Assumption in the requirements.)*
- **Has a use-by date off:** units show their purchase date instead.
- **Unit labels:** unit type + position after sorting ("Jar 1", "Jar 2"). Unit type Item gives "Item 1".
- **Unit type plural:** each type has a singular and a plural; custom types are entered as both.
- **Store list:** when editing, only stores that sell the item's aisle; changing the aisle resets an incompatible store to Any store. When adding, all stores. *(Assumption in the requirements.)*
- **Duplicate match:** name or any other name, case-insensitive. *(Assumption in the requirements.)*
- **Dates:** "today", then "12 Jan" within about 9 months, otherwise "Mar 2028".

## 8. States and interactions

| Element | Action | Behaviour |
|---|---|---|
| Name field (add) | Focus | Selects "New item" so typing replaces it. |
| Name field (add) | Type | Re-checks for duplicates and the missing-fields line on every change. |
| Location button | Click | Selects it; dividers next to the selected button disappear. |
| How many stepper (add) | + | Adds a unit. With use-by on: focuses the single date if empty, or the new unit's date when dates differ. |
| How many stepper (add) | − | Removes the last unit; Already open is capped to the new total. Going below 2 returns to one date. |
| Different dates? | Click | Copies the shared date to each unit and shows the grid. |
| Use one date for all | Click | Uses the first unit's date for all and returns to the single field. |
| Folded row | Click | Opens it and closes any other (edit). Chevron rotates 180°. |
| Unit action | Open it | Marks the unit open, may move its use-by, re-sorts, updates the summary and shopping-list box. |
| Unit action | Finished / Used it | Removes the unit; notice with **Undo** puts it back. |
| Unit date (edit) | Click | Shows a date field with Done; saves on change. |
| Counted ↔ Bulk (edit) | Switch to Counted | Open units count as whole; note: "Your open bag now counts as whole. Switch back to keep tracking it." Switching back restores them as open. |
| ··· menu | Click | Opens below the button; choosing an item closes it. |
| Add item | Click | Done screen, or reset and toast when "Add another after this" is ticked. |
| Any change (edit) | – | Saved immediately; History summary and footer update. |

## 9. Edge cases

- **Zero units:** add allows 0 ("None in stock yet"); edit shows the empty state and the list status.
- **Item already exists:** duplicate notice; the user can still add a separate item.
- **Required fields missing:** Add item disabled; the footer line says exactly what's missing.
- **Long names:** the title wraps; it never truncates. Detail-row summaries wrap within their column.
- **Many units:** the edit list grows and the panel body scrolls; the footer stays fixed.
- **Custom unit type:** both forms required; it appears in the unit type list straight away.
- **Price edited:** the estimate note and "(estimate)" in the summary disappear.
- **Aisle changed to one a chosen store doesn't stock:** store resets to Any store.
- **All units open (Bulk):** nothing counts towards the minimum; the box explains why.
- **Deleted item:** the panel shows "Plain flour deleted. It has gone from your pantry and the shopping list." (the prototype adds a reset button for demo purposes only).

## 10. Accessibility

- **Real controls:** every action is a `button`, link or form field; groups of toggle buttons use `aria-pressed`; the use-by switch uses `role="switch"` and `aria-checked`; folded rows use `aria-expanded`.
- **Labels:** icon-only buttons are labelled ("More actions", "Close", "Lower minimum", "One more"). Unit actions include the unit: "Open it: Bag 2". Date buttons read "Change use-by date for Bag 1, now 12 Jan".
- **Live regions:** stepper values, the shopping-list box, unit notices, the toast and the save line are announced.
- **Focus:** a visible 2px olive outline with a 2px offset on every control. New date fields receive focus when the requirements say to ask straight away. The ··· menu and delete confirmation should trap and return focus in the build.
- **Not colour alone:** selected options are filled and also marked with `aria-pressed`; Full/Open is written, not just coloured; dates close to their use-by are bold.
- **Targets:** 40 minimum (desktop), 44 for the main stepper, 64-tall location buttons.
- **Contrast:** see tokens.

## 11. Open questions and known gaps

1. **Bulk → Counted with open units.** The prototype treats open units as whole and restores them if you switch back. The requirements leave this open, including what happens to their history.
2. **Saving model differs between states.** Edit saves as you go; Add has an explicit Add item. Needs testing alongside Claude's edits, which also appear in History.
3. **Location "Household" is now "Other"** (with a box icon), on request. The requirements and the PROTO-1 phone app still say Household. Update both or switch back.
4. **Full/Open on add.** The requirements say each new Bulk unit can be set Full or Open. PANEL-G covers this with "Some already open?" and a count, not per-unit toggles. ITEM-V4 Add removed it entirely. Confirm the count is enough.
5. **Per-unit use-by on add** is behind "Different dates?". Confirm one shared date is the right default.
6. **Item name case.** Sentence case here, uppercase in PROTO-1 and the earlier warm panels. Pick one for the system.
7. **"Add another after this" keeps the location.** Not in the requirements; chosen to suit unpacking a whole shop. Confirm.
8. **Use within, once open** is an assumption in the requirements. Only shown for Bulk items with use-by dates; the default (8 weeks for flour) would need to come from somewhere for new items.
9. **Store and aisle data are made up** (Sainsbury's, Waitrose, Lidl and their aisle numbers). Use the real stores from Settings.
10. **Close** in the edit header and in the add header doesn't close a real panel in the prototype (add resets the form).
11. **History** shows only the last change; the full history view isn't designed here.
12. **Merge** links to the existing PAN-17 design, which predates these panels and may need updating to match.
13. **Edit is a fixed 1,100-tall frame** in the prototype. In the build the panel fills the window height and scrolls.
