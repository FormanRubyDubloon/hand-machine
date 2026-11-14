# Intent: Shopping list check-off app

**Author:** Isaac Forman
**Date:** 13 November 2026
**Status:** Draft

## Problem

My shopping list is a stock list kept in a Notion database. Using it in a shop is awkward. I need a simple way to see what to buy and tick items off as I go, with Notion staying up to date without me opening it.

This is also a practice prototype for learning to build a small app, so the learning matters as much as the result.

## Proposed outcome

- I can see what I need to buy. For each item, that is "amount" minus "in stock".
- Each tap checks off one unit and adds 1 to "in stock" in the app. An item is done when "in stock" equals "amount".
- Syncing with Notion is manual and works both ways. When I choose to sync, the app sends my stock changes to Notion and pulls in any changes made in Notion.
- Success: I do a full weekly shop with it and never open Notion.

## Affected users and systems

- **User:** Me, on my iPhone, in the shop, going aisle by aisle. One hand free, because the basket is in the other. Signal may be poor.
- **Where:** Mostly the supermarket, but also corner shops, greengrocers, butchers and fishmongers.
- **System:** A Notion database. Each item has:
  - Amount: how many to keep in stock
  - In stock: how many I have
  - Category: maps to aisles
  - Notes

## Constraints

- Runs on iPhone as a web app, not an App Store app.
- Needs a login so only I can see and change the list.
- The list lives in Notion. The app only syncs with it when I choose.
- No set tools or languages.
- Doesn't have to be free to run.

## Open questions

- Does the order of items matter (for example, following the aisles), and does the list need to know which kind of shop I'm in?
- What happens to an item I can't get in this shop but might get at the next one?
- If the same item changes in both the app and Notion between syncs, which change wins?
- Is it only me, or will anyone else add to or shop from the list? (Assumed just me for now.)
- What do I want to have learned or tried by the end of this prototype?
