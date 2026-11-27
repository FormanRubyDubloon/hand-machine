-- Backfill for Insights (claude/insights-plan.md, Isaac's decision 27 Nov 2026): cooking and throwing out since the
-- pantry began become facts. Spend can't be backfilled: no prices or quantities were kept before.
-- Only entries with no facts yet, so running it twice does nothing more. Dry run on 27 Nov 2026 found four entries.

-- "Cooked <recipe>" with its recipe linked.
update public.history
set facts = jsonb_build_array(jsonb_build_object('kind', 'cooked', 'recipeId', recipe_id))
where facts is null and title like 'Cooked %' and recipe_id is not null;

-- "Threw out <n> …" for one item: the number in the title (1 when there isn't one), priced at the item's price
-- today and marked as an estimate, since the price then wasn't kept.
update public.history h
set facts = jsonb_build_array(
  jsonb_strip_nulls(jsonb_build_object(
    'kind', 'threw',
    'itemId', h.item_ids[1],
    'qty', coalesce((substring(h.title from '^Threw out (\d+)'))::int, 1),
    'pence', case when i.price is null then null else round(i.price * coalesce((substring(h.title from '^Threw out (\d+)'))::int, 1)) end,
    'estimate', case when i.price is null then null else true end
  ))
)
from public.items i
where h.facts is null and h.title like 'Threw out %' and cardinality(h.item_ids) = 1
  and i.owner_id = h.owner_id and i.id = h.item_ids[1];
