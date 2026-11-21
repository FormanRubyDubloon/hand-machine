// Every change the phone can make, as a pure function from one state to the next. The store (src/data/store.tsx)
// runs them, saves the result, writes a History entry and syncs. Rules from intent.md and the PROTO-1 handoff.
import {
  cap, guessPlace, ingredientName, isBulk, isListedItem, isStaple, needOf, normalise, openUnit, recipeInfo, withStock,
  type Category, type Item, type Items, type Location, type Recipe, type Store,
} from "../../../prototypes/pantry-app/src/model"
import type { PhoneState } from "../data/state"
import { bought, refreshShop, unbought } from "./list"

const now = () => new Date().toISOString()

/** A short random id, safe for Supabase's text keys. */
export const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`

/** An id from a name ("World foods" → "world-foods"), made unique among `taken`. */
export function slugId(name: string, taken: (id: string) => boolean) {
  const base = name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item"
  let id = base
  for (let n = 2; taken(id); n++) id = `${base}-${n}`
  return id
}

const stamp = (i: Item): Item => ({ ...i, editedAt: now() })
const edit = (s: PhoneState, id: string, fn: (i: Item) => Item): PhoneState => {
  const i = s.items[id]
  return i ? { ...s, items: { ...s.items, [id]: normalise(stamp(fn(i))) } } : s
}

/** Where a new item probably lives, from its aisle: chilled things in the fridge, frozen in the freezer. */
export function locationFor(categoryId: string, categories: Category[], items: Items): Location {
  const name = categories.find((c) => c.id === categoryId)?.name.toLowerCase() ?? ""
  const same = Object.values(items).filter((i) => i.categoryId === categoryId && i.location)
  if (same.length) {
    const counts = new Map<Location, number>()
    for (const i of same) counts.set(i.location!, (counts.get(i.location!) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
  }
  if (/frozen|freez/.test(name)) return "freezer"
  if (/dairy|chill|meat|fish|deli|fruit|veg/.test(name)) return "fridge"
  if (/bath|kitchen|household|clean/.test(name)) return "household"
  return "cupboard"
}

// ---------- the list ----------

/** Ticks one more off. Stock goes up now; the shop keeps the row on screen. */
export function tickOne(s: PhoneState, id: string): PhoneState {
  const shop = refreshShop(s.shop, s.items)
  const row = shop.rows[id]
  const item = s.items[id]
  if (!row || !item || row.got >= row.need) return { ...s, shop }
  return { ...s, shop: { ...shop, rows: { ...shop.rows, [id]: { ...row, got: row.got + 1 } } }, items: { ...s.items, [id]: bought(item, 1) } }
}

/** Ticks off everything left on a row. */
export function tickAll(s: PhoneState, id: string): PhoneState {
  const shop = refreshShop(s.shop, s.items)
  const row = shop.rows[id]
  const item = s.items[id]
  if (!row || !item || row.got >= row.need) return { ...s, shop }
  return { ...s, shop: { ...shop, rows: { ...shop.rows, [id]: { ...row, got: row.need } } }, items: { ...s.items, [id]: bought(item, row.need - row.got) } }
}

/** Un-ticks a whole row: what was ticked comes off stock again, and it's back on the list as it was. */
export function untick(s: PhoneState, id: string): PhoneState {
  const row = s.shop?.rows[id]
  const item = s.items[id]
  if (!s.shop || !row || !item || row.got === 0) return s
  return { ...s, shop: { ...s.shop, rows: { ...s.shop.rows, [id]: { ...row, got: 0 } } }, items: { ...s.items, [id]: unbought(item, row.got, row.entries, row.review) } }
}

/** Puts the ticks back as they were before a "got all" (the toast's Undo). */
export function restoreTicks(s: PhoneState, id: string, got: number): PhoneState {
  const row = s.shop?.rows[id]
  const item = s.items[id]
  if (!s.shop || !row || !item || got >= row.got) return s
  const back = row.got - got
  const restored = got === 0 ? unbought(item, back, row.entries, row.review) : normalise({ ...item, inStock: Math.max(0, item.inStock - back), useBy: (item.useBy ?? []).slice(0, Math.max(0, (item.useBy ?? []).length - back)), editedAt: now() })
  return { ...s, shop: { ...s.shop, rows: { ...s.shop.rows, [id]: { ...row, got } } }, items: { ...s.items, [id]: restored } }
}

/** How many to get. A Staple below its minimum raises or lowers its minimum, like Collca on the web; anything else changes its list entry. */
export function setToGet(s: PhoneState, id: string, qty: number): PhoneState {
  const i = s.items[id]
  if (!i || qty < 1) return s
  const delta = qty - needOf(i)
  if (!delta) return s
  const next = edit(s, id, (x) => {
    const [first, ...rest] = x.entries ?? []
    if (first && (!isStaple(x) || needOf(x) === (x.entries ?? []).reduce((n, e) => n + e.qty, 0))) return { ...x, entries: [{ ...first, qty: Math.max(1, first.qty + delta) }, ...rest] }
    if (!isStaple(x)) return { ...x, entries: [{ source: { kind: "hand" }, qty, at: now() }] }
    return { ...x, target: Math.max(1, x.target + delta) }
  })
  return withShopRow(next, id)
}

/** After the amount changes, the shop row follows (keeping what's been ticked). */
function withShopRow(s: PhoneState, id: string): PhoneState {
  const shop = refreshShop(s.shop, s.items)
  const row = shop.rows[id]
  const item = s.items[id]
  if (!row || !item) return { ...s, shop }
  const need = Math.max(row.got, row.got + needOf(item))
  return { ...s, shop: { ...shop, rows: { ...shop.rows, [id]: { ...row, need: row.got ? need : needOf(item) } } } }
}

export function setListNote(s: PhoneState, id: string, note: string): PhoneState {
  return edit(s, id, (x) => ({ ...x, notes: note.trim() || undefined }))
}

/**
 * Takes it off the list. Hand and recipe entries go; a Staple below its minimum would come straight back, so
 * its minimum drops to what you have. Something added here and never bought leaves altogether.
 */
export function removeFromList(s: PhoneState, id: string): PhoneState {
  const i = s.items[id]
  if (!i) return s
  let next: PhoneState
  if ((i.oneOff || (i.review && i.inStock <= 0 && i.target === 0)) && !s.recipes.some((r) => r.ingredients.some((g) => g.itemId === id))) {
    const items = { ...s.items }
    delete items[id]
    next = { ...s, items }
  } else next = edit(s, id, (x) => ({ ...x, entries: [], target: isStaple(x) ? Math.min(x.target, Math.max(0, x.inStock - (x.open && !x.openCounts ? x.open : 0))) : x.target }))
  const rows = { ...(next.shop?.rows ?? {}) }
  delete rows[id]
  return { ...next, shop: next.shop ? { ...next.shop, rows } : null }
}

/**
 * The question before Remove from list, saying what removing will really do. Worked out by running
 * removeFromList, so it can't drift from it.
 */
export function removeQuestion(s: PhoneState, id: string): string {
  const before = s.items[id]
  if (!before) return ""
  const name = before.name.toLowerCase()
  const after = removeFromList(s, id).items[id]
  if (!after) return `Take ${name} off the list? It isn't in your pantry, so it goes altogether.`
  if (after.target < before.target) return `Take ${name} off the list? It's a Staple, so its minimum drops from ${before.target} to ${after.target}, or it would come straight back.`
  return `Take ${name} off the list?`
}

