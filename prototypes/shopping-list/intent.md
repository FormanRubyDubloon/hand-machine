# Intent: pantry, recipes and shopping list app, with Claude access

Author: Isaac Forman · Date: 14 Nov 2026 · Updated: 24 Nov 2026 (aisles on items, Tags, bought date, shopping by aisle or tag; draft) · Status: draft, awaiting review

## Problem

I want one seamless, elegant system where my shopping list, pantry stock and recipes work together. Without it I keep the list and the stock in step by hand, and nothing tells me what's running low. I also can't ask Claude what's in my pantry or have it update things for me.

My recipes aren't connected to any of this. I can't see which recipes I can cook from what I have, what I'd need to buy for one, or what to cook first before food goes off.

## Proposed outcome

One system I own, made of three parts:

1. **Mobile app (native iPhone app).** One app with three sections:
   - **Shopping list.** I use it in shops. It shows what I need to buy and roughly what it will cost, and it works without signal. Pantry stock updates as I tick things off, and goes to the pantry by itself whenever there's signal.
   - **Recipes.** All my recipes. A recipe's detail page is where I cook from: it shows what I have and what I'm short of, and has a step-by-step cooking view.
   - **Pantry.** A cut-down version of the pantry for the phone. I can record what I've used, add stock, mark a pack as open, search and view stock, edit an item's details, and review New items.
2. **Pantry admin app (desktop web).** I use it at my desk to manage pantry items, stock, recipes and tags. It does everything the phone's Pantry section does, plus the jobs that stay on the desktop, such as renaming and removing tags and merging items.
3. **Claude connection.** Claude can read pantry stock, update stock, edit the shopping list, create or change pantry items, and read, search and add recipes. I can use it from the Claude phone app and on desktop or web. For example: "what can I cook tonight?", "I used the last of the rice", "add what I need for this recipe to the list", "save this recipe".

All three sections of the mobile app are built and released together.

