// Built by prototypes/claude-connection/build.mjs. Don't edit: change the source and run pnpm build:mcp.

// prototypes/claude-connection/edge/index.ts
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

// prototypes/shared/src/rows.ts
var ITEM_SELECT = "*, list_entries(position, kind, recipe, qty, at)";
var toEntry = (r) => ({
  source: r.kind === "recipe" ? { kind: "recipe", recipe: r.recipe ?? "" } : { kind: r.kind },
  qty: Number(r.qty),
  // Supabase hands a time back in its own format; keep one format so a round trip isn't a change.
  ...r.at ? { at: new Date(r.at).toISOString() } : {}
});
var toEntryRow = (e, position) => ({
  position,
  kind: e.source.kind,
  recipe: e.source.kind === "recipe" ? e.source.recipe : null,
  qty: e.qty,
  at: e.at ? new Date(e.at).toISOString() : null
});
function unitPair(u) {
  if (!u) return void 0;
  if (/\d|^(kg|g|ml|litres?|pound)$/i.test(u) || u.includes(" ")) return [u, u];
  const one = /[^s]s$/i.test(u) ? u.slice(0, -1) : u;
  return [one, /(ch|sh|x)$/i.test(one) ? `${one}es` : `${one}s`];
}
function toItem(r) {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    target: r.target ?? 0,
    inStock: r.in_stock ?? 0,
    unit: unitPair(r.unit),
    notes: r.notes ?? void 0,
    categoryId: r.category_id ?? "",
    where: [],
    location: r.location ?? void 0,
    otherNames: r.other_names.length ? r.other_names : void 0,
    open: r.open ?? void 0,
    packSize: r.pack_size_amount && r.pack_size_measure ? { amount: r.pack_size_amount, measure: r.pack_size_measure } : void 0,
    price: r.price ?? void 0,
    brand: r.brand ?? void 0,
    useBy: r.use_by.length ? r.use_by : void 0,
    noExpiry: r.no_expiry || void 0,
    openCounts: r.open_counts || void 0,
    oneOff: r.one_off || void 0,
    review: r.needs_review || void 0,
    uses: r.uses || void 0,
    entries: r.list_entries?.length ? [...r.list_entries].sort((a, b) => a.position - b.position).map(toEntry) : void 0,
    openedAt: r.opened_at?.length ? r.opened_at : void 0,
    editedAt: r.edited_at,
    addedAt: r.created_at
  };
}
function toRecipe(r) {
  return {
    id: r.id,
    name: r.name,
    minutes: r.minutes ?? 0,
    serves: r.serves ?? 2,
    wantToCook: r.want_to_cook,
    soon: r.soon ?? void 0,
    ingredients: [...r.recipe_ingredients].sort((a, b) => a.position - b.position).map((i) => ({ text: i.text, itemId: i.item_id ?? "", need: i.need, buy: i.buy, partial: i.partial || void 0, uses: i.uses ?? void 0 })),
    method: r.method,
    prep: r.prep ?? void 0,
    cook: r.cook ?? void 0,
    tags: r.tags,
    meal: r.meal ?? void 0,
    source: r.source ?? void 0,
    notes: [r.intro, r.notes].filter(Boolean).join("\n\n") || void 0,
    lastCooked: r.last_cooked,
    addedBy: r.added_by,
    addedAt: r.added_at,
    editedAt: r.edited_at
  };
}
var unitText = (u) => u?.[0] ?? null;
function toRow(i, knownCategories) {
  return {
    id: i.id,
    name: i.name,
    category_id: i.categoryId && knownCategories.has(i.categoryId) ? i.categoryId : null,
    type: i.type,
    target: i.target,
    in_stock: i.inStock,
    unit: unitText(i.unit),
    notes: i.notes ?? null,
    location: i.location ?? null,
    other_names: i.otherNames ?? [],
    open: i.open ?? null,
    pack_size_amount: i.packSize?.amount ?? null,
    pack_size_measure: i.packSize?.measure ?? null,
    price: i.price ?? null,
    brand: i.brand ?? null,
    use_by: i.noExpiry ? [] : (i.useBy ?? []).filter((d) => !!d),
    no_expiry: !!i.noExpiry,
    open_counts: !!i.openCounts,
    opened_at: (i.openedAt ?? []).filter((d) => !!d),
    one_off: !!i.oneOff,
    needs_review: !!i.review,
    uses: i.uses ?? 0,
    edited_at: i.editedAt ?? (/* @__PURE__ */ new Date()).toISOString()
  };
}
function splitNotes(notes, before) {
  const intro = before?.intro;
  if (!notes) return { intro: null, notes: null };
  if (intro && notes.startsWith(intro)) return { intro, notes: notes.slice(intro.length).replace(/^\s+/, "") || null };
  return { intro: null, notes };
}
function groupsFor(r, before) {
  const old = [...before?.recipe_ingredients ?? []].sort((a, b) => a.position - b.position);
  const used = /* @__PURE__ */ new Set();
  let last = null;
  return r.ingredients.map((g) => {
    const k = old.findIndex((o, n) => !used.has(n) && o.text === g.text);
    if (k >= 0) {
      used.add(k);
      last = old[k].group_name ?? null;
    }
    return last;
  });
}
function recipeRows(recipes, before, items) {
  const rows = recipes.map((r) => ({
    id: r.id,
    name: r.name,
    ...splitNotes(r.notes, before[r.id]),
    serves: r.serves,
    minutes: r.minutes || null,
    prep: r.prep ?? null,
    cook: r.cook ?? null,
    source: r.source ?? null,
    method: r.method,
    tags: r.tags ?? [],
    meal: r.meal ?? null,
    want_to_cook: r.wantToCook,
    soon: r.soon ?? null,
    last_cooked: r.lastCooked ?? null,
    added_by: r.addedBy ?? "you",
    added_at: r.addedAt ?? (/* @__PURE__ */ new Date()).toISOString(),
    edited_at: r.editedAt ?? r.addedAt ?? (/* @__PURE__ */ new Date()).toISOString()
  }));
  const lines = recipes.flatMap((r) => {
    const groups = groupsFor(r, before[r.id]);
    return r.ingredients.map((g, position) => ({
      recipe_id: r.id,
      position,
      text: g.text,
      group_name: groups[position],
      item_id: g.itemId && items.has(g.itemId) ? g.itemId : null,
      need: g.need,
      buy: g.buy,
      partial: !!g.partial,
      uses: g.uses ?? null
    }));
  });
  return { rows, lines };
}