/** Puts one more of a pantry item on the list, added by hand. */
export function addToList(s: PhoneState, id: string, qty = 1): PhoneState {
  const next = edit(s, id, (x) => ({ ...x, entries: [...(x.entries ?? []), { source: { kind: "hand" }, qty, at: now() }] }))
  return withShopRow(next, id)
}

/**
 * Something that isn't in the pantry. It becomes a pantry item now (minimum 0, none in stock, marked New), so
 * Collca on the web and Claude see it, and it's in stock once you tick it off. Its location is a guess from its aisle.
 */
export function addNew(s: PhoneState, name: string, categoryId: string): { state: PhoneState; id: string } {
  const id = slugId(name, (x) => !!s.items[x])
  const item = normalise({
    id, name: cap(name.trim()), type: "counted", target: 0, inStock: 0, categoryId, where: [],
    location: locationFor(categoryId, s.categories, s.items), review: true, editedAt: now(),
    entries: [{ source: { kind: "hand" }, qty: 1, at: now() }],
  })
  return { state: withShopRow({ ...s, items: { ...s.items, [id]: item } }, id), id }
}

/** Starts a new list: ticked rows go, and things added here that were only ever one-offs are tidied away. */
export function clearShop(s: PhoneState): PhoneState {
  const items = { ...s.items }
  for (const [id, r] of Object.entries(s.shop?.rows ?? {})) if (r.got >= r.need && items[id]?.oneOff) delete items[id]
  return { ...s, items, shop: refreshShop(null, items), aisle: 0, filter: undefined }
}