Each pantry item records:
- name
- type: counted (eggs, tins, onions) or bulk (flour, oil, rice, spices)
- quantity and unit
- pack size (optional, for bulk items, such as 1 kg)
- minimum level
- tags (optional, any number, such as dairy and breakfast; they don't decide where the item is in a shop)
- aisle, for each store I shop in (a number, or a named place such as Freezer or Tills; blank until I give it one)
- location (fridge, freezer, cupboard, counter or other)
- use-by date
- bought date (when I last bought it)
- price each (marked as an estimate when Claude guessed it rather than me giving it)
- preferred brand (optional; blank means any brand is fine)
- other names (optional, such as coriander and cilantro), used to match recipe ingredients
- notes

Any pantry item with a minimum above 0 is a **Staple**. Staples are the things I always keep in stock.

Preferred brand is a note for when I shop online. Placing online orders from the app is out of scope, but I can mark something on the list as ordered (see The shopping list). The brand shows in the pantry admin app but not in the shopping list.

Each recipe records:
- name
- ingredients, each with an amount, linked to a pantry item when there is one
- method
- servings
- prep and cook time
- tags (such as cuisine and meal type)
- source
- my notes

### How it should behave

**The shopping list**
- Any Staple below its minimum goes on the list automatically, showing how many to buy. I can also add extra items by hand.
- When checking off an item, I can tick one unit at a time, enter an amount, or check off all of it at once.
- An item leaves the list once what I've checked off brings stock back above its minimum.
- The list can hold things that aren't in the pantry yet, such as a recipe ingredient I've never bought. These stay on the list only and don't appear in the pantry while I'm shopping.
- When I check one of these off, it becomes a pantry item with the amount I bought and a minimum of 0. The app guesses its location, and I can change it and give it tags. It is linked to the recipe ingredient it came from.
- A new item made this way is marked "New" until I've reviewed and saved it, because its location is a guess and it has no tags yet. I can review it in the admin app or in the phone's Pantry section.
- If I undo the check-off on the phone, the item comes off stock again (and doesn't go into the pantry if it was new).
- Items that are already in the pantry stay there while they're on the list. If I have none, they show as Out.
- On the phone I choose how I shop: by aisle or by tag. The list has an Aisles menu and a Tags menu. Aisles shows the list in the order I walk the store (see Aisles) and lets me jump to one aisle. Tags lets me pick a tag, such as everything for the butcher or the greengrocer, and shows only items with it. Items with no tags show under No tag.
- I can mark an item on the list as Ordered (for example, when I've ordered it online), so I don't also buy it in a shop. It stays on the list, marked Ordered, until it arrives and is no longer needed; then the mark clears by itself. I mark it in the admin app's shopping list or by telling Claude, and the mobile app's shopping list shows it.

**Aisles**
- Aisles belong to stores, not tags. Each item has its own aisle in each store I shop in, and it starts blank. Tags don't set the aisle.
- An aisle is a number ("Aisle 4") or a named place I add, such as Freezer or Tills. That is its name on the list.
- The list walks the store: All items first, then No aisle, then the aisles in number order, then the named places.
- When I tick off an item that has no aisle in this store, the app asks which aisle it was in: a sheet of number tiles, a way to enter a higher number than the tiles go, and my named places. It starts blank. If I bought more than one, it waits a second or two after my last tap before asking. I can skip it, and it asks again next time.
- A setting turns this asking off. With it off, I set aisles from the item or the store's Aisles section instead.
- A store whose list goes A to Z (it has no aisle numbers) never asks.
- Each store has an Aisles section showing the aisles used so far and the items in each, so I can fix mistakes. There's nothing to set up first: aisles fill in as I shop.
- On the phone I can also set an item's aisle for the store I'm in from the item itself.

**Prices and the estimated total**
- The shopping list shows an estimated total in the mobile app and the admin app: each item's price times how many to buy, added up. The mobile app has it from its first release.
- Items with no price aren't in the total. The list says how many there are, so I know the figure is short.
- A price can be marked as an estimate. Claude marks the prices it guesses; a price I set myself, in either app, clears the mark.
- When any item on the list has no price or an estimated price, the total shows as approximate.

**Syncing**
- There's no manual sync anywhere (decided 20 Nov 2026). Changes go through by themselves.
- The desktop app picks up Claude's changes by itself within a few seconds, with a short note saying what Claude changed. It also syncs when I come back to it.
- On the phone, a check-off updates stock straight away, and so does anything I do in the Pantry section. Each change is saved on the phone and sent to the pantry by itself shortly after, whenever there's signal. With no signal it waits on the phone and goes as soon as signal returns. The phone also picks up changes from the desktop app and Claude by itself.
- Ticked items stay on the phone's list, struck through, until I start a new list, so I can see what I've got during a shop.
- When the phone has changes waiting and no signal, it says so. Signing out with changes waiting warns me first.
- If the same item has changed in two places since the last sync (for example, I changed it in the admin app while I was out shopping), the app asks me which change to keep.
- Until I choose, that item keeps the value from the app I'm using. The rest of the sync still goes through.

**Stock**
- Stock goes down when I record what I've used. I can do that in the pantry admin app, in the phone's Pantry section, or by telling Claude.
- Counted items are tracked by number. Bulk items are tracked as whole packs, and the app knows whether one is open. I want to see the quantity the way I'd say it, for example "two bags of flour, one open". It doesn't measure how much is left in an open pack.
- I can mark a pack as open. An open pack counts as less than one full pack.
- For bulk items, only full packs count towards the minimum. The amount to buy is the minimum minus the full packs. For example, one open bag of rice with a minimum of 2 means buying 2.
- Each unit has its own use-by date. Opening a pack brings its use-by forward if the item has a use-within time.
- Ticking an item off the list, or adding stock, sets its bought date to today. I can change it.

**Recipes**
- I add recipes through Claude. I give Claude a recipe (typed, pasted, a web link or a file) and it saves it.
- When Claude saves a recipe, it matches each ingredient to my pantry. Clear matches are linked without asking. Ingredients with nothing similar are kept on the recipe as "not in your pantry yet". No pantry item is created for them until I buy one. If Claude is unsure (for example, "onion" when I have red and brown onions), it asks me.
- After saving, Claude tells me what it linked, what it created and what it asked about.
- A recipe keeps its own wording for each ingredient (such as "400 g tin chopped tomatoes") as well as the link to the pantry item.
- I can merge two pantry items into one in the admin app, and their recipe links move across. Stock from both items is added together, and the higher of the two minimums is kept.
- An ingredient that isn't in the pantry yet becomes a pantry item only once I've bought it (see The shopping list). Items created this way get a minimum of 0 unless I set one, so they aren't Staples and don't land on the shopping list by themselves.
- Each recipe shows which ingredients I have and which I'm short of.
- I can filter to recipes I can cook now with current stock. Recipes that use things close to their use-by date are ranked first.
- Changing the number of servings scales the ingredient amounts.
- Each recipe has a "Want to cook" button. When I click it, the ingredients I'm short of are added to the shopping list.
- I can also add any single ingredient to the shopping list from the recipe, including ones I already have some of. Adding one puts 1 pack or unit on the list. The list item's note says what the recipe needs, for example "Sardine linguine: 200 g".
- Once an ingredient is on the list, the recipe shows a number I can raise or lower. Taking it below 1 removes it from the list.
- An "Add all missing" action adds 1 of every ingredient I'm short of that isn't already on the list.
- A recipe's detail page in the mobile app has a step-by-step cooking view to follow while I cook.
- When I mark a recipe as cooked, I check what was used and then stock goes down. Counted ingredients are filled in with the recipe amounts, which I can change. Each bulk ingredient has a "finished it" tick, and ticking it takes one pack off stock.
- For bulk ingredients, a recipe shows that I have some, not whether I have enough. If a bulk item has a pack size, the app warns me when a recipe needs more than my packs could hold (for example, 1.5 kg of flour when I have one 1 kg bag).
- I can see all my recipes in the pantry admin app and in the mobile app's Recipes section.
- Recipes I've marked "Want to cook" are downloaded to the phone, so I can read them in a shop without signal. Other recipes need signal.

**Pantry on the phone**
- The phone's Pantry section covers: recording what I've used, adding stock, marking a pack as open, searching and viewing stock, editing an item's details (such as minimum, location, store, aisle and notes), and reviewing New items.
- I can add a new tag from the phone. Giving items tags, renaming and removing tags, and merging items stay in the admin app.

**Tags** (called categories until 24 Nov 2026)
- I manage tags in the pantry admin app: adding, renaming and removing them, and choosing each item's tags. They aren't fixed. The phone can add a new tag too.
- An item can have any number of tags, or none. Renaming a tag renames it everywhere.
- Tags are labels for finding and filtering things. They don't decide the aisle or the order of the shopping list.
- Removing a tag takes it off every item that has it. The app tells me how many first, and it can be undone from History.
- Tags reach the mobile app when it syncs, like stores, and the shopping list's Tags menu uses them.
- In a shop I can add or edit a store, add a tag, and set an item's aisle, on the phone. These changes go to the pantry by themselves, so the admin app and Claude see them. If the same store was changed in both places, the phone's version wins.

**Undo**
- I can undo any change from History on the same day, including a merge, a delete and removing a tag. Changes Claude makes can be undone the same way.

**What Claude can do**
- Claude can read pantry stock, the shopping list and my saved recipes, and search them.
- Claude can add items, stock, list entries, recipes and stores without asking.
- When I tell Claude what I've used ("I used the last of the rice"), it takes that off stock without asking. This doesn't count as an edit.
- Claude must ask me to confirm before it edits or deletes anything else, including changing a store or an item's aisle.
- Claude can read prices and the shopping list's estimated total. It can set the prices of many items at once, for example from a receipt or as estimates for items with none, after I confirm the whole batch once. It says whether the prices are estimates.
- Claude can change an item's aisle in a store, but not add, rename or remove tags. Those stay in the admin app.

**Success looks like:**
- I do four weekly shops in a row with nothing forgotten and nothing bought that I already had enough of.
- After each weekly shop, every Staple is at or above its minimum. In a month, no more than two Staples run out completely between shops.
- Once a month I check 20 items against the shelf, and at least 18 match what the app says.
- Keeping the pantry up to date takes under 10 minutes a week, not counting time in shops or cooking.
- Recording one used item takes under 10 seconds, or about three taps.
- I can ask Claude what to cook from what I have, and tell it what I've used, without opening any of the apps.
- I can pick a recipe and know straight away what I have and what I need to buy.
- Marking a recipe as cooked keeps stock right without extra work.
- The mobile app looks and moves like a proper iPhone app, not a web page.

## Affected users and systems

- **Me**, as the only user for now.
- **Other people, later.** They will sign up and create their own pantry. Each person's pantry, shopping list and recipes are separate from mine and private to them. Adding this shouldn't need a rebuild.
- **The current shopping-list web app.** The native mobile app takes over from it. The web app stays running as a fallback, isn't improved any further, and is switched off once the native app has taken over (decided 24 Nov 2026). It can't follow aisles on items, so its list order stops making sense from then on anyway.
- **The pantry admin app, the pantry database and the Claude connection**, which already exist. The mobile app uses the same data and the same sign-in.
- **Claude** (phone app and desktop/web), as a way in to the same data.
- **My recipes skill**, which currently suggests meals from my pantry. It should be able to use the new pantry and recipe data.

## Constraints

- The mobile app is a native iPhone app, not a web app. I want it for four reasons: it should feel like a proper iPhone app, keep its data on the phone reliably without signal, be able to use phone features (such as barcode scanning, notifications, widgets and keeping the screen awake while cooking), and teach me how to build one.
- It runs on iPhone now. Android may be needed later when other people sign up, which Expo allows.
- It reaches phones through TestFlight, for me and a few people I invite. It isn't a public App Store app.
- I've never built a mobile app.
- The shopping list is used one-handed, in supermarkets, corner shops, greengrocers, butchers and fishmongers. Signal is often poor.
- The recipe detail page is used while cooking, often with wet or messy hands.
- The mobile app and the admin app need a login. The pantry is private. I sign in with my email and a password.
- The admin app is desktop-only.
- The Claude connection has to work from the Claude phone app, not just on a desktop.
- It doesn't have to be free to run, but it should be cheap for one person.
- The mobile app is built with Expo (React Native). It has to work with the pantry database, sign-in and Claude connection that already exist.

## Open questions

- **Success numbers:** the numbers in the success list are starting guesses. Review them after a month of use, especially the 10 minutes a week.
- **Use-by warnings:** recipes are ranked by what needs using first. Should anything also warn me before things go off?
- **Other users:** people will sign up and create their own pantry. When does sign-up open? Can two people in one household share a pantry? Does each person get their own Claude connection?
- **Clashes without manual sync:** with changes going through by themselves, the same item changing in two places should be rare (mostly a shop with no signal while the desktop app is used). Is asking which to keep still right, or should the later change win, as the desktop app does?
- **Phone features:** which of barcode scanning, notifications, widgets and keeping the screen awake are in the first release, and which come later?
- **Named aisles in the walk:** named places (Freezer, Tills) go after the numbered aisles. Should I be able to put them in order among the numbers instead (Freezer between aisles 8 and 9)?
- **Bought date:** one date per item (when I last bought it), or one per unit like use-by dates?
- **Shopping by tag:** can I pick more than one tag at once (butcher and fishmonger), and does an item with two tags show under both?