// prototypes/claude-connection/src/backend.ts
var RECIPE_SELECT = "*, recipe_ingredients(position, text, group_name, item_id, need, buy, partial, uses)";
function check(res) {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
function supabaseBackend(db) {
  return {
    async load() {
      const [items, recipes, categories, stores, aisles] = await Promise.all([
        db.from("items").select(ITEM_SELECT).order("name"),
        db.from("recipes").select(RECIPE_SELECT).order("name"),
        db.from("categories").select("id, name, sort").order("sort"),
        db.from("stores").select("id, name, kind, place, sort").order("sort"),
        db.from("store_aisles").select("store_id, category_id, number")
      ]);
      const rows = check(recipes);
      const numbers = check(aisles);
      return {
        items: Object.fromEntries(check(items).map((r) => [r.id, toItem(r)])),
        recipes: rows.map(toRecipe),
        recipeRows: Object.fromEntries(rows.map((r) => [r.id, r])),
        categories: check(categories).map(({ id, name }) => ({ id, name })),
        stores: check(stores).map((s) => ({
          id: s.id,
          name: s.name,
          kind: s.kind ?? "",
          place: s.place ?? "",
          aisles: Object.fromEntries(numbers.filter((a) => a.store_id === s.id).map((a) => [a.category_id, a.number]))
        }))
      };
    },
    async saveItems(items, categories) {
      if (!items.length) return;
      check(await db.from("items").upsert(items.map((i) => toRow(i, categories)), { onConflict: "id" }));
      const ids = items.map((i) => i.id);
      check(await db.from("list_entries").delete().in("item_id", ids));
      const entries = items.flatMap((i) => (i.entries ?? []).map((e, n) => ({ item_id: i.id, ...toEntryRow(e, n) })));
      if (entries.length) check(await db.from("list_entries").insert(entries));
    },
    async deleteItems(ids) {
      if (ids.length) check(await db.from("items").delete().in("id", ids));
    },
    async saveRecipes(recipes, before, items) {
      if (!recipes.length) return;
      const { rows, lines } = recipeRows(recipes, before, items);
      check(await db.from("recipes").upsert(rows, { onConflict: "id" }));
      check(await db.from("recipe_ingredients").delete().in("recipe_id", recipes.map((r) => r.id)));
      if (lines.length) check(await db.from("recipe_ingredients").insert(lines));
    },
    async deleteRecipes(ids) {
      if (ids.length) check(await db.from("recipes").delete().in("id", ids));
    },
    async saveStores(stores, sort, categories) {
      if (!stores.length) return;
      check(await db.from("stores").upsert(stores.map((x) => ({ id: x.id, name: x.name, kind: x.kind || null, place: x.place || null, sort: sort(x.id) })), { onConflict: "id" }));
      check(await db.from("store_aisles").delete().in("store_id", stores.map((x) => x.id)));
      const aisles = stores.flatMap(
        (x) => Object.entries(x.aisles).filter(([id, n]) => n != null && categories.has(id)).map(([category_id, number]) => ({ store_id: x.id, category_id, number }))
      );
      if (aisles.length) check(await db.from("store_aisles").insert(aisles));
    },
    async deleteStores(ids) {
      if (ids.length) check(await db.from("stores").delete().in("id", ids));
    },
    async addHistory(row) {
      check(await db.from("history").insert(row));
    },
    async history(limit) {
      return check(await db.from("history").select("*").order("at", { ascending: false }).limit(limit));
    }
  };
}

// prototypes/pantry-app/src/model.ts
var locations = [
  { value: "fridge", label: "Fridge" },
  { value: "freezer", label: "Freezer" },
  { value: "cupboard", label: "Cupboard" },
  { value: "household", label: "Household" }
];
var locationLabel = (l) => locations.find((x) => x.value === l)?.label ?? "No location";
var isStaple = (i) => i.target > 0;
var isBulk = (i) => i.type === "bulk";
var perUnitDates = (i) => i.target > 1;
var fullOf = (i, total = i.inStock) => isBulk(i) && !i.openCounts ? Math.max(0, total - (i.open ?? 0)) : total;
var shortfall = (i) => Math.max(0, i.target - fullOf(i));
var entryTotal = (i) => (i.entries ?? []).reduce((n, e) => n + e.qty, 0);
var needOf = (i) => Math.max(shortfall(i), entryTotal(i));
var LOW_AT = 0.5;
var stockOf = (i) => !isStaple(i) ? null : i.inStock <= 0 ? "out" : fullOf(i) <= i.target * LOW_AT ? "low" : null;
function unitText2(i, n) {
  if (!i.unit) return String(n);
  return `${n} ${n === 1 ? i.unit[0] : i.unit[1]}`;
}
var singular = (name) => name.replace(/oes$/i, "o").replace(/([^s])s$/i, "$1");
function amountOf(i, n) {
  if (i.unit) return `${unitText2(i, n)} of ${lower(i.name)}`;
  return `${n} ${lower(n === 1 ? singular(i.name) : i.name)}`;
}
function haveText(i, sep = " \xB7 ") {
  if (i.inStock === 0 && !i.unit) return "0";
  const base = unitText2(i, i.inStock);
  if (!isBulk(i) || !i.open) return base;
  return i.inStock === 1 ? `${base}${sep}open` : `${base}${sep}${i.open} open`;
}
function normalise(i) {
  const open = isBulk(i) ? Math.min(i.open ?? 0, i.inStock) : void 0;
  const want = i.noExpiry ? 0 : perUnitDates(i) || isBulk(i) ? i.inStock : Math.min(1, i.inStock);
  const dates = i.noExpiry ? [] : [...i.useBy ?? []].slice(0, want);
  while (dates.length < want) dates.push(null);
  const opened = [...i.openedAt ?? []].slice(0, open ?? 0);
  while (opened.length < (open ?? 0)) opened.push(null);
  return { ...i, open, useBy: dates, openedAt: isBulk(i) ? opened : void 0, review: i.review && i.inStock <= 0 ? true : void 0 };
}
function withStock(i, n) {
  const next = Math.max(0, n);
  const dates = [...i.useBy ?? []];
  if (next < i.inStock) dates.splice(0, Math.min(dates.length, i.inStock - next));
  let open = i.open ?? 0;
  if (isBulk(i) && next < i.inStock) open = Math.max(0, open - (i.inStock - next));
  return normalise({ ...i, inStock: next, useBy: dates, open: isBulk(i) ? open : void 0, openedAt: i.openedAt?.slice(i.openedAt.length - open) });
}
function settle(entries, bought) {
  if (!entries?.length || bought <= 0) return entries;
  let left = bought;
  const out = [];
  for (const e of entries) {
    if (left >= e.qty) left -= e.qty;
    else {
      out.push({ ...e, qty: e.qty - left });
      left = 0;
    }
  }
  return out;
}
var DAY = 864e5;
var startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
var daysUntil = (iso) => Math.round((startOf(new Date(iso)) - startOf(/* @__PURE__ */ new Date())) / DAY);
var todayIso = () => new Date(Date.now() - (/* @__PURE__ */ new Date()).getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
var soonest = (i) => i.inStock > 0 && !i.noExpiry ? (i.useBy ?? []).find((d) => !!d) ?? null : null;
var plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
var lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
var cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
var norm = (s) => s.toLowerCase().trim().replace(/(es|s)$/, "");
var namesOf = (i) => [i.name, ...i.otherNames ?? []];
var matchesName = (i, q) => namesOf(i).some((n) => norm(n) === norm(q));
function distance(a, b) {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
function listRows(items) {
  return Object.values(items).filter((i) => needOf(i) > 0).map((i) => {
    const reasons = [];
    if (shortfall(i) > 0) reasons.push({ kind: "staple", stock: stockOf(i) });
    for (const e of i.entries ?? []) {
      if (e.source.kind === "recipe") reasons.push({ kind: "recipe", recipe: e.source.recipe });
      else if (e.source.kind === "claude") reasons.push({ kind: "claude", at: e.at });
      else reasons.push({ kind: "hand" });
    }
    const first = reasons[0]?.kind;
    return { item: i, qty: needOf(i), reasons, group: first === "staple" ? "staples" : first === "recipe" ? "recipes" : "added" };
  });
}
function soldAt(i, store) {
  const aisle = store.aisles[i.categoryId];
  if (aisle === null || aisle === void 0) return false;
  return i.where.length === 0 || i.where.includes(store.id);
}
function aisleOrder(store, categories) {
  return [...categories].sort((a, b) => (store.aisles[a.id] ?? 999) - (store.aisles[b.id] ?? 999));
}
function scaleText(text, factor) {
  if (factor === 1) return text;
  const fractions = { "\xBD": 0.5, "\xBC": 0.25, "\xBE": 0.75, "\u2153": 1 / 3, "\u2154": 2 / 3 };
  return text.replace(/(\d+(?:\.\d+)?)?\s?([½¼¾⅓⅔])?/, (m, num2, frac) => {
    if (!num2 && !frac) return m;
    const value = (num2 ? parseFloat(num2) : 0) + (frac ? fractions[frac] : 0);
    const scaled = Math.round(value * factor * 100) / 100;
    const whole = Math.floor(scaled);
    const rest = scaled - whole;
    const fracOut = Object.entries(fractions).find(([, v]) => Math.abs(v - rest) < 0.02)?.[0];
    const out = rest < 0.02 ? String(whole) : fracOut ? `${whole || ""}${fracOut}` : String(scaled);
    return m.endsWith(" ") ? `${out} ` : out;
  }).replace(/^(\d+(?:\.\d+)?) (g|ml)\b/, (m, n, unit) => parseFloat(n) >= 1e3 ? `${parseFloat(n) / 1e3} ${unit === "g" ? "kg" : "l"}` : m).replace(/^(\d+(?:\.\d+)?|[½¼¾⅓⅔]) (jar|tin|clove|bulb|bunch|pack|bag|slice|fillet|lemon|chilli|pepper|aubergine|box|bottle|spring onion|egg)\b(?!s)/, (m, n, word) => parseFloat(n) > 1 ? `${n} ${/(ch|x)$/.test(word) ? `${word}es` : `${word}s`}` : m);
}
function ingredientRow(ing, items, factor = 1) {
  const item = ing.itemId ? items[ing.itemId] : void 0;
  const text = scaleText(ing.text, factor);
  const need = ing.partial ? 1 : Math.max(1, Math.ceil(ing.need * factor));
  if (!item) return { ing, item, status: "unlinked", need, missing: 0, text };
  if (isBulk(item) && item.packSize && ing.uses) {
    const required = Math.round(ing.uses * factor);
    const capacity = item.inStock * item.packSize.amount;
    if (item.inStock > 0 && required > capacity) return { ing, item, status: "little", need, missing: 0, required, capacity, text };
  }
  if (isBulk(item) || ing.partial) {
    if (item.inStock > 0) return { ing, item, status: isBulk(item) && item.open ? "some" : "have", need, missing: 0, text };
  } else if (item.inStock >= need) return { ing, item, status: "have", need, missing: 0, text };
  const missing = isBulk(item) || ing.partial ? 1 : need - item.inStock;
  return { ing, item, status: needOf(item) > 0 ? "listed" : "short", need, missing, text };
}
function recipeInfo(recipe, items, factor = 1) {
  const rows = recipe.ingredients.map((ing) => ingredientRow(ing, items, factor));
  const short = rows.filter((r) => r.status === "short" || r.status === "listed" || r.status === "little" || r.status === "unlinked");
  let usesUp = null;
  for (const r of rows) {
    if (!r.item || r.status === "short" || r.status === "listed") continue;
    const d = soonest(r.item);
    if (d && daysUntil(d) <= 14 && (!usesUp || d < usesUp.date)) usesUp = { item: r.item, date: d };
  }
  const have = rows.filter((r) => r.status === "have" || r.status === "some").length;
  return { rows, short, canCook: short.length === 0, usesUp, have };
}
var shortNames = (info, max = 3) => {
  const names = info.short.map((r) => r.item ? r.item.name : r.text);
  const shown = names.slice(0, max).map((n, i) => i === 0 ? n : lower(n));
  return names.length > max ? `${shown.join(", ")} +${names.length - max}` : shown.join(", ");
};
function byUseFirst(a, b) {
  const da = a.info.usesUp?.date ?? "9999";
  const db = b.info.usesUp?.date ?? "9999";
  return da < db ? -1 : da > db ? 1 : a.recipe.name.localeCompare(b.recipe.name);
}

// prototypes/shared/src/pantry.ts
var minutesText = (m) => m > 0 ? `${m} min` : "No time";

// prototypes/claude-connection/src/text.ts
var categoryName = (categories, id) => categories.find((c) => c.id === id)?.name ?? "No category";
function dateWithDays(iso) {
  const n = daysUntil(iso);
  const rel = n === 0 ? "today" : n === 1 ? "tomorrow" : n === -1 ? "yesterday" : n > 0 ? `in ${n} days` : `${-n} days ago`;
  return `${iso.slice(0, 10)} (${rel})`;
}
function itemLine(i, categories) {
  const parts = [`${i.name} [id: ${i.id}]`, `have ${haveText(i)}`];
  if (isBulk(i)) parts.push("bulk (counted in whole packs)");
  parts.push(isStaple(i) ? `Staple, keep ${i.target}` : "not a Staple");
  const stock = stockOf(i);
  if (stock) parts.push(stock === "out" ? "OUT" : "LOW");
  const need = needOf(i);
  if (need > 0) parts.push(`${need} on the shopping list`);
  const dates = i.inStock > 0 ? normalise(i).useBy ?? [] : [];
  if (i.noExpiry) {
    parts.push("doesn't expire");
  } else if (dates.length > 1 && dates.some(Boolean)) {
    parts.push(`use-by dates: ${dates.map((x, n) => `${n + 1}) ${x ? dateWithDays(x) : "undated"}`).join(", ")}`);
  } else {
    const d = soonest(i);
    if (d) parts.push(`use by ${dateWithDays(d)}`);
  }
  if (i.packSize) parts.push(`pack size ${i.packSize.amount} ${i.packSize.measure}`);
  const opened = (i.openedAt ?? []).filter((x) => !!x);
  if (opened.length) parts.push(`opened ${opened.join(", ")}`);
  if (i.location) parts.push(locationLabel(i.location).toLowerCase());
  parts.push(categoryName(categories, i.categoryId));
  if (i.otherNames?.length) parts.push(`also called ${i.otherNames.join(", ")}`);
  if (i.brand) parts.push(`brand: ${i.brand}`);
  if (i.notes) parts.push(`notes: ${i.notes}`);
  return parts.join(" \xB7 ");
}
function recipeLine(r, items) {
  const info = recipeInfo(r, items);
  const parts = [`${r.name} [id: ${r.id}]`, minutesText(r.minutes), `serves ${r.serves}`];
  parts.push(info.canCook ? "can cook now" : `short of ${info.short.length}: ${shortNames(info, 6)}`);
  if (info.usesUp) parts.push(`uses up ${info.usesUp.item.name.toLowerCase()} (use by ${dateWithDays(info.usesUp.date)})`);
  if (r.wantToCook) parts.push("want to cook");
  if (r.meal) parts.push(r.meal);
  if (r.tags?.length) parts.push(`tags: ${r.tags.join(", ")}`);
  return parts.join(" \xB7 ");
}
var statusText = {
  have: "have it",
  some: "have an open pack (may not be enough)",
  listed: "short, already on the shopping list",
  short: "short, not on the list",
  little: "short: the packs you have hold less than it needs",
  unlinked: "not linked to a pantry item"
};
function ingredientLine(row) {
  const linked = row.item ? ` \u2192 ${row.item.name} [id: ${row.item.id}], have ${haveText(row.item)}` : "";
  const missing = row.missing > 1 ? ` (${row.missing} short)` : "";
  return `${row.text}${linked} \xB7 ${statusText[row.status]}${missing}`;
}

// prototypes/claude-connection/src/tools.ts
var ToolError = class extends Error {
};
var uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
var slug = (name) => name.toLowerCase().replace(/&/g, " and ").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
function freshId(base, taken) {
  if (!taken(base)) return base;
  let n = 2;
  while (taken(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
var str = (v) => typeof v === "string" && v.trim() ? v.trim() : void 0;
var num = (v) => typeof v === "number" && Number.isFinite(v) ? v : void 0;
var strs = (v) => Array.isArray(v) ? v.map(str).filter((s) => !!s) : void 0;
function needConfirmed(args, what) {
  if (args.confirmed === true) return;
  throw new ToolError(
    `Not done: ${what} is an edit or a delete, so the user has to agree first. Tell them exactly what will change, ask, and call this again with confirmed: true only after they say yes in this chat.`
  );
}
async function commit(ctx, change) {
  const { data, backend } = ctx;
  const at = ctx.now().toISOString();
  const items = (change.items ?? []).map((i) => normalise({ ...i, editedAt: at }));
  const undoItems = {};
  for (const id of [...items.map((i) => i.id), ...change.deleteItems ?? []]) undoItems[id] = data.items[id] ?? null;
  const undoRecipes = {};
  const byId = (id) => data.recipes.find((r) => r.id === id) ?? null;
  for (const r of [...change.recipes ?? [], ...change.undoRecipes ?? []]) undoRecipes[r.id] = byId(r.id);
  for (const id of change.deleteRecipes ?? []) undoRecipes[id] = byId(id);
  const categories = new Set(data.categories.map((c) => c.id));
  const known = /* @__PURE__ */ new Set([...Object.keys(data.items), ...items.map((i) => i.id)]);
  for (const id of change.deleteItems ?? []) known.delete(id);
  await backend.saveItems(items, categories);
  await backend.saveRecipes(change.recipes ?? [], data.recipeRows, known);
  await backend.deleteRecipes(change.deleteRecipes ?? []);
  await backend.deleteItems(change.deleteItems ?? []);
  const row = {
    id: uid("h"),
    at,
    who: "claude",
    title: change.title,
    detail: change.detail ?? null,
    item_ids: change.itemIds ?? items.map((i) => i.id),
    recipe_id: change.recipeId ?? null,
    undo: { items: undoItems, recipes: undoRecipes },
    undone: false,
    key: null
  };
  await backend.addHistory(row);
  for (const i of items) data.items[i.id] = i;
  for (const id of change.deleteItems ?? []) delete data.items[id];
  for (const r of change.recipes ?? []) {
    const n = data.recipes.findIndex((x) => x.id === r.id);
    if (n >= 0) data.recipes[n] = r;
    else data.recipes.push(r);
  }
  data.recipes = data.recipes.filter((r) => !(change.deleteRecipes ?? []).includes(r.id));
}
async function commitStores(ctx, change) {
  const { data, backend } = ctx;
  const at = ctx.now().toISOString();
  const removed = new Set(change.remove ?? []);
  const next = [...data.stores.filter((x) => !removed.has(x.id))];
  for (const x of change.save ?? []) {
    const n = next.findIndex((y) => y.id === x.id);
    if (n >= 0) next[n] = x;
    else next.push(x);
  }
  const order = new Map(next.map((x, n) => [x.id, n]));
  await backend.saveStores(change.save ?? [], (id) => order.get(id) ?? 0, new Set(data.categories.map((c) => c.id)));
  await backend.deleteStores(change.remove ?? []);
  await backend.addHistory({
    id: uid("h"),
    at,
    who: "claude",
    title: change.title,
    detail: change.detail ?? null,
    item_ids: [],
    recipe_id: null,
    undo: null,
    undone: false,
    key: null
  });
  data.stores = next;
}
function aisleChanges(data, v) {
  if (v === void 0) return {};
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new ToolError('aisles is an object of category name \u2192 aisle number, for example { "Frozen": 12 }. Use null to clear a number.');
  const out = {};
  for (const [ref, n] of Object.entries(v)) {
    const id = findCategory(data, ref);
    if (n === null) out[id] = null;
    else if (typeof n === "number" && Number.isInteger(n) && n > 0) out[id] = n;
    else throw new ToolError(`The aisle number for ${ref} has to be a whole number above 0, or null to clear it.`);
  }
  return out;
}
var aislesSchema = {
  type: "object",
  description: `Aisle number per category, by category name or id: { "Frozen": 12, "Baking": 7 }. null clears a number (the store doesn't sell it). Categories left out stay as they are. Claude can't add or rename categories.`,
  additionalProperties: { type: ["number", "null"] }
};
var aisleText = (x, cats) => aisleOrder(x, cats).filter((c) => x.aisles[c.id] != null).map((c) => `${x.aisles[c.id]} ${c.name}`).join(", ") || "no aisles set";
var pantryItems = (items) => Object.values(items).filter((i) => !i.oneOff);
function nearItems(items, q, max = 5) {
  const ql = q.toLowerCase().trim();
  const scored = pantryItems(items).map((i) => {
    const names = namesOf(i).map((n) => n.toLowerCase());
    const contains = names.some((n) => n.includes(ql) || n.length > 2 && ql.includes(n));
    const d = Math.min(...names.map((n) => distance(n, ql)));
    return { i, score: contains ? 0 : d };
  }).filter((x) => x.score <= Math.max(2, Math.floor(ql.length / 4))).sort((a, b) => a.score - b.score || a.i.name.localeCompare(b.i.name));
  return scored.slice(0, max).map((x) => x.i);
}
var escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function nameInLine(i, line) {
  const hits = namesOf(i).filter((n) => new RegExp(`\\b${escapeRe(n.toLowerCase().trim().replace(/(es|s)$/, ""))}(es|s)?\\b`).test(line));
  return Math.max(0, ...hits.map((n) => n.length));
}
var idList = (items) => items.map((i) => `${i.name} [id: ${i.id}]`).join(", ");
function findItem(items, ref) {
  const q = str(ref);
  if (!q) throw new ToolError("Say which item: its id or its name.");
  if (items[q]) return items[q];
  const exact = Object.values(items).filter((i) => matchesName(i, q));
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) throw new ToolError(`"${q}" could be more than one item: ${idList(exact)}. Ask the user which, then use its id.`);
  const near = nearItems(items, q);
  if (near.length) throw new ToolError(`No item is called "${q}". Close matches: ${idList(near)}. If one of these is it, use its id; if not, ask the user.`);
  throw new ToolError(`No item is called "${q}", and nothing is close. Use search_pantry, or add it with add_items if the user wants it in the pantry.`);
}
function findRecipe(recipes, ref) {
  const q = str(ref);
  if (!q) throw new ToolError("Say which recipe: its id or its name.");
  const byId = recipes.find((r) => r.id === q);
  if (byId) return byId;
  const exact = recipes.filter((r) => r.name.toLowerCase() === q.toLowerCase());
  if (exact.length === 1) return exact[0];
  const near = recipes.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()) || distance(r.name.toLowerCase(), q.toLowerCase()) <= 3);
  if (near.length === 1) return near[0];
  if (near.length) throw new ToolError(`"${q}" could be: ${near.map((r) => `${r.name} [id: ${r.id}]`).join(", ")}. Use the id.`);
  throw new ToolError(`No recipe is called "${q}". Use find_recipes to see what's saved.`);
}
function findCategory(data, ref) {
  const q = str(ref);
  if (!q) return "";
  const c = data.categories.find((x) => x.id === q || x.name.toLowerCase() === q.toLowerCase());
  if (c) return c.id;
  throw new ToolError(
    `There's no category "${q}". Use one that exists (${data.categories.map((x) => x.name).join(", ")}). Claude can't add categories yet.`
  );
}
function findStore(data, ref) {
  const q = str(ref);
  if (!q) return void 0;
  const s = data.stores.find((x) => x.id === q || x.name.toLowerCase() === q.toLowerCase()) ?? data.stores.find((x) => x.name.toLowerCase().includes(q.toLowerCase()));
  if (!s) throw new ToolError(`No store matches "${q}". Stores: ${data.stores.map((x) => x.name).join(", ")}.`);
  return s;
}
var LOCATIONS = ["fridge", "freezer", "cupboard", "household"];
function location(v) {
  const s = str(v)?.toLowerCase();
  if (!s) return void 0;
  if (!LOCATIONS.includes(s)) throw new ToolError(`Location is one of: ${LOCATIONS.join(", ")}.`);
  return s;
}
function isoDate(v) {
  const s = str(v);
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new ToolError(`Dates are YYYY-MM-DD, not "${String(v)}".`);
  return s;
}
var byDate = (a, b) => a === b ? 0 : a === null ? 1 : b === null ? -1 : a < b ? -1 : 1;
var stockDetail = (i) => `${cap(haveText(i))} left${needOf(i) > 0 && isStaple(i) ? " \xB7 below minimum, on the list" : ""}`;
var confirmed = { type: "boolean", description: "true only after the user has agreed to this change in the chat." };
var itemRef = { type: "string", description: "The item's id (from search_pantry), or its exact name." };
var recipeRef = { type: "string", description: "The recipe's id (from find_recipes), or its name." };
var newItemProps = {
  name: { type: "string", description: 'As the user would say it, capitalised: "Chopped tomatoes".' },
  type: { type: "string", enum: ["counted", "bulk"], description: "counted: tracked by number (eggs, tins, onions). bulk: tracked in whole packs, which can be open (flour, oil, rice, spices)." },
  unit: { type: "string", description: 'Optional, singular: "tin", "bag", "bottle". Leave out for plain counts (3 onions).' },
  category: { type: "string", description: "An existing category's name or id (get_categories_and_stores). Leave out if unsure." },
  location: { type: "string", enum: LOCATIONS }
};
var ingredientSchema = {
  type: "object",
  properties: {
    text: { type: "string", description: `The recipe's own wording: "400 g tin chopped tomatoes".` },
    item: { type: "string", description: "The pantry item's id, when it's a clear match." },
    need: { type: "number", description: "Counted items: how many the recipe uses at its servings. Default 1." },
    buy: { type: "number", description: "How many to put on the list when short. Default 1." },
    partial: { type: "boolean", description: "Uses part of a unit (a clove of garlic, some milk): any stock will do." }
  },
  required: ["text"]
};
var recipeFields = {
  serves: { type: "number" },
  minutes: { type: "number", description: "Total time. Leave out if the recipe doesn't say." },
  prep: { type: "number" },
  cook: { type: "number" },
  method: { type: "array", items: { type: "string" }, description: "One step per entry, without numbers." },
  tags: { type: "array", items: { type: "string" } },
  meal: { type: "string", enum: ["Breakfast", "Lunch", "Dinner", "Baking"] },
  source: { type: "string", description: "Where it came from: a link, a book, a person." },
  notes: { type: "string" }
};
function buildIngredients(data, input, _now) {
  if (!Array.isArray(input) || !input.length) throw new ToolError("A recipe needs its ingredients.");
  const created = [];
  const linked = [];
  const unlinked = [];
  const all = () => ({ ...data.items, ...Object.fromEntries(created.map((i) => [i.id, i])) });
  const ingredients = input.map((raw) => {
    const g = raw ?? {};
    const text = str(g.text);
    if (!text) throw new ToolError("Every ingredient needs its text.");
    let itemId = "";
    if (str(g.item)) {
      itemId = findItem(all(), g.item).id;
      linked.push(`${text} \u2192 ${all()[itemId].name}`);
    } else unlinked.push(text);
    return { text, itemId, need: Math.max(1, num(g.need) ?? 1), buy: Math.max(1, num(g.buy) ?? 1), partial: g.partial === true || void 0 };
  });
  return { ingredients, created, linked, unlinked };
}
function newItem(data, n, items, now) {
  const name = cap(str(n.name));
  const type = n.type === "bulk" ? "bulk" : "counted";
  const minimum = Math.max(0, num(n.minimum) ?? 0);
  const stock = Math.max(0, num(n.stock) ?? 0);
  const useBy = (strs(n.use_by) ?? []).map(isoDate).sort();
  return normalise({
    id: freshId(slug(name), (id) => !!items[id]),
    name,
    type,
    target: minimum,
    inStock: stock,
    open: type === "bulk" ? 0 : void 0,
    unit: unitPair(str(n.unit) ?? null),
    categoryId: findCategory(data, n.category),
    where: [],
    location: location(n.location),
    otherNames: strs(n.other_names)?.length ? strs(n.other_names) : void 0,
    notes: str(n.notes),
    useBy: useBy.length ? useBy : void 0,
    noExpiry: n.no_expiry === true || n.no_expiry === void 0 && location(n.location) === "household" || void 0,
    editedAt: now.toISOString()
  });
}
function recipeFrom(args, base) {
  const prep = num(args.prep) ?? base.prep;
  const cook = num(args.cook) ?? base.cook;
  const meal = str(args.meal);
  if (meal && !["Breakfast", "Lunch", "Dinner", "Baking"].includes(meal)) throw new ToolError("meal is Breakfast, Lunch, Dinner or Baking.");
  return {
    minutes: num(args.minutes) ?? base.minutes ?? (prep ?? 0) + (cook ?? 0),
    serves: Math.max(1, num(args.serves) ?? base.serves ?? 2),
    wantToCook: typeof args.want_to_cook === "boolean" ? args.want_to_cook : base.wantToCook ?? false,
    soon: base.soon,
    method: strs(args.method) ?? base.method ?? [],
    prep,
    cook,
    tags: strs(args.tags) ?? base.tags ?? [],
    meal: meal ?? base.meal,
    source: str(args.source) ?? base.source,
    notes: str(args.notes) ?? base.notes,
    lastCooked: base.lastCooked ?? null,
    addedBy: base.addedBy ?? "claude",
    addedAt: base.addedAt
  };
}
function ingredientsReport(r) {
  const lines = [];
  if (r.linked.length) lines.push(`Linked (${r.linked.length}): ${r.linked.join("; ")}`);
  if (r.created.length) lines.push(`New pantry items, minimum 0 (${r.created.length}): ${r.created.map((i) => i.name).join(", ")}`);
  if (r.unlinked.length) lines.push(`Not linked to the pantry (${r.unlinked.length}): ${r.unlinked.join("; ")}`);
  return lines.join("\n");
}
var removeRecipeEntries = (i, recipeName) => i.entries?.some((e) => e.source.kind === "recipe" && e.source.recipe === recipeName) ? { ...i, entries: i.entries.filter((e) => !(e.source.kind === "recipe" && e.source.recipe === recipeName)) } : null;
var reasonText = (r, i) => r.kind === "staple" ? `Staple, have ${haveText(i)}, keep ${i.target}` : r.kind === "recipe" ? `for ${r.recipe}` : r.kind === "claude" ? "added by Claude" : "added by you";
var tools = [
  // ----- read -----
  {
    name: "search_pantry",
    title: "Search the pantry",
    description: "Look up pantry items and their stock. Each line gives the id, what's in stock, whether it's a Staple (an item with a minimum to keep), whether it's low or out, how many are on the shopping list, the soonest use-by date, location and category. With no query and no filter it lists everything.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Part of a name, another name, or a category name." },
        filter: { type: "string", enum: ["all", "staples", "low_or_out", "out", "use_soon", "not_staples"], description: "low_or_out: Out, or Low (half the minimum or fewer). use_soon: has a use-by date in the next 7 days." }
      }
    },
    annotations: { readOnlyHint: true },
    async run(args, { data }) {
      const q = str(args.query)?.toLowerCase();
      const filter = str(args.filter) ?? "all";
      let list = pantryItems(data.items);
      if (q) {
        list = list.filter((i) => namesOf(i).some((n) => n.toLowerCase().includes(q)) || categoryName(data.categories, i.categoryId).toLowerCase().includes(q));
      }
      list = list.filter((i) => {
        if (filter === "staples") return isStaple(i);
        if (filter === "not_staples") return !isStaple(i);
        if (filter === "out") return isStaple(i) && i.inStock <= 0;
        if (filter === "low_or_out") return stockOf(i) !== null;
        if (filter === "use_soon") {
          const d = (i.useBy ?? []).find((x) => !!x);
          return i.inStock > 0 && !!d && (new Date(d).getTime() - Date.now()) / 864e5 <= 7;
        }
        return true;
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      if (!list.length) {
        const near = q ? nearItems(data.items, q) : [];
        return near.length ? `Nothing matches. Did you mean: ${idList(near)}?` : "Nothing matches.";
      }
      return `${plural(list.length, "item")}:
${list.map((i) => itemLine(i, data.categories)).join("\n")}`;
    }
  },
  {
    name: "get_shopping_list",
    title: "Get the shopping list",
    description: "What's on the shopping list and why: Staples below their minimum, things for recipes the user wants to cook, and things added by hand or by Claude. Give a store to get it in that store's aisle order, with anything the store doesn't sell listed apart.",
    inputSchema: { type: "object", properties: { store: { type: "string", description: "A store's name or id (get_categories_and_stores)." } } },
    annotations: { readOnlyHint: true },
    async run(args, { data }) {
      const rows = listRows(data.items);
      if (!rows.length) return "The shopping list is empty.";
      const line = (r) => `- ${r.item.oneOff ? r.item.name : amountOf(r.item, r.qty)} [id: ${r.item.id}] \xB7 ${r.reasons.map((x) => reasonText(x, r.item)).join("; ")}`;
      const store = findStore(data, args.store);
      const out = [];
      if (store) {
        out.push(`${store.name}, in aisle order:`);
        for (const c of aisleOrder(store, data.categories)) {
          const here = rows.filter((r) => r.item.categoryId === c.id && soldAt(r.item, store));
          if (here.length) out.push(`Aisle ${store.aisles[c.id] ?? "?"} \xB7 ${c.name}`, ...here.map(line));
        }
        const elsewhere = rows.filter((r) => !soldAt(r.item, store));
        if (elsewhere.length) out.push(`Not sold at ${store.name} (or no aisle set):`, ...elsewhere.map(line));
      } else {
        for (const c of [...data.categories, { id: "", name: "No category" }]) {
          const here = rows.filter((r) => (r.item.categoryId || "") === c.id || c.id === "" && !data.categories.some((x) => x.id === r.item.categoryId));
          if (here.length) out.push(`${c.name}:`, ...here.map(line));
        }
      }
      return `${plural(rows.length, "thing")} on the list.
${out.join("\n")}`;
    }
  },
  {
    name: "find_recipes",
    title: "Find recipes",
    description: `Saved recipes, checked against what's in stock, with recipes that use up food going off soonest first. Each line says whether it can be cooked now or what it's short of. Use this for "what can I cook tonight?".`,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Part of a recipe name or a tag." },
        filter: { type: "string", enum: ["all", "can_cook", "nearly", "want_to_cook"], description: "nearly: short of 1 or 2 things." },
        uses: { type: "string", description: "Only recipes that use this pantry item (id or name)." }
      }
    },
    annotations: { readOnlyHint: true },
    async run(args, { data }) {
      const q = str(args.query)?.toLowerCase();
      const uses = str(args.uses) ? findItem(data.items, args.uses) : void 0;
      const filter = str(args.filter) ?? "all";
      const list = data.recipes.filter((r) => !q || r.name.toLowerCase().includes(q) || (r.tags ?? []).some((t) => t.toLowerCase().includes(q)) || r.meal?.toLowerCase() === q).filter((r) => !uses || r.ingredients.some((g) => g.itemId === uses.id)).map((recipe) => ({ recipe, info: recipeInfo(recipe, data.items) })).filter(({ recipe, info }) => filter === "can_cook" ? info.canCook : filter === "nearly" ? !info.canCook && info.short.length <= 2 : filter === "want_to_cook" ? recipe.wantToCook : true).sort(byUseFirst);
      if (!list.length) return "No recipes match.";
      return `${plural(list.length, "recipe")}:
${list.map(({ recipe }) => recipeLine(recipe, data.items)).join("\n")}`;
    }
  },
  {
    name: "get_recipe",
    title: "Get a recipe",
    description: "One recipe in full: each ingredient against stock, the method and notes. Give serves to scale it.",
    inputSchema: { type: "object", properties: { recipe: recipeRef, serves: { type: "number" } }, required: ["recipe"] },
    annotations: { readOnlyHint: true },
    async run(args, { data }) {
      const r = findRecipe(data.recipes, args.recipe);
      const serves = Math.max(1, num(args.serves) ?? r.serves);
      const info = recipeInfo(r, data.items, serves / r.serves);
      const out = [
        `${r.name} [id: ${r.id}] \xB7 serves ${serves}${serves !== r.serves ? ` (scaled from ${r.serves})` : ""} \xB7 ${r.minutes > 0 ? `${r.minutes} min` : "no time given"}`,
        info.canCook ? "Can cook now." : `Short of ${info.short.length}.`,
        "Ingredients:",
        ...info.rows.map((row) => `- ${ingredientLine(row)}`)
      ];
      if (r.method.length) out.push("Method:", ...r.method.map((m, n) => `${n + 1}. ${m}`));
      if (r.notes) out.push(`Notes: ${r.notes}`);
      if (r.source) out.push(`Source: ${r.source}`);
      if (r.tags?.length || r.meal) out.push(`Tags: ${[...r.tags ?? [], ...r.meal ? [r.meal] : []].join(", ")}`);
      out.push(r.lastCooked ? `Last cooked ${dateWithDays(r.lastCooked)}.` : "Not cooked yet.", r.wantToCook ? "On the want-to-cook list." : "");
      return out.filter(Boolean).join("\n");
    }
  },
  {
    name: "match_ingredients",
    title: "Match ingredients to the pantry",
    description: `Before saving a recipe: finds the pantry items each ingredient line might mean. A line with one clear match can be linked without asking. A line with several plausible matches ("onion" when there are red and brown onions) needs the user to choose. A line with no match is left unlinked: it isn't created as a pantry item.`,
    inputSchema: { type: "object", properties: { lines: { type: "array", items: { type: "string" } } }, required: ["lines"] },
    annotations: { readOnlyHint: true },
    async run(args, { data }) {
      const lines = strs(args.lines);
      if (!lines?.length) throw new ToolError("Give the ingredient lines.");
      return lines.map((line) => {
        const l = line.toLowerCase();
        const found = pantryItems(data.items).map((i) => ({ i, length: nameInLine(i, l) })).filter((x) => x.length > 0);
        const longest = Math.max(0, ...found.map((x) => x.length));
        const best = found.filter((x) => x.length === longest).map((x) => x.i);
        if (best.length === 1) return `"${line}": clear match \u2192 ${best[0].name} [id: ${best[0].id}]`;
        if (best.length > 1) return `"${line}": unsure, could be ${idList(best)}. Ask the user.`;
        const core = l.replace(/[\d½¼¾⅓⅔/.,()-]+/g, " ").replace(/\b(g|kg|ml|l|tbsp|tsp|cups?|tins?|cans?|jars?|cloves?|bunch(es)?|handfuls?|pinch(es)?|of|x|large|small|medium|fresh|chopped|sliced|diced|finely|roughly|a|an|some)\b/g, " ").replace(/\s+/g, " ").trim();
        const near = core ? nearItems(data.items, core, 4) : [];
        if (near.length > 1) return `"${line}": unsure, could be ${idList(near)}. Ask the user, or leave it unlinked if it's none of these.`;
        if (near.length === 1) return `"${line}": possible match \u2192 ${idList(near)}. Check with the user, or leave it unlinked.`;
        return `"${line}": nothing similar. Leave it unlinked (not in the pantry yet).`;
      }).join("\n");
    }
  },
  {
    name: "get_history",
    title: "Get History",
    description: "Recent changes to the pantry, newest first, and who made them: you (the pantry app), phone (the shopping app) or claude.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "Default 20, at most 100." }, who: { type: "string", enum: ["you", "phone", "claude"] } }
    },
    annotations: { readOnlyHint: true },
    async run(args, { backend }) {
      const limit = Math.min(100, Math.max(1, num(args.limit) ?? 20));
      const who = str(args.who);
      const rows = (await backend.history(who ? 300 : limit)).filter((h) => !who || h.who === who).slice(0, limit);
      if (!rows.length) return "No History yet.";
      return rows.map((h) => `${h.at.slice(0, 16).replace("T", " ")} \xB7 ${h.who} \xB7 ${h.title}${h.detail ? ` \u2014 ${h.detail}` : ""}${h.undone ? " (undone)" : ""}`).join("\n");
    }
  },
  {
    name: "get_categories_and_stores",
    title: "Get categories and stores",
    description: "The categories (shop sections) items can go in, and the stores with their aisle numbers.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    async run(_args, { data }) {
      const stores = data.stores.map((s) => {
        const numbered = aisleOrder(s, data.categories).filter((c) => s.aisles[c.id] != null);
        return `- ${s.name} [id: ${s.id}]${s.kind ? ` \xB7 ${s.kind}` : ""}: ${numbered.map((c) => `${s.aisles[c.id]} ${c.name}`).join(", ") || "no aisles set"}`;
      });
      return [`Categories: ${data.categories.map((c) => `${c.name} [id: ${c.id}]`).join(", ")}`, "Stores:", ...stores].join("\n");
    }
  },
  // ----- add (no asking) -----
  {
    name: "add_items",
    title: "Add pantry items",
    description: "Adds new items to the pantry. A minimum above 0 makes it a Staple, which goes on the shopping list by itself when stock drops below the minimum. Items already in the pantry are skipped (the result says which); use add_stock for those.",
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ...newItemProps,
              minimum: { type: "number", description: "How many to keep. Default 0 (not a Staple)." },
              stock: { type: "number", description: "How many there are now. Bulk: whole packs, including open ones." },
              use_by: { type: "array", items: { type: "string" }, description: "YYYY-MM-DD, one per unit or pack." },
              no_expiry: { type: "boolean", description: "true for things that never go off. Household items default to true." },
              other_names: { type: "array", items: { type: "string" } },
              notes: { type: "string" }
            },
            required: ["name", "type"]
          }
        }
      },
      required: ["items"]
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(args, ctx) {
      const input = Array.isArray(args.items) ? args.items : [];
      if (!input.length) throw new ToolError("Give at least one item.");
      const added = [];
      const skipped = [];
      for (const n of input) {
        const name = str(n.name);
        if (!name) throw new ToolError("Every item needs a name.");
        const all = { ...ctx.data.items, ...Object.fromEntries(added.map((i) => [i.id, i])) };
        const same = Object.values(all).find((i) => !i.oneOff && matchesName(i, name));
        if (same) skipped.push(same);
        else added.push(newItem(ctx.data, n, all, ctx.now()));
      }
      if (added.length) {
        const one = added.length === 1 ? added[0] : null;
        await commit(ctx, {
          items: added,
          title: one ? `Added ${one.name} to the pantry` : `Added ${plural(added.length, "item")} to the pantry`,
          detail: one ? one.target > 0 ? `A Staple \xB7 keep ${one.target}` : "Not a Staple" : added.map((i) => i.name).join(", ")
        });
      }
      const out = added.map((i) => `Added: ${itemLine(ctx.data.items[i.id], ctx.data.categories)}`);
      if (skipped.length) out.push(`Already in the pantry, not added: ${idList(skipped)}`);
      return out.join("\n");
    }
  },
  {
    name: "add_stock",
    title: "Add stock",
    description: "Records that more of an item came in (bought, delivered, found). Anything on the shopping list for it is ticked off by the amount that came in.",
    inputSchema: {
      type: "object",
      properties: {
        item: itemRef,
        amount: { type: "number", description: "How many more. Bulk: whole packs." },
        use_by: { type: "array", items: { type: "string" }, description: "YYYY-MM-DD for the new units, if known." }
      },
      required: ["item", "amount"]
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(args, ctx) {
      const i = findItem(ctx.data.items, args.item);
      const amount = Math.round(num(args.amount) ?? 0);
      if (amount < 1) throw new ToolError("amount is a whole number, 1 or more.");
      const dates = (strs(args.use_by) ?? []).map(isoDate);
      const old = [...i.useBy ?? []].slice(0, i.inStock);
      while (old.length < i.inStock) old.push(null);
      const fresh = Array.from({ length: amount }, (_, n) => dates[n] ?? null);
      const next = { ...withStock(i, i.inStock + amount), useBy: [...old, ...fresh].sort(byDate), entries: settle(i.entries, amount) };
      await commit(ctx, { items: [next], title: `Added ${amountOf(i, amount)}`, detail: stockDetail(normalise(next)), itemIds: [i.id] });
      return `Done. ${itemLine(ctx.data.items[i.id], ctx.data.categories)}`;
    }
  },
  {
    name: "record_used",
    title: "Record what was used",
    description: `Takes used things off stock, when the user says what they've used: "I used the last of the rice", "we had 4 eggs", "I opened a new bag of flour". This isn't an edit, so it doesn't need asking. Counted items: amount is how many were used. Bulk items: amount is how many packs were finished; opened_pack opens one instead.`,
    inputSchema: {
      type: "object",
      properties: {
        item: itemRef,
        amount: { type: "number", description: "Default 1." },
        all: { type: "boolean", description: 'Used all of it ("the last of the rice").' },
        opened_pack: { type: "boolean", description: "Bulk only: opened a pack, nothing finished." }
      },
      required: ["item"]
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(args, ctx) {
      const i = findItem(ctx.data.items, args.item);
      const pack = i.unit?.[0] ?? "pack";
      if (args.opened_pack === true) {
        if (!isBulk(i)) throw new ToolError(`${i.name} is counted, not bulk: use amount instead.`);
        if ((i.open ?? 0) >= i.inStock) throw new ToolError(`Every ${pack} of ${lower(i.name)} is already open (${haveText(i)}). Ask the user whether one was finished or more came in.`);
        const next2 = { ...i, open: (i.open ?? 0) + 1, openedAt: [...i.openedAt ?? [], todayIso()] };
        await commit(ctx, { items: [next2], title: `Opened a ${pack} of ${lower(i.name)}`, detail: stockDetail(normalise(next2)), itemIds: [i.id] });
        return `Done. ${itemLine(ctx.data.items[i.id], ctx.data.categories)}`;
      }
      if (i.inStock <= 0) throw new ToolError(`There's no ${lower(i.name)} in stock already, so nothing was taken off. If the stock is wrong, ask the user and use update_item.`);
      const used = args.all === true ? i.inStock : Math.round(num(args.amount) ?? 1);
      if (used < 1) throw new ToolError("amount is a whole number, 1 or more.");
      const taken = Math.min(used, i.inStock);
      const next = { ...withStock(i, i.inStock - taken), uses: (i.uses ?? 0) + 1 };
      const title = args.all === true ? `Used all the ${lower(i.name)}` : isBulk(i) ? taken === 1 ? `Finished a ${pack} of ${lower(i.name)}` : `Finished ${amountOf(i, taken)}` : next.inStock === 0 ? `Used the last ${lower(i.name)}` : `Used ${amountOf(i, taken)}`;
      await commit(ctx, { items: [next], title, detail: stockDetail(normalise(next)), itemIds: [i.id] });
      const note = used > taken ? ` Only ${taken} were in stock, so it's now at 0.` : "";
      return `Done.${note} ${itemLine(ctx.data.items[i.id], ctx.data.categories)}`;
    }
  },
  {
    name: "add_to_shopping_list",
    title: "Add to the shopping list",
    description: "Puts things on the shopping list, marked as added by Claude. Use a pantry item's id where there is one. Something that isn't a pantry item (birthday candles) can go on as a one-off: set one_off, and stock isn't tracked for it.",
    inputSchema: {
      type: "object",
      properties: {
        entries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item: { type: "string", description: "A pantry item's id or exact name, or a one-off's name." },
              qty: { type: "number", description: "How many to buy. Default 1." },
              one_off: { type: "boolean", description: "Not a pantry item." }
            },
            required: ["item"]
          }
        }
      },
      required: ["entries"]
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(args, ctx) {
      const input = Array.isArray(args.entries) ? args.entries : [];
      if (!input.length) throw new ToolError("Give at least one entry.");
      const at = ctx.now().toISOString();
      const changed = {};
      const names = [];
      for (const e of input) {
        const qty = Math.max(1, Math.round(num(e.qty) ?? 1));
        if (e.one_off === true) {
          const name = cap(str(e.item) ?? "");
          if (!name) throw new ToolError("A one-off needs a name.");
          const id = freshId(`oneoff-${slug(name)}`, (x) => !!ctx.data.items[x] || !!changed[x]);
          changed[id] = { id, name, type: "counted", target: 0, inStock: 0, categoryId: "", where: [], oneOff: true, entries: [{ source: { kind: "claude" }, qty, at }] };
          names.push(`${name} (one-off)`);
          continue;
        }
        const i = changed[findItem(ctx.data.items, e.item).id] ?? findItem(ctx.data.items, e.item);
        changed[i.id] = { ...i, entries: [...i.entries ?? [], { source: { kind: "claude" }, qty, at }] };
        names.push(amountOf(i, qty));
      }
      const items = Object.values(changed);
      await commit(ctx, {
        items,
        title: names.length === 1 ? `Added ${names[0]} to the shopping list` : `Added ${plural(names.length, "thing")} to the shopping list`,
        detail: names.length === 1 ? "Added by Claude" : names.join(", ")
      });
      return `On the list: ${names.join(", ")}. Each now needs: ${items.map((i) => `${ctx.data.items[i.id].name} ${needOf(ctx.data.items[i.id])}`).join(", ")}.`;
    }
  },
  {
    name: "save_recipe",
    title: "Save a recipe",
    description: "Saves a new recipe. First run match_ingredients on the ingredient lines. Link clear matches with item; for lines with nothing similar, leave item out: the ingredient stays on the recipe as not in the pantry yet, and no pantry item is made. It's added to the pantry when the user puts it on the shopping list. If a line could mean more than one item, ask the user before saving. Afterwards, tell the user what was linked, which ingredients aren't in the pantry yet, and what you asked about.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        ...recipeFields,
        want_to_cook: { type: "boolean" },
        ingredients: { type: "array", items: ingredientSchema }
      },
      required: ["name", "serves", "ingredients", "method"]
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(args, ctx) {
      const name = str(args.name);
      if (!name) throw new ToolError("The recipe needs a name.");
      const same = ctx.data.recipes.find((r) => r.name.toLowerCase() === name.toLowerCase());
      if (same) throw new ToolError(`There's already a recipe called ${same.name} [id: ${same.id}]. Ask the user whether to change that one (update_recipe) or save this under another name.`);
      const now = ctx.now();
      const built = buildIngredients(ctx.data, args.ingredients, now);
      const recipe = {
        id: freshId(slug(name), (id) => ctx.data.recipes.some((r) => r.id === id) || !!ctx.data.recipeRows[id]),
        name,
        ingredients: built.ingredients,
        ...recipeFrom(args, { addedBy: "claude", addedAt: now.toISOString() }),
        editedAt: now.toISOString()
      };
      const detail = [
        `Linked ${plural(built.linked.length, "ingredient")}`,
        built.created.length ? `created ${nameListShort(built.created.map((i) => lower(i.name)))}` : "",
        built.unlinked.length ? `${built.unlinked.length} not linked` : ""
      ].filter(Boolean).join(", ");
      await commit(ctx, { items: built.created, recipes: [recipe], title: `Saved ${name}`, detail, itemIds: built.created.map((i) => i.id), recipeId: recipe.id });
      return `Saved ${name} [id: ${recipe.id}].
${ingredientsReport(built)}
${recipeLine(recipe, ctx.data.items)}`;
    }
  },
  {
    name: "want_to_cook",
    title: "Want to cook a recipe",
    description: `Marks a recipe as one the user wants to cook, and puts whatever it's short of on the shopping list, marked with the recipe's name. For "add what I need for this recipe to the list". Ingredients that aren't linked to a pantry item can't go on the list; the result names them.`,
    inputSchema: { type: "object", properties: { recipe: recipeRef, serves: { type: "number" } }, required: ["recipe"] },
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(args, ctx) {
      const r = findRecipe(ctx.data.recipes, args.recipe);
      const info = recipeInfo(r, ctx.data.items, Math.max(1, num(args.serves) ?? r.serves) / r.serves);
      const at = ctx.now().toISOString();
      const changed = [];
      for (const row of info.rows) {
        if (!row.item || row.status !== "short" && row.status !== "little") continue;
        const qty = isBulk(row.item) || row.ing.partial ? Math.max(1, row.ing.buy) : Math.max(row.ing.buy, row.missing);
        changed.push({ ...row.item, entries: [...row.item.entries ?? [], { source: { kind: "recipe", recipe: r.name }, qty, at }] });
      }
      const listed = info.rows.filter((x) => x.status === "listed").map((x) => x.item.name);
      const unlinked = info.rows.filter((x) => x.status === "unlinked").map((x) => x.text);
      await commit(ctx, {
        items: changed,
        recipes: [{ ...r, wantToCook: true }],
        title: `Want to cook ${r.name}`,
        detail: changed.length ? `Added ${plural(changed.length, "thing")} to the shopping list` : "Nothing needed buying",
        itemIds: changed.map((i) => i.id),
        recipeId: r.id
      });
      const out = [changed.length ? `Added to the list: ${changed.map((i) => i.name).join(", ")}.` : "Nothing new needed buying."];
      if (listed.length) out.push(`Already on the list: ${listed.join(", ")}.`);
      if (unlinked.length) out.push(`Not linked to the pantry, so not added: ${unlinked.join("; ")}.`);
      return out.join(" ");
    }
  },
  {
    name: "cooked_recipe",
    title: "Record a cooked recipe",
    description: "Records that the user cooked a recipe: takes what it used off stock, clears its entries from the shopping list and sets the date it was last cooked. By default, counted ingredients come off by what the recipe needs; ingredients that use part of something (a clove of garlic, some flour) only change stock if the user finished one, so ask and list those in finished. Use used to correct amounts.",
    inputSchema: {
      type: "object",
      properties: {
        recipe: recipeRef,
        serves: { type: "number" },
        used: { type: "array", items: { type: "object", properties: { item: itemRef, amount: { type: "number" } }, required: ["item", "amount"] }, description: "Counted items, how many were used, where it differs from the recipe." },
        finished: { type: "array", items: itemRef, description: "Items where a pack or unit was finished (the last of the garlic, a bag of flour)." }
      },
      required: ["recipe"]
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(args, ctx) {
      const r = findRecipe(ctx.data.recipes, args.recipe);
      const info = recipeInfo(r, ctx.data.items, Math.max(1, num(args.serves) ?? r.serves) / r.serves);
      const counts = {};
      for (const row of info.rows) if (row.item && !isBulk(row.item) && !row.ing.partial && row.item.inStock > 0) counts[row.item.id] = (counts[row.item.id] ?? 0) + row.need;
      for (const u of Array.isArray(args.used) ? args.used : []) counts[findItem(ctx.data.items, u.item).id] = Math.max(0, Math.round(num(u.amount) ?? 0));
      const finished = (Array.isArray(args.finished) ? args.finished : []).map((f) => findItem(ctx.data.items, f).id);
      const next = {};
      const get = (id) => next[id] ?? ctx.data.items[id];
      const parts = [];
      for (const [id, n] of Object.entries(counts)) {
        if (n <= 0) continue;
        const i = get(id);
        next[id] = { ...withStock(i, i.inStock - n), uses: (i.uses ?? 0) + 1 };
        parts.push(`${i.name} \u2212${Math.min(n, i.inStock)}`);
      }
      for (const id of finished) {
        const i = get(id);
        if (i.inStock <= 0) continue;
        next[id] = { ...withStock(i, i.inStock - 1), uses: (i.uses ?? 0) + 1 };
        parts.push(`${i.name} finished`);
      }
      for (const i of Object.values(ctx.data.items)) {
        const cleared = removeRecipeEntries(get(i.id), r.name);
        if (cleared) next[i.id] = cleared;
      }
      await commit(ctx, {
        items: Object.values(next),
        recipes: [{ ...r, lastCooked: ctx.now().toISOString(), wantToCook: false }],
        title: `Cooked ${r.name}`,
        detail: parts.join(", ") || "No stock changes",
        itemIds: [...Object.keys(counts), ...finished],
        recipeId: r.id
      });
      return `Recorded ${r.name} as cooked. ${parts.length ? `Stock: ${parts.join(", ")}.` : "No stock changed."}`;
    }
  },
  // ----- edit and delete (ask first) -----
  {
    name: "update_item",
    title: "Change a pantry item",
    description: "Changes any property of an item: name, type, minimum, stock, open packs, unit, pack size, category, location, use-by (best before) dates, when packs were opened, other names, brand, price and notes. Set a property to null to clear it. Use-by dates are numbered soonest first, undated last, as search_pantry lists them; change one with use_by_one, or replace them all with use_by. An edit: ask the user first, then call with confirmed: true. To record something used, use record_used instead (no asking needed).",
    inputSchema: {
      type: "object",
      properties: {
        item: itemRef,
        changes: {
          type: "object",
          properties: {
            name: { type: "string" },
            type: { type: "string", enum: ["counted", "bulk"] },
            minimum: { type: "number" },
            stock: { type: "number", description: "Bulk: whole packs, including open ones." },
            open: { type: "number", description: "Bulk: how many packs are open." },
            unit: { type: ["string", "null"], description: 'Singular: "tin", "bag". null for plain counts.' },
            pack_size: {
              anyOf: [{ type: "object", properties: { amount: { type: "number" }, measure: { type: "string", enum: ["g", "ml"] } }, required: ["amount", "measure"] }, { type: "null" }],
              description: 'Bulk only: what one pack holds, e.g. { amount: 1000, measure: "g" }. Used to check a recipe has enough.'
            },
            category: { type: ["string", "null"] },
            location: { type: ["string", "null"], enum: [...LOCATIONS, null] },
            use_by: { type: "array", items: { type: "string" }, description: "Replaces every date, one per unit or pack. YYYY-MM-DD. [] clears them." },
            open_counts: { type: "boolean", description: "Bulk only: true if an open pack counts towards the minimum like a full one. false (the default) counts only full packs." },
            no_expiry: { type: "boolean", description: "true for things that never go off (salt, tins, cleaning products): clears every date and stops the item asking for one. false to track dates again." },
            use_by_one: {
              type: "object",
              properties: { position: { type: "number", description: "1 = the soonest date, as search_pantry numbers them." }, date: { type: ["string", "null"], description: "YYYY-MM-DD, or null to make that unit undated." } },
              required: ["position", "date"],
              description: "Changes one unit's date and leaves the others."
            },
            opened_at: { type: "array", items: { type: ["string", "null"] }, description: "Bulk: when each open pack was opened, YYYY-MM-DD, one per open pack. null for unknown." },
            other_names: { type: ["array", "null"], items: { type: "string" }, description: "Replaces the other names." },
            brand: { type: ["string", "null"] },
            price_pence: { type: ["number", "null"] },
            notes: { type: ["string", "null"] }
          }
        },
        confirmed
      },
      required: ["item", "changes", "confirmed"]
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async run(args, ctx) {
      const i = findItem(ctx.data.items, args.item);
      const c = args.changes ?? {};
      needConfirmed(args, `changing ${i.name}`);
      let next = { ...i };
      const said = [];
      const name = str(c.name);
      if (name && name !== i.name) {
        const clash = Object.values(ctx.data.items).find((x) => x.id !== i.id && matchesName(x, name));
        if (clash) throw new ToolError(`${clash.name} [id: ${clash.id}] already has that name. The user can merge the two in the pantry app.`);
        next.name = cap(name);
        said.push(`renamed from ${i.name}`);
      }
      if (c.type === "counted" || c.type === "bulk") {
        if (c.type !== i.type) {
          next.type = c.type;
          said.push(`now ${c.type}`);
        }
      }
      if (num(c.minimum) !== void 0 && num(c.minimum) !== i.target) {
        next.target = Math.max(0, num(c.minimum));
        said.push(`minimum ${i.target} \u2192 ${next.target}`);
      }
      if (num(c.stock) !== void 0 && num(c.stock) !== i.inStock) {
        const n = Math.max(0, Math.round(num(c.stock)));
        next = { ...withStock(next, n), entries: n > i.inStock ? settle(next.entries, n - i.inStock) : next.entries };
        said.push(`stock ${i.inStock} \u2192 ${n}`);
      }
      const has = (k) => k in c;
      const cleared = (k) => c[k] === null || c[k] === "";
      if (num(c.open) !== void 0) {
        const open = Math.max(0, Math.round(num(c.open)));
        if (next.type !== "bulk") throw new ToolError(`${i.name} is counted, so it has no open packs. Change type to bulk first if it should.`);
        if (open > next.inStock) throw new ToolError(`Only ${next.inStock} in stock, so at most ${next.inStock} can be open.`);
        next.open = open;
        said.push(`open packs ${i.open ?? 0} \u2192 ${open}`);
      }
      if (has("unit")) {
        next.unit = cleared("unit") ? void 0 : unitPair(str(c.unit) ?? null);
        said.push(next.unit ? "unit" : "unit cleared");
      }
      if (has("pack_size")) {
        if (cleared("pack_size")) {
          next.packSize = void 0;
          said.push("pack size cleared");
        } else {
          const p = c.pack_size;
          const amount = num(p?.amount);
          if (!amount || amount <= 0 || p.measure !== "g" && p.measure !== "ml") throw new ToolError("pack_size is { amount, measure }, with measure g or ml.");
          if (next.type !== "bulk") throw new ToolError(`Pack size is for bulk items, and ${i.name} is counted. Change type to bulk too if it should be.`);
          next.packSize = { amount, measure: p.measure };
          said.push(`pack size ${amount} ${p.measure}`);
        }
      }
      if (has("category")) {
        next.categoryId = cleared("category") ? "" : findCategory(ctx.data, c.category);
        said.push(next.categoryId ? "shop or aisle" : "category cleared");
      }
      if (has("location")) {
        next.location = cleared("location") ? void 0 : location(c.location);
        said.push(next.location ? "location" : "location cleared");
      }
      if (Array.isArray(c.use_by)) {
        next.useBy = (strs(c.use_by) ?? []).map(isoDate).sort();
        said.push(next.useBy.length ? "use-by dates" : "use-by dates cleared");
      }
      if (typeof c.open_counts === "boolean") {
        if (next.type !== "bulk") throw new ToolError(`${i.name} is counted, so it has no open packs.`);
        next.openCounts = c.open_counts || void 0;
        said.push(c.open_counts ? "open pack counts towards the minimum" : "open pack doesn't count towards the minimum");
      }
      if (typeof c.no_expiry === "boolean") {
        next.noExpiry = c.no_expiry || void 0;
        if (c.no_expiry) next.useBy = [];
        said.push(c.no_expiry ? "marked as not expiring" : "use-by dates tracked again");
      }
      if (c.use_by_one && typeof c.use_by_one === "object") {
        const one = c.use_by_one;
        const dates = normalise(next).useBy ?? [];
        const n = Math.round(num(one.position) ?? 0);
        if (n < 1 || n > dates.length) throw new ToolError(dates.length ? `position is 1 to ${dates.length}: ${next.name} has ${plural(dates.length, "dated unit")} in stock.` : `${next.name} has nothing in stock to date.`);
        const was = dates[n - 1];
        dates[n - 1] = one.date === null ? null : isoDate(one.date);
        next.useBy = dates.sort(byDate);
        said.push(`use-by ${was ?? "undated"} \u2192 ${one.date ?? "undated"}`);
      }
      if (Array.isArray(c.opened_at)) {
        if (next.type !== "bulk") throw new ToolError(`${i.name} is counted, so it has no open packs.`);
        const open = next.open ?? 0;
        if (c.opened_at.length > open) throw new ToolError(`${next.name} has ${plural(open, "open pack")}, so give at most ${open} opened dates (or change open too).`);
        next.openedAt = c.opened_at.map((d) => d === null ? null : isoDate(d));
        said.push("opened dates");
      }
      if (has("other_names")) {
        next.otherNames = cleared("other_names") ? void 0 : strs(c.other_names);
        said.push("other names");
      }
      if (has("brand")) {
        next.brand = str(c.brand);
        said.push(next.brand ? "brand" : "brand cleared");
      }
      if (has("price_pence")) {
        next.price = cleared("price_pence") ? void 0 : Math.round(num(c.price_pence) ?? 0);
        said.push(next.price !== void 0 ? "price" : "price cleared");
      }
      if (has("notes")) {
        next.notes = str(c.notes);
        said.push(next.notes ? "notes" : "notes cleared");
      }
      if (next.type !== "bulk") {
        next.open = void 0;
        next.packSize = void 0;
        next.openedAt = void 0;
      }
      if (!said.length) return "Nothing to change.";
      await commit(ctx, { items: [next], title: `Changed ${next.name}`, detail: cap(said.join(", ")), itemIds: [i.id] });
      return `Changed. ${itemLine(ctx.data.items[i.id], ctx.data.categories)}`;
    }
  },
  {
    name: "delete_item",
    title: "Delete a pantry item",
    description: "Deletes an item. Recipes that use it keep their wording but lose the link, and it comes off the shopping list. A delete: ask the user first, naming those recipes, then call with confirmed: true. It can be undone from History in the pantry app the same day.",
    inputSchema: { type: "object", properties: { item: itemRef, confirmed }, required: ["item", "confirmed"] },
    annotations: { readOnlyHint: false, destructiveHint: true },
    async run(args, ctx) {
      const i = findItem(ctx.data.items, args.item);
      const using = ctx.data.recipes.filter((r) => r.ingredients.some((g) => g.itemId === i.id));
      needConfirmed(args, `deleting ${i.name}${using.length ? ` (used by ${using.map((r) => r.name).join(", ")})` : ""}`);
      await commit(ctx, { deleteItems: [i.id], undoRecipes: using, title: `Deleted ${i.name}`, detail: "Recipes keep their wording but lose the link", itemIds: [i.id] });
      for (const r of using) r.ingredients = r.ingredients.map((g) => g.itemId === i.id ? { ...g, itemId: "" } : g);
      return `Deleted ${i.name}.${using.length ? ` These recipes lost the link: ${using.map((r) => r.name).join(", ")}.` : ""}`;
    }
  },
  {
    name: "change_shopping_list",
    title: "Change or remove a list entry",
    description: "Changes how many of something to buy, or takes it off the list (qty 0). An edit: ask the user first, then call with confirmed: true. A Staple below its minimum stays on the list until its stock or minimum changes.",
    inputSchema: { type: "object", properties: { item: itemRef, qty: { type: "number", description: "How many to buy. 0 takes it off." }, confirmed }, required: ["item", "qty", "confirmed"] },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async run(args, ctx) {
      const i = findItem(ctx.data.items, args.item);
      const qty = Math.max(0, Math.round(num(args.qty) ?? -1));
      if (num(args.qty) === void 0) throw new ToolError("Give qty: how many to buy, or 0 to take it off.");
      if (needOf(i) === 0) throw new ToolError(`${i.name} isn't on the shopping list. Use add_to_shopping_list.`);
      needConfirmed(args, qty === 0 ? `taking ${i.name} off the list` : `changing ${i.name} on the list to ${qty}`);
      if (qty === 0) {
        if (i.oneOff) {
          await commit(ctx, { deleteItems: [i.id], title: `Took ${i.name} off the shopping list`, itemIds: [i.id] });
          return `Took ${i.name} off the list.`;
        }
        const next2 = { ...i, entries: [] };
        const left = needOf(next2);
        await commit(ctx, { items: [next2], title: `Took ${i.name} off the shopping list`, itemIds: [i.id] });
        return left > 0 ? `Cleared the added entries, but ${i.name} is a Staple below its minimum, so ${left} stay on the list. To take it off, the stock or minimum has to change (update_item).` : `Took ${i.name} off the list.`;
      }
      const delta = qty - needOf(i);
      const [first, ...rest] = i.entries ?? [];
      const next = first && (i.target === 0 || needOf(i) === entryTotal(i)) ? { ...i, entries: [{ ...first, qty: Math.max(1, first.qty + delta) }, ...rest] } : { ...i, target: Math.max(1, i.target + delta) };
      await commit(ctx, { items: [next], title: `${i.name} on the list: ${needOf(next)} to buy`, detail: next.target !== i.target ? `Minimum ${i.target} \u2192 ${next.target}` : void 0, itemIds: [i.id] });
      return `${i.name}: ${needOf(next)} to buy.${next.target !== i.target ? ` Its minimum changed from ${i.target} to ${next.target}, since it's a Staple.` : ""}`;
    }
  },
  {
    name: "update_recipe",
    title: "Change a recipe",
    description: "Changes a saved recipe. Giving ingredients replaces the whole list (same format as save_recipe). An edit: ask the user first, then call with confirmed: true.",
    inputSchema: {
      type: "object",
      properties: {
        recipe: recipeRef,
        changes: { type: "object", properties: { name: { type: "string" }, ...recipeFields, want_to_cook: { type: "boolean" }, ingredients: { type: "array", items: ingredientSchema } } },
        confirmed
      },
      required: ["recipe", "changes", "confirmed"]
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async run(args, ctx) {
      const r = findRecipe(ctx.data.recipes, args.recipe);
      const c = args.changes ?? {};
      needConfirmed(args, `changing ${r.name}`);
      const name = str(c.name) ?? r.name;
      const clash = ctx.data.recipes.find((x) => x.id !== r.id && x.name.toLowerCase() === name.toLowerCase());
      if (clash) throw new ToolError(`There's already a recipe called ${clash.name}.`);
      const built = c.ingredients !== void 0 ? buildIngredients(ctx.data, c.ingredients, ctx.now()) : null;
      const next = { ...r, ...recipeFrom(c, r), id: r.id, name, ingredients: built?.ingredients ?? r.ingredients, editedAt: ctx.now().toISOString() };
      const renamed = name !== r.name ? Object.values(ctx.data.items).filter((i) => i.entries?.some((e) => e.source.kind === "recipe" && e.source.recipe === r.name)).map((i) => ({ ...i, entries: i.entries.map((e) => e.source.kind === "recipe" && e.source.recipe === r.name ? { ...e, source: { kind: "recipe", recipe: name } } : e) })) : [];
      await commit(ctx, {
        items: [...built?.created ?? [], ...renamed],
        recipes: [next],
        title: `Changed ${name}`,
        detail: name !== r.name ? `Renamed from ${r.name}` : built ? "Ingredients" : void 0,
        recipeId: r.id
      });
      return `Changed ${name}.${built ? `
${ingredientsReport(built)}` : ""}
${recipeLine(next, ctx.data.items)}`;
    }
  },
  {
    name: "delete_recipe",
    title: "Delete a recipe",
    description: "Deletes a saved recipe and takes its entries off the shopping list. Pantry items stay. A delete: ask the user first, then call with confirmed: true.",
    inputSchema: { type: "object", properties: { recipe: recipeRef, confirmed }, required: ["recipe", "confirmed"] },
    annotations: { readOnlyHint: false, destructiveHint: true },
    async run(args, ctx) {
      const r = findRecipe(ctx.data.recipes, args.recipe);
      needConfirmed(args, `deleting ${r.name}`);
      const cleared = Object.values(ctx.data.items).map((i) => removeRecipeEntries(i, r.name)).filter((i) => !!i);
      await commit(ctx, { items: cleared, deleteRecipes: [r.id], title: `Deleted ${r.name}`, detail: cleared.length ? `Took ${plural(cleared.length, "thing")} off the shopping list` : void 0, recipeId: r.id, itemIds: cleared.map((i) => i.id) });
      return `Deleted ${r.name}.${cleared.length ? ` Took its ${plural(cleared.length, "item")} off the list.` : ""}`;
    }
  },
  {
    name: "add_store",
    title: "Add a store",
    description: "Adds a store with its aisle numbers, so the shopping list follows its layout. Needs no asking. Categories you don't number aren't sold there. To change a store that already exists, use update_store.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: `"Sainsbury's, Stoke Newington".` },
        kind: { type: "string", description: 'Optional: "Supermarket", "Butcher".' },
        place: { type: "string", description: "Optional: the street or area." },
        aisles: aislesSchema
      },
      required: ["name"]
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(args, ctx) {
      const name = str(args.name);
      if (!name) throw new ToolError("Give the store a name.");
      const clash = ctx.data.stores.find((x) => x.name.toLowerCase() === name.toLowerCase());
      if (clash) throw new ToolError(`There's already a store called ${clash.name} [id: ${clash.id}]. To change it, use update_store.`);
      const id = freshId(slug(name), (x) => ctx.data.stores.some((s) => s.id === x));
      const aisles = Object.fromEntries(Object.entries(aisleChanges(ctx.data, args.aisles)).filter(([, n]) => n !== null));
      const store = { id, name, kind: str(args.kind) ?? "", place: str(args.place) ?? "", aisles };
      await commitStores(ctx, { save: [store], title: `Added the store ${name}`, detail: aisleText(store, ctx.data.categories) });
      return `Added ${name} [id: ${id}]: ${aisleText(store, ctx.data.categories)}.`;
    }
  },
  {
    name: "update_store",
    title: "Change a store or its aisle numbers",
    description: "Renames a store or changes its kind, place or aisle numbers. Only the aisles you give change. An edit: ask the user first, saying the store and the old and new numbers, then call with confirmed: true. This can't be undone from History, so the reply lists the old numbers.",
    inputSchema: {
      type: "object",
      properties: {
        store: { type: "string", description: "The store's id or name (get_categories_and_stores)." },
        changes: { type: "object", properties: { name: { type: "string" }, kind: { type: "string" }, place: { type: "string" }, aisles: aislesSchema } },
        confirmed
      },
      required: ["store", "changes", "confirmed"]
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async run(args, ctx) {
      const x = findStore(ctx.data, args.store);
      const c = args.changes ?? {};
      const aisles = aisleChanges(ctx.data, c.aisles);
      const name = str(c.name) ?? x.name;
      const clash = ctx.data.stores.find((y) => y.id !== x.id && y.name.toLowerCase() === name.toLowerCase());
      if (clash) throw new ToolError(`There's already a store called ${clash.name}.`);
      needConfirmed(args, `changing ${x.name}`);
      const next = {
        ...x,
        name,
        kind: c.kind === void 0 ? x.kind : str(c.kind) ?? "",
        place: c.place === void 0 ? x.place : str(c.place) ?? "",
        aisles: Object.fromEntries(Object.entries({ ...x.aisles, ...aisles }).filter(([, n]) => n != null))
      };
      const moved = Object.entries(aisles).map(([id, n]) => `${categoryName(ctx.data.categories, id)} ${x.aisles[id] ?? "none"} \u2192 ${n ?? "none"}`);
      const detail = [name !== x.name ? `Renamed from ${x.name}` : "", ...moved].filter(Boolean).join("; ") || void 0;
      await commitStores(ctx, { save: [next], title: `Changed ${name}`, detail });
      return `Changed ${name}.${detail ? ` ${detail}.` : ""} It can't be undone from History, so to go back, change it again.
Now: ${aisleText(next, ctx.data.categories)}.`;
    }
  },
  {
    name: "delete_store",
    title: "Delete a store",
    description: "Deletes a store and its aisle numbers. Items stay. A delete: ask the user first, then call with confirmed: true. It can't be undone from History.",
    inputSchema: { type: "object", properties: { store: { type: "string", description: "The store's id or name." }, confirmed }, required: ["store", "confirmed"] },
    annotations: { readOnlyHint: false, destructiveHint: true },
    async run(args, ctx) {
      const x = findStore(ctx.data, args.store);
      needConfirmed(args, `deleting ${x.name}`);
      await commitStores(ctx, { remove: [x.id], title: `Deleted the store ${x.name}`, detail: aisleText(x, ctx.data.categories) });
      return `Deleted ${x.name}. It had: ${aisleText(x, ctx.data.categories)}. It can't be undone from History; add_store would recreate it.`;
    }
  }
];
function nameListShort(names) {
  if (names.length <= 3) return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
}
async function callTool(name, args, ctx) {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return { content: [{ type: "text", text: `There's no tool called ${name}.` }], isError: true };
  try {
    const text = await tool.run(args ?? {}, { ...ctx, data: await ctx.data() });
    return { content: [{ type: "text", text }] };
  } catch (e) {
    const text = e instanceof ToolError ? e.message : `Something went wrong on the pantry's side: ${e instanceof Error ? e.message : String(e)}`;
    return { content: [{ type: "text", text }], isError: true };
  }
}

// prototypes/claude-connection/src/server.ts
var PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"];
var INSTRUCTIONS = `This is Isaac's pantry: stock, the shopping list and recipes, shared with his pantry app (desktop) and shopping app (phone). Write in British English.
Rules (fixed, not settings):
- Read and search freely.
- Add items, stock, shopping list entries and recipes without asking.
- When he says what he's used, take it off stock with record_used without asking. That isn't an edit.
- Any other edit or delete: describe the change and ask him in the chat first. Those tools need confirmed: true and refuse without it.
- Use the categories that exist. Don't invent one; ask if nothing fits.
Saving a recipe: run match_ingredients, link clear matches, create new items (minimum 0) for ingredients with nothing similar, and ask when an ingredient could mean more than one item. Then say what you linked, created and asked about.
"What can I cook?": find_recipes, can_cook first, then nearly. Recipes that use up food going off soon come first.
A Staple is an item with a minimum above 0. It goes on the shopping list by itself when it drops below the minimum. Bulk items (flour, rice) are counted in whole packs, and an open pack doesn't count towards the minimum.
Every change shows in the pantry app's History, marked Claude, and can be undone there the same day.`;
var json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS, ...headers } });
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id"
};
function createHandler(opts) {
  const metadataUrl = `${opts.baseUrl}/.well-known/oauth-protected-resource`;
  const metadata = {
    resource: opts.baseUrl,
    authorization_servers: [`${opts.supabaseUrl}/auth/v1`],
    bearer_methods_supported: ["header"],
    resource_name: "Pantry"
  };
  const unauthorised = (why) => json({ error: "invalid_token", error_description: why }, 401, { "WWW-Authenticate": `Bearer resource_metadata="${metadataUrl}"` });
  return async function handle2(req) {
    const path = new URL(req.url).pathname;
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (path.endsWith("/.well-known/oauth-protected-resource")) return json(metadata);
    if (req.method === "GET") return json({ error: "This endpoint takes POST. There's no event stream." }, 405, { Allow: "POST" });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
    const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return unauthorised("Sign in to the pantry first.");
    const client = await opts.clientFor(token);
    if (!client) return unauthorised("The sign-in has expired or was revoked.");
    const backend = (opts.backendFor ?? supabaseBackend)(client);
    let cached = null;
    const data = () => cached ??= backend.load();
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
    }
    const batch = Array.isArray(body);
    const messages = batch ? body : [body];
    const replies = [];
    for (const m of messages) {
      const reply = await answer(m, backend, data, opts.now ?? (() => /* @__PURE__ */ new Date()));
      if (reply) replies.push(reply);
    }
    if (!replies.length) return new Response(null, { status: 202, headers: CORS });
    return json(batch ? replies : replies[0]);
  };
}
async function answer(m, backend, data, now) {
  if (!m || typeof m !== "object" || typeof m.method !== "string") {
    return m && "id" in m && !("result" in m) && !("error" in m) ? { jsonrpc: "2.0", id: m.id ?? null, error: { code: -32600, message: "Invalid request" } } : null;
  }
  if (m.id === void 0 || m.id === null) return null;
  const ok = (result) => ({ jsonrpc: "2.0", id: m.id, result });
  switch (m.method) {
    case "initialize": {
      const asked = typeof m.params?.protocolVersion === "string" ? m.params.protocolVersion : "";
      return ok({
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "pantry", title: "Pantry", version: "0.1.0" },
        instructions: INSTRUCTIONS
      });
    }
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: tools.map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations: { title, ...annotations, openWorldHint: false } })) });
    case "tools/call": {
      const name = typeof m.params?.name === "string" ? m.params.name : "";
      const args = m.params?.arguments ?? {};
      return ok(await callTool(name, args, { backend, data, now }));
    }
    case "resources/list":
      return ok({ resources: [] });
    case "prompts/list":
      return ok({ prompts: [] });
    default:
      return { jsonrpc: "2.0", id: m.id, error: { code: -32601, message: `Method not found: ${m.method}` } };
  }
}

// prototypes/claude-connection/edge/index.ts
var supabaseUrl = Deno.env.get("SUPABASE_URL");
var anonKey = Deno.env.get("SUPABASE_ANON_KEY");
var handle = createHandler({
  supabaseUrl,
  baseUrl: `${supabaseUrl}/functions/v1/mcp`,
  async clientFor(token) {
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await client.auth.getUser(token);
    return error || !data.user ? null : client;
  }
});
Deno.serve(handle);