// ---------- recipes ----------

const mine = (recipe: Recipe) => (e: { source: { kind: string; recipe?: string } }) => e.source.kind === "recipe" && e.source.recipe === recipe.name

/** How many of an ingredient this recipe has put on the list. Below 1 takes it off. */
export function setIngredientQty(s: PhoneState, recipe: Recipe, itemId: string, qty: number): PhoneState {
  const next = edit(s, itemId, (x) => {
    const rest = (x.entries ?? []).filter((e) => !mine(recipe)(e))
    const was = (x.entries ?? []).filter(mine(recipe))
    if (qty < 1) return { ...x, entries: rest }
    return { ...x, entries: [...rest, { source: { kind: "recipe", recipe: recipe.name }, qty, at: was[0]?.at ?? now() }] }
  })
  return qty < 1 ? { ...next, shop: refreshShop(next.shop, next.items) } : withShopRow(next, itemId)
}

/**
 * Puts one ingredient on the list, 1 pack or unit. One that isn't in the pantry becomes a pantry item first
 * (minimum 0, New, aisle and location guessed), linked to the recipe line.
 */
export function addIngredient(s: PhoneState, recipe: Recipe, position: number, qty = 1): PhoneState {
  const ing = recipe.ingredients[position]
  if (!ing) return s
  const linked = ing.itemId ? s.items[ing.itemId] : undefined
  if (linked) {
    const already = (linked.entries ?? []).filter(mine(recipe)).reduce((n, e) => n + e.qty, 0)
    return setIngredientQty(s, recipe, linked.id, already + qty)
  }
  const name = ingredientName(ing.text)
  const place = guessPlace(name, s.items)
  const id = slugId(name, (x) => !!s.items[x])
  const item = normalise({
    id, name, type: "counted", target: 0, inStock: 0, categoryId: place.categoryId, where: [],
    location: place.location ?? locationFor(place.categoryId, s.categories, s.items), review: true, editedAt: now(),
    entries: [{ source: { kind: "recipe", recipe: recipe.name }, qty, at: now() }],
  })
  const recipes = s.recipes.map((r) => (r.id === recipe.id ? { ...r, editedAt: now(), ingredients: r.ingredients.map((g, k) => (k === position ? { ...g, itemId: id } : g)) } : r))
  return withShopRow({ ...s, items: { ...s.items, [id]: item }, recipes }, id)
}

