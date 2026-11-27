# Insights: purchase tracking plan (27 November 2026)

Status, end of 27 Nov: steps 1 to 6 built on branch item-aisle-guess (PR 114). Not yet released: the two
migrations aren't applied, the Claude function isn't redeployed, and the phone needs build 16.

The web Home's Insights view (Isaac's mock-up, "How November's going") needs a dated record of what was bought, used,
cooked and thrown out, with quantities and prices. Today the app keeps none of that in a form it can add up.

## Isaac's decisions (27 Nov 2026)

- **Storage:** structured facts on History entries, not a separate table. History already syncs, merges by id and
  undoes, so an undone tick-off drops out of Insights by itself.
- **A shop:** the phone's list from the first tick-off to Finish for today (or a new list), at the store you were in.
  Stock added on the web or by Claude counts as spend but not as a shop.
- **Backfill:** cooked and thrown-out entries since 14 November become facts. Spend starts on release day (no prices
  or quantities were kept before).
- **Price:** the item's price copied at tick-off, marked as an estimate when it's Claude's guess. Later price changes
  don't rewrite the past.

## The record

`history.facts` (jsonb, nullable; one migration). Each History entry carries a list:

```ts
type Fact =
  | { kind: "bought"; itemId: string; qty: number; pence?: number; estimate?: boolean; storeId?: string; shopId?: string }
  | { kind: "used"; itemId: string; qty: number }
  | { kind: "threw"; itemId: string; qty: number; pence?: number }
  | { kind: "cooked"; recipeId: string; first?: boolean }
```

- `pence` is the line total (unit price × qty) at the time. No price means it's left out of spend and counted.
- Entries marked `undone` are ignored. Merged entries (the phone's `key: shop:<id>` run of taps) rewrite their facts
  to match the final state, so tapping + and − nets out.
- The type and pure helpers live in `pantry-app/src/model.ts`, so the phone and Claude use the same code.

## Steps

1. **Model and migration.** `Fact` and `factsOf(history, from, to)` in the model. Migration
   `history_facts`. History rows map `facts` in `shared/src/rows.ts`; the History fingerprint in `sync.ts`
   includes them. Tests.
2. **Phone writes.** `tickOne`, `tickAll`, `untick`, `restoreTicks`, Got all and Skip leave the right `bought`
   facts. The phone's `shop` gets an id when the first tick happens; Finish for today and a new list close it.
   Used and cooking on the phone write `used` and `cooked`. Tests in `mobile/test/`.
3. **Web writes.** Used 1, All, Finished, throw out, Cooked, and stock raised in the item panel (`bought`, no shop).
4. **Claude writes.** `record_used`, `cooked_recipe`, `add_stock` and throwing out write facts. `pnpm build:mcp`,
   redeploy.
5. **Backfill.** A one-off script reads History since 14 Nov: `Cooked …` entries with a `recipeId` become
   `cooked`; `Threw out …` entries with one item become `threw` (quantity from the title, price from the item's
   price today, marked estimate). Dry run first, shown to Isaac, then written.
6. **Insights.** A pure `insights(history, items, recipes, period)` in the model, tested, then the page from the
   mock-up: This week / month / This year; Spent on food (vs the period before), Shops (average, most at),
   Cooked at home (meals, recipes, new), Thrown out (£, share of what was bought); weekly spend for the last eight
   weeks with the average line; where the money went by tag (top five, then Everything else); used most; how fast
   you use things (from the gaps between buys and uses, shown only with three or more); thrown out list.
   While there's under a week of spend, the spend cards say "Since 28 Nov" rather than showing a thin chart.
7. **Release.** Migration first, then the web and Claude (one merge), then a phone EAS build (16) and TestFlight.
   Until the phone build is installed, phone tick-offs aren't recorded.

## Open questions for later

- "Where the money went" groups by an item's first tag. Items with several tags count once, under the first.
- The phone's Home could show a small Insights card once there's data. Not in this plan.
