# Intent: pantry, recipes and shopping list app, with Claude access

Author: Isaac Forman · Date: 14 Nov 2026 · Status: draft, awaiting review

## Problem

My shopping list and pantry stock live in Notion. I'm building a small web app for checking off items in shops, but it depends on Notion for the stock data. I'd rather not rely on a third-party app for this. I want one seamless, elegant solution where the list, the stock and the recipes work together. I have to keep the list and the stock in step by hand, and nothing tells me what's running low. I also can't ask Claude what's in my pantry or have it update things for me.

My recipes aren't connected to any of this. I can't see which recipes I can cook from what I have, what I'd need to buy for one, or what to cook first before food goes off.

## Proposed outcome

One system I own, made of four parts, that replaces Notion completely:

1. **Shopping app (mobile-first web).** I use it in shops on my iPhone. It shows what I need to buy, and it works without signal. Pantry stock updates when I choose to sync, for example at the end of a shop. I can also look at recipes here and add what I'm missing for one.
2. **Pantry admin app (desktop web).** I use it at my desk to manage pantry items, stock, recipes and categories.
3. **Kitchen app (mobile web).** A separate app I use on my phone in the kitchen. I use it for the quick pantry jobs (recording what I've used, adding stock), viewing recipes and cooking. Everything else, such as setting up items and minimums, stays in the admin app. It is built after the shopping app and the admin app are working.
4. **Claude connection.** Claude can read pantry stock, update stock, edit the shopping list, create or change pantry items, and read, search and add recipes. I can use it from the Claude phone app and on desktop or web. For example: "what can I cook tonight?", "I used the last of the rice", "add what I need for this recipe to the list", "save this recipe".

Each pantry item records:
- name
- type: counted (eggs, tins, onions) or bulk (flour, oil, rice, spices)
- quantity and unit
- pack size (optional, for bulk items, such as 1 kg)
- minimum level
- category (the shop or aisle section it belongs to, such as dairy or tins)
- location (fridge, freezer, cupboard)
- use-by date
- price
- preferred brand (optional; blank means any brand is fine)
- other names (optional, such as coriander and cilantro), used to match recipe ingredients
- notes

Any pantry item with a minimum above 0 is a **Staple**. Staples are the things I always keep in stock.

Preferred brand is for online shopping. It shows in the pantry admin app but not in the shopping app.

Each recipe records:
- name
- ingredients, each with an amount and linked to a pantry item
- method
- servings
- prep and cook time
- tags (such as cuisine and meal type)
- source
- my notes

Existing Notion data, including my pantry, shopping list and recipes, is imported once. After that, Notion is no longer used.

### How it should behave

**The shopping list**
- Any Staple below its minimum goes on the list automatically, showing how many to buy. I can also add extra items by hand.
- When checking off an item, I can tick one unit at a time, enter an amount, or check off all of it at once.
- An item leaves the list once what I've checked off brings stock back above its minimum.

**Syncing**
- Stock from the shopping app updates when I sync, not on each tap.
- If I finish a shop and haven't synced, the app reminds me.
- If the same item has changed in two places since the last sync (for example, I changed it in the admin app while I was out shopping), the app asks me which change to keep.
- Until I choose, that item keeps the value from the app I'm using. The rest of the sync still goes through.

**Stock**
- Stock goes down when I record what I've used. I can do that in the pantry admin app or the kitchen app, or by telling Claude.
- Counted items are tracked by number. Bulk items are tracked as whole packs, and the app knows whether one is open. I want to see the quantity the way I'd say it, for example "two bags of flour, one open". It doesn't measure how much is left in an open pack.
- I can mark a pack as open. An open pack counts as less than one full pack.
- For bulk items, only full packs count towards the minimum. The amount to buy is the minimum minus the full packs. For example, one open bag of rice with a minimum of 2 means buying 2.
- If I keep more than one of something (its minimum is above 1), each unit has its own use-by date. Otherwise the item has one use-by date.

**Recipes**
- I add recipes through Claude. I give Claude a recipe (typed, pasted, a web link or a file) and it saves it.
- When Claude saves a recipe, it matches each ingredient to my pantry. Clear matches are linked without asking. Ingredients with nothing similar become new pantry items. If Claude is unsure (for example, "onion" when I have red and brown onions), it asks me.
- After saving, Claude tells me what it linked, what it created and what it asked about.
- A recipe keeps its own wording for each ingredient (such as "400 g tin chopped tomatoes") as well as the link to the pantry item.
- I can merge two pantry items into one in the admin app, and their recipe links move across. Stock from both items is added together, and the higher of the two minimums is kept.
- Every ingredient is a pantry item. If a recipe uses something that isn't in the pantry yet, a pantry item is created for it. Items created this way get a minimum of 0 unless I set one, so they aren't Staples and don't land on the shopping list by themselves.
- Each recipe shows which ingredients I have and which I'm short of.
- I can filter to recipes I can cook now with current stock. Recipes that use things close to their use-by date are ranked first.
- Changing the number of servings scales the ingredient amounts.
- Each recipe has a "Want to cook" button. When I click it, the ingredients I'm short of are added to the shopping list.
- The kitchen app has a step-by-step cooking view to follow while I cook.
- When I mark a recipe as cooked, I check what was used and then stock goes down. Counted ingredients are filled in with the recipe amounts, which I can change. Each bulk ingredient has a "finished it" tick, and ticking it takes one pack off stock.
- For bulk ingredients, a recipe shows that I have some, not whether I have enough. If a bulk item has a pack size, the app warns me when a recipe needs more than my packs could hold (for example, 1.5 kg of flour when I have one 1 kg bag).
- I can see recipes in the pantry admin app, the kitchen app and the shopping app.
- Recipes I've marked "Want to cook" are downloaded to the shopping app, so I can read them in a shop without signal.

**Categories**
- I can add, rename and remove categories in the pantry admin app. They aren't fixed. Today's set comes from Notion's 18.
- Every item belongs to one category. Renaming a category renames it everywhere, including each store's aisle order and the shopping list.
- A new category appears in every store's aisle order. It starts with no aisle number until I set one.
- I can't remove a category that still has items in it. The app tells me how many, and offers to move them to another category first.
- Categories reach the shopping app when it syncs, like stores and aisles.

**Undo**
- I can undo a merge or a delete from History on the same day. This includes removing a category.

**What Claude can do**
- Claude can read pantry stock, the shopping list and my saved recipes, and search them.
- Claude can add items, stock, list entries and recipes without asking.
- When I tell Claude what I've used ("I used the last of the rice"), it takes that off stock without asking. This doesn't count as an edit.
- Claude must ask me to confirm before it edits or deletes anything else.

**Success looks like:**
- I do four weekly shops in a row with nothing forgotten and nothing bought that I already had enough of.
- After each weekly shop, every Staple is at or above its minimum. In a month, no more than two Staples run out completely between shops.
- Once a month I check 20 items against the shelf, and at least 18 match what the app says.
- Keeping the pantry up to date takes under 10 minutes a week, not counting time in shops or cooking.
- Recording one used item takes under 10 seconds, or about three taps.
- I can ask Claude what to cook from what I have, and tell it what I've used, without opening any of the apps.
- I can pick a recipe and know straight away what I have and what I need to buy.
- Marking a recipe as cooked keeps stock right without extra work.

## Affected users and systems

- **Me**, as the only user for now. Others in the household may share the pantry and list later. That shouldn't need a rebuild.
- **The current shopping-list prototype**, which reads from and syncs with Notion today. That Notion sync goes away.
- **My Notion pantry, shopping list and recipes**, as a one-off data source.
- **Claude** (phone app and desktop/web), as a new way in to the same data.
- **My recipes skill**, which currently suggests meals from my pantry. It should be able to use the new pantry and recipe data.

## Constraints

- The shopping app is used one-handed, on an iPhone, in supermarkets, corner shops, greengrocers, butchers and fishmongers. Signal is often poor.
- All three apps need a login. The pantry is private. I sign in with an email link or a passkey, not a password.
- The admin app is desktop-only. The quick pantry jobs can be done on a phone in the kitchen app.
- The kitchen app is used while cooking, on a phone, often with wet or messy hands.
- The Claude connection has to work from the Claude phone app, not just on a desktop.
- It doesn't have to be free to run, but it should be cheap for one person.
- There are no set tools or tech stack.

## Open questions

- **Success numbers:** the numbers in the success list are starting guesses. Review them after a month of use, especially the 10 minutes a week.
- **Use-by warnings:** recipes are ranked by what needs using first. Should anything also warn me before things go off?
- **Notion import:** which Notion fields map to the new item and recipe fields, and what do I do with items or recipes that don't fit?
- **Categories and Claude:** can Claude add or rename categories, or only use the ones that exist? Today it would have to ask before editing one.
- **Sharing later:** if others join, do they see the same pantry, and does anyone have different permissions?
- **Online shopping:** preferred brand exists for online orders. Is ordering online in scope, or is the brand just a note for now?