/** "Add all missing": 1 of every ingredient you're short of that isn't on the list yet. Returns how many went on. */
export function addAllMissing(s: PhoneState, recipe: Recipe, factor = 1): { state: PhoneState; added: number } {
  const info = recipeInfo(recipe, s.items, factor)
  let next = s
  let added = 0
  info.rows.forEach((r, k) => {
    if (r.ing.optional) return
    if (!(r.status === "short" || r.status === "little" || r.status === "unlinked")) return
    if (r.item && isListedItem(r, recipe)) return
    if (r.status === "unlinked" && /water/i.test(r.text) && !r.ing.itemId) return
    const current = next.recipes.find((x) => x.id === recipe.id) ?? recipe
    next = addIngredient(next, current, k, 1)
    added++
  })
  return { state: next, added }
}

/**
 * "Want to cook": marks the recipe and puts what you're short of on the list: the shortfall for counted
 * things, 1 of anything else, skipping what's already there. Tapping again only takes the mark off.
 */
export function toggleWant(s: PhoneState, recipe: Recipe, factor = 1): { state: PhoneState; added: number } {
  const want = !recipe.wantToCook
  let next: PhoneState = { ...s, recipes: s.recipes.map((r) => (r.id === recipe.id ? { ...r, wantToCook: want } : r)) }
  if (!want) return { state: next, added: 0 }
  const info = recipeInfo(recipe, s.items, factor)
  let added = 0
  info.rows.forEach((r, k) => {
    if (r.ing.optional) return
    if (!(r.status === "short" || r.status === "little" || r.status === "unlinked")) return
    if (r.item && isListedItem(r, recipe)) return
    const current = next.recipes.find((x) => x.id === recipe.id) ?? recipe
    const qty = r.item && !isBulk(r.item) && !r.ing.partial ? Math.max(1, r.missing) : 1
    next = addIngredient(next, current, k, qty)
    added++
  })
  return { state: next, added }
}

/**
 * Cooked it: counted amounts come off stock, each ticked bulk ingredient loses one pack (an open one first),
 * the recipe's entries leave the list and it's no longer a Want to cook.
 */
export function cooked(s: PhoneState, recipe: Recipe, counts: Record<string, number>, finished: string[]): PhoneState {
  let next: PhoneState = { ...s, recipes: s.recipes.map((r) => (r.id === recipe.id ? { ...r, lastCooked: now(), wantToCook: false } : r)) }
  for (const [id, n] of Object.entries(counts)) if (n > 0) next = edit(next, id, (x) => ({ ...withStock(x, x.inStock - n), uses: (x.uses ?? 0) + 1 }))
  for (const id of finished) next = edit(next, id, (x) => ({ ...withStock(x, x.inStock - 1), uses: (x.uses ?? 0) + 1 }))
  for (const i of Object.values(next.items)) {
    if (i.entries?.some(mine(recipe))) next = edit(next, i.id, (x) => ({ ...x, entries: x.entries!.filter((e) => !mine(recipe)(e)) }))
  }
  return { ...next, shop: refreshShop(next.shop, next.items) }
}

// ---------- the pantry ----------

/** Used one (counted) or finished one (bulk: an open pack goes first). */
export const usedOne = (s: PhoneState, id: string) => edit(s, id, (x) => ({ ...withStock(x, x.inStock - 1), uses: (x.uses ?? 0) + 1 }))
export const usedAll = (s: PhoneState, id: string) => edit(s, id, (x) => ({ ...withStock(x, 0), uses: (x.uses ?? 0) + 1 }))
/** Add one more (a full pack, for bulk). */
export const addOne = (s: PhoneState, id: string) => edit(s, id, (x) => bought(x, 1))
/** Opens the soonest full pack. With "use within, once open" set, its use-by moves no later than that. */
export const openOne = (s: PhoneState, id: string) => edit(s, id, (x) => openUnit(x).item)

export const setMin = (s: PhoneState, id: string, n: number) => withShopRow(edit(s, id, (x) => ({ ...x, target: Math.max(0, n) })), id)
export const setLocation = (s: PhoneState, id: string, location: Location) => edit(s, id, (x) => ({ ...x, location }))
export const setCategory = (s: PhoneState, id: string, categoryId: string) => edit(s, id, (x) => ({ ...x, categoryId }))
export const setNotes = (s: PhoneState, id: string, notes: string) => edit(s, id, (x) => ({ ...x, notes: notes.trim() || undefined }))
/** One use-by date for the item (the soonest; the handoff keeps one date per item on the phone for now). */
export const setUseBy = (s: PhoneState, id: string, iso: string | null) =>
  edit(s, id, (x) => {
    const dates = [...(x.useBy ?? [])]
    if (dates.length === 0) dates.push(iso)
    else dates[0] = iso
    return { ...x, useBy: dates.sort((a, b) => (a ?? "9").localeCompare(b ?? "9")), noExpiry: iso ? undefined : x.noExpiry }
  })
/** "Looks right, save it": it's no longer New. */
export const approve = (s: PhoneState, id: string) => edit(s, id, (x) => ({ ...x, review: undefined }))

// ---------- stores and aisles ----------

export const chooseStore = (s: PhoneState, storeId: string): PhoneState => ({ ...s, storeId, aisle: 0 })

export function renameStore(s: PhoneState, storeId: string, name: string): PhoneState {
  if (!name.trim()) return s
  return { ...s, stores: s.stores.map((x) => (x.id === storeId ? { ...x, name: name.trim() } : x)) }
}

/** Sets a category's aisle number in one store. 0 or less means no number. */
export function setAisleNumber(s: PhoneState, storeId: string, categoryId: string, n: number | null): PhoneState {
  return { ...s, stores: s.stores.map((x) => (x.id === storeId ? { ...x, aisles: { ...x.aisles, [categoryId]: n && n > 0 ? n : null } } : x)) }
}

export function addStore(s: PhoneState, name: string): { state: PhoneState; id: string } | null {
  const clean = name.trim()
  if (!clean) return null
  const id = slugId(clean, (x) => s.stores.some((st) => st.id === x))
  const store: Store = { id, name: clean, aisles: Object.fromEntries(s.categories.map((c) => [c.id, null])) }
  return { state: { ...s, stores: [...s.stores, store] }, id }
}

/** Removes a store and its aisle numbers. The last store can't go. */
export function removeStore(s: PhoneState, storeId: string): PhoneState {
  if (s.stores.length <= 1) return s
  const stores = s.stores.filter((x) => x.id !== storeId)
  // Items bought at this store go back to any store.
  const items = { ...s.items }
  for (const i of Object.values(s.items)) if (i.where.includes(storeId)) items[i.id] = { ...i, where: i.where.filter((x) => x !== storeId), editedAt: now() }
  return { ...s, items, stores, storeId: s.storeId === storeId ? stores[0].id : s.storeId, aisle: s.storeId === storeId ? 0 : s.aisle }
}

/**
 * Adds an aisle (a category). It appears in every store with no number, except the store it was added from,
 * where it gets `number`. Returns null when a category already has that name.
 */
export function addAisle(s: PhoneState, storeId: string, name: string, number: number | null): { state: PhoneState; id: string } | null {
  const clean = name.trim()
  if (!clean || s.categories.some((c) => c.name.toLowerCase() === clean.toLowerCase())) return null
  const id = slugId(clean, (x) => s.categories.some((c) => c.id === x))
  const categories = [...s.categories, { id, name: clean }]
  // A store with no aisle numbers ticks the new aisle as sold there instead of numbering it.
  const stores = s.stores.map((x) => ({
    ...x,
    aisles: { ...x.aisles, [id]: x.id === storeId && number && !x.noAisleNumbers ? number : null },
    ...(x.id === storeId && x.noAisleNumbers ? { sells: [...(x.sells ?? []), id] } : {}),
  }))
  return { state: { ...s, categories, stores }, id }
}
