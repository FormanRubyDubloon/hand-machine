// The tools Claude sees, and what each one does to the pantry. The rules come from
// prototypes/shopping-list/intent.md ("What Claude can do"):
//   - read and search: no asking
//   - add items, stock, list entries and recipes: no asking
//   - take used things off stock: no asking (it isn't an edit)
//   - any other edit or delete: Claude asks in the chat first. Those tools refuse to run without
//     `confirmed: true`, and say so, so a forgotten question fails loudly instead of quietly.
// Every change is written to History as "claude", with an undo snapshot in the pantry app's own
// format, so the app shows it and can undo it the same day.
//
// Stock, list and recipe rules are the pantry app's own (prototypes/pantry-app/src/model.ts).
import {
  amountOf, byUseFirst, cap, distance, entryTotal, haveText, isBulk, isStaple, lower, matchesName, namesOf, needOf, normalise, openUnit, plural,
  recipeInfo, settle, soldAt, stockOf, categoriesAtoZ, listRows, listTotal, money, withStock, type Items, type Reason,
  aisleKey, aisleLabel, aisleTitle, compareAisles, DEFAULT_AISLES, itemAisle, storeAisles, tagsOf, withAisle, withTags, type AisleValue,
} from "../../pantry-app/src/model"
import { unitPair } from "../../shared/src/rows"
import type { Location, SharedIngredient, SharedItem, SharedRecipe, SharedStore } from "../../shared/src/pantry"
import type { Backend, HistoryRow, PantryData } from "./backend"
import { dateWithDays, ingredientLine, itemLine, recipeLine, tagNames } from "./text"

// ---------- plumbing ----------

/** A failure Claude should read and act on (ask the user, fix the call), not a crash. */
export class ToolError extends Error {}

type Json = Record<string, unknown>
type Ctx = { backend: Backend; data: PantryData; now: () => Date }

export type Tool = {
  name: string
  title: string
  description: string
  inputSchema: Json
  annotations: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint?: boolean }
  run: (args: Json, ctx: Ctx) => Promise<string>
}

const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export const slug = (name: string) =>
  name.toLowerCase().replace(/&/g, " and ").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item"

function freshId(base: string, taken: (id: string) => boolean) {
  if (!taken(base)) return base
  let n = 2
  while (taken(`${base}-${n}`)) n++
  return `${base}-${n}`
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined)
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined)
const strs = (v: unknown) => (Array.isArray(v) ? v.map(str).filter((s): s is string => !!s) : undefined)

function needConfirmed(args: Json, what: string) {
  if (args.confirmed === true) return
  throw new ToolError(
    `Not done: ${what} is an edit or a delete, so the user has to agree first. Tell them exactly what will change, ask, and call this again with confirmed: true only after they say yes in this chat.`,
  )
}

/** Writes a change and its History entry. `undoRecipes` are recipes the database changes by itself (a deleted item's links). */
async function commit(
  ctx: Ctx,
  change: {
    items?: SharedItem[]
    deleteItems?: string[]
    recipes?: SharedRecipe[]
    deleteRecipes?: string[]
    undoRecipes?: SharedRecipe[]
    title: string
    detail?: string
    itemIds?: string[]
    recipeId?: string
  },
) {
  const { data, backend } = ctx
  const at = ctx.now().toISOString()
  const items = (change.items ?? []).map((i) => normalise({ ...i, editedAt: at }))
  const undoItems: Record<string, SharedItem | null> = {}
  for (const id of [...items.map((i) => i.id), ...(change.deleteItems ?? [])]) undoItems[id] = data.items[id] ?? null
  const undoRecipes: Record<string, SharedRecipe | null> = {}
  const byId = (id: string) => data.recipes.find((r) => r.id === id) ?? null
  for (const r of [...(change.recipes ?? []), ...(change.undoRecipes ?? [])]) undoRecipes[r.id] = byId(r.id)
  for (const id of change.deleteRecipes ?? []) undoRecipes[id] = byId(id)

  const categories = new Set(data.categories.map((c) => c.id))
  const known = new Set([...Object.keys(data.items), ...items.map((i) => i.id)])
  for (const id of change.deleteItems ?? []) known.delete(id)

  // Items first: new recipes link to them. Deleting items last: recipes lose their links by themselves.
  await backend.saveItems(items, categories)
  await backend.saveRecipes(change.recipes ?? [], data.recipeRows, known)
  await backend.deleteRecipes(change.deleteRecipes ?? [])
  await backend.deleteItems(change.deleteItems ?? [])
  const row: HistoryRow = {
    id: uid("h"),
    at,
    who: "claude",
    title: change.title,
    detail: change.detail ?? null,
    item_ids: change.itemIds ?? items.map((i) => i.id),
    recipe_id: change.recipeId ?? null,
    undo: { items: undoItems, recipes: undoRecipes },
    undone: false,
    key: null,
  }
  await backend.addHistory(row)

  for (const i of items) data.items[i.id] = i
  for (const id of change.deleteItems ?? []) delete data.items[id]
  for (const r of change.recipes ?? []) {
    const n = data.recipes.findIndex((x) => x.id === r.id)
    if (n >= 0) data.recipes[n] = r
    else data.recipes.push(r)
  }
  data.recipes = data.recipes.filter((r) => !(change.deleteRecipes ?? []).includes(r.id))
}


// ---------- stores and aisle numbers ----------

/**
 * Writes store changes and a History entry. The pantry app has no undo for stores yet (its own store
 * edits aren't in History at all), so the entry is a record, not something to undo: `undo` is null.
 */
async function commitStores(ctx: Ctx, change: { save?: SharedStore[]; remove?: string[]; title: string; detail?: string }) {
  const { data, backend } = ctx
  const at = ctx.now().toISOString()
  const removed = new Set(change.remove ?? [])
  const next = [...data.stores.filter((x) => !removed.has(x.id))]
  for (const x of change.save ?? []) {
    const n = next.findIndex((y) => y.id === x.id)
    if (n >= 0) next[n] = x
    else next.push(x)
  }
  const order = new Map(next.map((x, n) => [x.id, n]))
  await backend.saveStores(change.save ?? [], (id) => order.get(id) ?? 0, new Set(data.categories.map((c) => c.id)))
  await backend.deleteStores(change.remove ?? [])
  await backend.addHistory({
    id: uid("h"), at, who: "claude", title: change.title, detail: change.detail ?? null,
    item_ids: [], recipe_id: null, undo: null, undone: false, key: null,
  })
  data.stores = next
}

/**
 * A store in words for Claude (Batch 4c, 24 Nov 2026): aisles belong to stores and sit on each item, learned when
 * the user ticks things off on the phone. A store has a number of aisles, named places walked after the numbers, and
 * labels for its aisles.
 */
function storeText(x: SharedStore, items: Items) {
  if (x.noAisleNumbers) return "no aisle numbers: its list goes A to Z"
  const known = storeAisles(x, pantryItems(items))
  const labels = Object.entries(x.aisleLabels ?? {}).map(([k, v]) => `${/^\d+$/.test(k) ? `aisle ${k}` : k}: ${v}`)
  return [
    `${x.aisleCount ?? DEFAULT_AISLES} aisles`,
    (x.places ?? []).length ? `places (after the numbers, in order): ${(x.places ?? []).join(", ")}` : "no places",
    labels.length ? `labels: ${labels.join("; ")}` : "",
    known.length ? `aisles known so far: ${known.map((g) => `${aisleTitle(g.aisle)} (${plural(g.items.length, "item")})`).join(", ")}` : "no aisles known yet",
  ].filter(Boolean).join(" · ")
}

/** An aisle as Claude gives it: a whole number, or the name of a place. A place the store doesn't have is added. */
function parseAisle(store: SharedStore, v: unknown): AisleValue | null {
  if (v === null || v === "") return null
  if (store.noAisleNumbers) throw new ToolError(`${store.name} has no aisle numbers, so its items have no aisle there.`)
  if (typeof v === "number" && Number.isInteger(v) && v > 0) return v
  if (typeof v === "string" && /^\s*\d+\s*$/.test(v) && Number(v) > 0) return Number(v)
  const place = str(v)
  if (place) return (store.places ?? []).find((p) => p.toLowerCase() === place.toLowerCase()) ?? cap(place)
  throw new ToolError("An aisle is a whole number above 0, or the name of a place such as Freezer. null clears it.")
}

/** A store with a new place added, if the aisle is one it doesn't have yet. */
const withPlace = (store: SharedStore, a: AisleValue | null): SharedStore =>
  typeof a === "string" && !(store.places ?? []).some((p) => p.toLowerCase() === a.toLowerCase()) ? { ...store, places: [...(store.places ?? []), a] } : store

// ---------- finding things ----------

const pantryItems = (items: Items) => Object.values(items).filter((i) => !i.oneOff)

/** Items whose names come close to `q`, best first. */
function nearItems(items: Items, q: string, max = 5) {
  const ql = q.toLowerCase().trim()
  const scored = pantryItems(items)
    .map((i) => {
      const names = namesOf(i).map((n) => n.toLowerCase())
      const contains = names.some((n) => n.includes(ql) || (n.length > 2 && ql.includes(n)))
      const d = Math.min(...names.map((n) => distance(n, ql)))
      return { i, score: contains ? 0 : d }
    })
    .filter((x) => x.score <= Math.max(2, Math.floor(ql.length / 4)))
    .sort((a, b) => a.score - b.score || a.i.name.localeCompare(b.i.name))
  return scored.slice(0, max).map((x) => x.i)
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
/** The length of the longest of an item's names that's in `line` as whole words (plural or not), or 0. */
function nameInLine(i: SharedItem, line: string) {
  const hits = namesOf(i).filter((n) => new RegExp(`\\b${escapeRe(n.toLowerCase().trim().replace(/(es|s)$/, ""))}(es|s)?\\b`).test(line))
  return Math.max(0, ...hits.map((n) => n.length))
}

const idList = (items: SharedItem[]) => items.map((i) => `${i.name} [id: ${i.id}]`).join(", ")

/** An item by id or by name (including its other names). Anything unclear is an error Claude should ask about. */
function findItem(items: Items, ref: unknown): SharedItem {
  const q = str(ref)
  if (!q) throw new ToolError("Say which item: its id or its name.")
  if (items[q]) return items[q]
  const exact = Object.values(items).filter((i) => matchesName(i, q))
  if (exact.length === 1) return exact[0]
  if (exact.length > 1) throw new ToolError(`"${q}" could be more than one item: ${idList(exact)}. Ask the user which, then use its id.`)
  const near = nearItems(items, q)
  if (near.length) throw new ToolError(`No item is called "${q}". Close matches: ${idList(near)}. If one of these is it, use its id; if not, ask the user.`)
  throw new ToolError(`No item is called "${q}", and nothing is close. Use search_pantry, or add it with add_items if the user wants it in the pantry.`)
}

function findRecipe(recipes: SharedRecipe[], ref: unknown): SharedRecipe {
  const q = str(ref)
  if (!q) throw new ToolError("Say which recipe: its id or its name.")
  const byId = recipes.find((r) => r.id === q)
  if (byId) return byId
  const exact = recipes.filter((r) => r.name.toLowerCase() === q.toLowerCase())
  if (exact.length === 1) return exact[0]
  const near = recipes.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()) || distance(r.name.toLowerCase(), q.toLowerCase()) <= 3)
  if (near.length === 1) return near[0]
  if (near.length) throw new ToolError(`"${q}" could be: ${near.map((r) => `${r.name} [id: ${r.id}]`).join(", ")}. Use the id.`)
  throw new ToolError(`No recipe is called "${q}". Use find_recipes to see what's saved.`)
}

/** A tag (what the code calls a category) by name or id. Claude can't add, rename or remove tags. */
function findTag(data: PantryData, ref: unknown): string {
  const q = str(ref)
  if (!q) return ""
  const c = data.categories.find((x) => x.id === q || x.name.toLowerCase() === q.toLowerCase())
  if (c) return c.id
  throw new ToolError(
    `There's no tag "${q}". Use ones that exist (${categoriesAtoZ(data.categories).map((x) => x.name).join(", ")}). Claude can't add tags: the user adds them in Collca or on the phone.`,
  )
}

/** Tags as Claude gives them: a list of names or ids. The old single `category` still works, as one tag. */
function tagIds(data: PantryData, v: unknown, legacy?: unknown): string[] {
  if (Array.isArray(v)) return [...new Set(v.map((t) => findTag(data, t)).filter(Boolean))]
  if (typeof v === "string") return [findTag(data, v)].filter(Boolean)
  return legacy === undefined ? [] : [findTag(data, legacy)].filter(Boolean)
}

function findStore(data: PantryData, ref: unknown) {
  const q = str(ref)
  if (!q) return undefined
  const s = data.stores.find((x) => x.id === q || x.name.toLowerCase() === q.toLowerCase()) ??
    data.stores.find((x) => x.name.toLowerCase().includes(q.toLowerCase()))
  if (!s) throw new ToolError(`No store matches "${q}". Stores: ${data.stores.map((x) => x.name).join(", ")}.`)
  return s
}

const LOCATIONS: Location[] = ["fridge", "freezer", "cupboard", "counter", "household"]
function location(v: unknown): Location | undefined {
  const raw = str(v)?.toLowerCase()
  if (!raw) return undefined
  // The apps show "household" as Other.
  const s = raw === "other" ? "household" : raw
  if (!LOCATIONS.includes(s as Location)) throw new ToolError(`Location is one of: ${LOCATIONS.join(", ")}.`)
  return s as Location
}

function isoDate(v: unknown): string {
  const s = str(v)
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new ToolError(`Dates are YYYY-MM-DD, not "${String(v)}".`)
  return s
}

/** Use-by dates soonest first, undated at the end. */
const byDate = (a: string | null, b: string | null) => (a === b ? 0 : a === null ? 1 : b === null ? -1 : a < b ? -1 : 1)

const stockDetail = (i: SharedItem) => `${cap(haveText(i))} left${needOf(i) > 0 && isStaple(i) ? " · below minimum, on the list" : ""}`

// ---------- schemas ----------

const confirmed = { type: "boolean", description: "true only after the user has agreed to this change in the chat." }
const itemRef = { type: "string", description: "The item's id (from search_pantry), or its exact name." }
const recipeRef = { type: "string", description: "The recipe's id (from find_recipes), or its name." }
const newItemProps = {
  name: { type: "string", description: "As the user would say it, capitalised: \"Chopped tomatoes\"." },
  type: { type: "string", enum: ["counted", "bulk"], description: "counted: tracked by number (eggs, tins, onions). bulk: tracked in whole packs, which can be open (flour, oil, rice, spices)." },
  unit: { type: "string", description: "Optional, singular: \"tin\", \"bag\", \"bottle\". Leave out for plain counts (3 onions)." },
  tags: { type: "array", items: { type: "string" }, description: "Optional: existing tags by name or id (get_categories_and_stores), such as [\"Dairy\"]. An item can have several, or none. Leave out if unsure." },
  location: { type: "string", enum: LOCATIONS, description: "household is shown to the user as Other: cleaning things, toiletries, anything not food." },
}
const ingredientSchema = {
  type: "object",
  properties: {
    text: { type: "string", description: "The recipe's own wording: \"400 g tin chopped tomatoes\"." },
    item: { type: "string", description: "The pantry item's id, when it's a clear match." },
    need: { type: "number", description: "Counted items: how many the recipe uses at its servings. Default 1." },
    buy: { type: "number", description: "How many to put on the list when short. Default 1." },
    partial: { type: "boolean", description: "Uses part of a unit (a clove of garlic, some milk): any stock will do." },
    optional: { type: "boolean", description: "The recipe works without it. Set it when the wording says so (\"1 tomato, optional\", \"(optional)\")." },
  },
  required: ["text"],
}
const recipeFields = {
  serves: { type: "number" },
  minutes: { type: "number", description: "Total time. Leave out if the recipe doesn't say." },
  prep: { type: "number" },
  cook: { type: "number" },
  method: { type: "array", items: { type: "string" }, description: "One step per entry, without numbers." },
  tags: { type: "array", items: { type: "string" } },
  meal: { type: "string", enum: ["Breakfast", "Lunch", "Dinner", "Baking"] },
  source: { type: "string", description: "Where it came from: a link, a book, a person." },
  notes: { type: "string" },
}

// ---------- recipe ingredients ----------

type NewItems = { created: SharedItem[]; linked: string[]; unlinked: string[] }

/**
 * Turns Claude's ingredient lines into the app's. A line with no pantry item stays on the recipe, not linked:
 * it becomes a pantry item only when the user puts it on the shopping list (the pantry app asks for its
 * location and tags then).
 */
function buildIngredients(data: PantryData, input: unknown, _now: Date): { ingredients: SharedIngredient[] } & NewItems {
  if (!Array.isArray(input) || !input.length) throw new ToolError("A recipe needs its ingredients.")
  const created: SharedItem[] = []
  const linked: string[] = []
  const unlinked: string[] = []
  const all = (): Items => ({ ...data.items, ...Object.fromEntries(created.map((i) => [i.id, i])) })
  const ingredients = input.map((raw): SharedIngredient => {
    const g = (raw ?? {}) as Json
    const text = str(g.text)
    if (!text) throw new ToolError("Every ingredient needs its text.")
    let itemId = ""
    if (str(g.item)) {
      itemId = findItem(all(), g.item).id
      linked.push(`${text} → ${all()[itemId].name}`)
    } else unlinked.push(text)
    return { text, itemId, need: Math.max(1, num(g.need) ?? 1), buy: Math.max(1, num(g.buy) ?? 1), partial: g.partial === true || undefined, optional: g.optional === true || undefined }
  })
  return { ingredients, created, linked, unlinked }
}

function newItem(data: PantryData, n: Json, items: Items, now: Date): SharedItem {
  const name = cap(str(n.name)!)
  const type = n.type === "bulk" ? "bulk" : "counted"
  const minimum = Math.max(0, num(n.minimum) ?? 0)
  const stock = Math.max(0, num(n.stock) ?? 0)
  const useBy = (strs(n.use_by) ?? []).map(isoDate).sort()
  return normalise({
    id: freshId(slug(name), (id) => !!items[id]),
    name,
    type,
    target: minimum,
    inStock: stock,
    open: type === "bulk" ? 0 : undefined,
    unit: unitPair(str(n.unit) ?? null),
    // Several tags, or none (Batch 4c). categoryId is kept as the first, for apps that know one.
    categoryId: tagIds(data, n.tags, n.category)[0] ?? "",
    tagIds: tagIds(data, n.tags, n.category),
    where: [],
    boughtAt: stock > 0 ? now.toISOString().slice(0, 10) : undefined,
    location: location(n.location),
    otherNames: strs(n.other_names)?.length ? strs(n.other_names) : undefined,
    notes: str(n.notes),
    useBy: useBy.length ? useBy : undefined,
    noExpiry: n.no_expiry === true || (n.no_expiry === undefined && location(n.location) === "household") || undefined,
    editedAt: now.toISOString(),
  })
}

function recipeFrom(args: Json, base: Partial<SharedRecipe>): Omit<SharedRecipe, "id" | "name" | "ingredients"> {
  const prep = num(args.prep) ?? base.prep
  const cook = num(args.cook) ?? base.cook
  const meal = str(args.meal) as SharedRecipe["meal"]
  if (meal && !["Breakfast", "Lunch", "Dinner", "Baking"].includes(meal)) throw new ToolError("meal is Breakfast, Lunch, Dinner or Baking.")
  return {
    minutes: num(args.minutes) ?? base.minutes ?? ((prep ?? 0) + (cook ?? 0)),
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
    addedAt: base.addedAt,
  }
}

function ingredientsReport(r: NewItems) {
  const lines = []
  if (r.linked.length) lines.push(`Linked (${r.linked.length}): ${r.linked.join("; ")}`)
  if (r.created.length) lines.push(`New pantry items, minimum 0 (${r.created.length}): ${r.created.map((i) => i.name).join(", ")}`)
  if (r.unlinked.length) lines.push(`Not linked to the pantry (${r.unlinked.length}): ${r.unlinked.join("; ")}`)
  return lines.join("\n")
}

const removeRecipeEntries = (i: SharedItem, recipeName: string): SharedItem | null =>
  i.entries?.some((e) => e.source.kind === "recipe" && e.source.recipe === recipeName)
    ? { ...i, entries: i.entries.filter((e) => !(e.source.kind === "recipe" && e.source.recipe === recipeName)) }
    : null

const reasonText = (r: Reason, i: SharedItem) =>
  r.kind === "staple" ? `Staple, have ${haveText(i)}, keep ${i.target}`
    : r.kind === "recipe" ? `for ${r.recipe}`
      : r.kind === "claude" ? "added by Claude"
        : "added by you"

/** "Estimated total £39.90." or "Estimated total about £31.20, not counting 3 things with no price; 2 prices are estimates." */
function totalText(t: ReturnType<typeof listTotal>) {
  if (t.pence === 0 && t.unpriced) return `No estimated total: nothing on the list has a price yet (${plural(t.unpriced, "thing")}).`
  const notes = [
    t.unpriced ? `not counting ${plural(t.unpriced, "thing")} with no price` : "",
    t.estimated ? `${t.estimated === 1 ? "1 price is an estimate" : `${t.estimated} prices are estimates`}` : "",
  ].filter(Boolean)
  return `Estimated total ${t.approximate ? "about " : ""}${money(t.pence)}${notes.length ? `, ${notes.join("; ")}` : ""}.`
}

/** "£1.65 → £1.80 (estimate)", "none → £1.80". */
const priceChange = (before: SharedItem, after: SharedItem) =>
  `${before.price ? money(before.price) : "none"} → ${after.price ? money(after.price) : "none"}${after.priceEstimate ? " (estimate)" : ""}`

// ---------- the tools ----------

export const tools: Tool[] = [
  // ----- read -----
  {
    name: "search_pantry",
    title: "Search the pantry",
    description:
      "Look up pantry items and their stock. Each line gives the id, what's in stock, whether it's a Staple (an item with a minimum to keep), whether it's low or out, how many are on the shopping list, the soonest use-by date, location, tags, its aisle in each store, when it was last bought and price each (marked \"(estimate)\" when it's a guess rather than one the user gave). With no query and no filter it lists everything.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Part of a name, another name, or a tag." },
        filter: { type: "string", enum: ["all", "staples", "low_or_out", "out", "use_soon", "not_staples", "no_price", "estimated_price"], description: "low_or_out: Out, or Low (half the minimum or fewer). use_soon: has a use-by date in the next 7 days. no_price: no price set. estimated_price: the price is an estimate." },
      },
    },
    annotations: { readOnlyHint: true },
    async run(args, { data }) {
      const q = str(args.query)?.toLowerCase()
      const filter = str(args.filter) ?? "all"
      let list = pantryItems(data.items)
      if (q) {
        list = list.filter((i) => namesOf(i).some((n) => n.toLowerCase().includes(q)) || tagNames(data.categories, i).some((t) => t.toLowerCase().includes(q)))
      }
      list = list.filter((i) => {
        if (filter === "staples") return isStaple(i)
        if (filter === "not_staples") return !isStaple(i)
        if (filter === "out") return isStaple(i) && i.inStock <= 0
        if (filter === "low_or_out") return stockOf(i) !== null
        if (filter === "no_price") return !i.price
        if (filter === "estimated_price") return !!i.price && !!i.priceEstimate
        if (filter === "use_soon") {
          const d = (i.useBy ?? []).find((x): x is string => !!x)
          return i.inStock > 0 && !!d && (new Date(d).getTime() - Date.now()) / 86_400_000 <= 7
        }
        return true
      })
      list.sort((a, b) => a.name.localeCompare(b.name))
      if (!list.length) {
        const near = q ? nearItems(data.items, q) : []
        return near.length ? `Nothing matches. Did you mean: ${idList(near)}?` : "Nothing matches."
      }
      return `${plural(list.length, "item")}:\n${list.map((i) => itemLine(i, data.categories, data.stores)).join("\n")}`
    },
  },
  {
    name: "get_shopping_list",
    title: "Get the shopping list",
    description:
      "What's on the shopping list and why: Staples below their minimum, things for recipes the user wants to cook, and things added by hand or by Claude. Lines marked ORDERED are already ordered (online, say), so not to buy in a shop; they stay on the list until they arrive. Give a store to get it in the order the user walks it: No aisle first, then the numbered aisles, then its places, each item in its own aisle there, with things for other stores listed apart. Without a store it's A to Z. Each line has its cost (price each times how many), and the list starts with an estimated total: it leaves out lines with no price and says how many there are, and it's approximate when any line is unpriced or uses an estimated price.",
    inputSchema: { type: "object", properties: { store: { type: "string", description: "A store's name or id (get_categories_and_stores)." } } },
    annotations: { readOnlyHint: true },
    async run(args, { data }) {
      const rows = listRows(data.items)
      if (!rows.length) return "The shopping list is empty."
      const cost = (r: (typeof rows)[number]) => (r.item.price ? `${money(r.item.price * r.qty)}${r.item.priceEstimate ? " (estimate)" : ""}` : "no price")
      const line = (r: (typeof rows)[number]) => `- ${r.item.oneOff ? r.item.name : amountOf(r.item, r.qty)} [id: ${r.item.id}]${r.item.ordered ? " · ORDERED" : ""} · ${r.reasons.map((x) => reasonText(x, r.item)).join("; ")} · ${cost(r)}`
      const store = findStore(data, args.store)
      const out: string[] = []
      if (store) {
        const here = rows.filter((r) => soldAt(r.item, store))
        if (store.noAisleNumbers) out.push(`${store.name} (no aisle numbers), A to Z:`, ...here.map(line))
        else {
          out.push(`${store.name}, in the order it's walked:`)
          const groups = new Map<string, { aisle: AisleValue | null; rows: typeof rows }>()
          for (const r of here) {
            const a = itemAisle(r.item, store)
            const k = a === null ? "" : aisleKey(a)
            const g = groups.get(k) ?? { aisle: a, rows: [] }
            g.rows.push(r)
            groups.set(k, g)
          }
          for (const g of [...groups.values()].sort((x, y) => compareAisles(store, x.aisle, y.aisle))) {
            const label = aisleLabel(store, g.aisle)
            out.push(`${aisleTitle(g.aisle)}${label ? ` (${label})` : ""}:`, ...g.rows.map(line))
          }
        }
        const elsewhere = rows.filter((r) => !soldAt(r.item, store))
        if (elsewhere.length) out.push(`For other stores:`, ...elsewhere.map(line))
      } else {
        out.push("A to Z:", ...[...rows].sort((a, b) => a.item.name.localeCompare(b.item.name)).map(line))
      }
      return `${plural(rows.length, "thing")} on the list.\n${totalText(listTotal(rows))}\n${out.join("\n")}`
    },
  },
  {
    name: "find_recipes",
    title: "Find recipes",
    description:
      "Saved recipes, checked against what's in stock, with recipes that use up food going off soonest first. Each line says whether it can be cooked now or what it's short of. Use this for \"what can I cook tonight?\".",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Part of a recipe name or a tag." },
        filter: { type: "string", enum: ["all", "can_cook", "nearly", "want_to_cook"], description: "nearly: short of 1 or 2 things." },
        uses: { type: "string", description: "Only recipes that use this pantry item (id or name)." },
      },
    },
    annotations: { readOnlyHint: true },
    async run(args, { data }) {
      const q = str(args.query)?.toLowerCase()
      const uses = str(args.uses) ? findItem(data.items, args.uses) : undefined
      const filter = str(args.filter) ?? "all"
      const list = data.recipes
        .filter((r) => !q || r.name.toLowerCase().includes(q) || (r.tags ?? []).some((t) => t.toLowerCase().includes(q)) || r.meal?.toLowerCase() === q)
        .filter((r) => !uses || r.ingredients.some((g) => g.itemId === uses.id))
        .map((recipe) => ({ recipe, info: recipeInfo(recipe, data.items) }))
        .filter(({ recipe, info }) =>
          filter === "can_cook" ? info.canCook : filter === "nearly" ? !info.canCook && info.short.length <= 2 : filter === "want_to_cook" ? recipe.wantToCook : true)
        .sort(byUseFirst)
      if (!list.length) return "No recipes match."
      return `${plural(list.length, "recipe")}:\n${list.map(({ recipe }) => recipeLine(recipe, data.items)).join("\n")}`
    },
  },
  {
    name: "get_recipe",
    title: "Get a recipe",
    description: "One recipe in full: each ingredient against stock, the method and notes. Give serves to scale it.",
    inputSchema: { type: "object", properties: { recipe: recipeRef, serves: { type: "number" } }, required: ["recipe"] },
    annotations: { readOnlyHint: true },
    async run(args, { data }) {
      const r = findRecipe(data.recipes, args.recipe)
      const serves = Math.max(1, num(args.serves) ?? r.serves)
      const info = recipeInfo(r, data.items, serves / r.serves)
      const out = [
        `${r.name} [id: ${r.id}] · serves ${serves}${serves !== r.serves ? ` (scaled from ${r.serves})` : ""} · ${r.minutes > 0 ? `${r.minutes} min` : "no time given"}`,
        info.canCook ? "Can cook now." : `Short of ${info.short.length}.`,
        "Ingredients:",
        ...info.rows.map((row) => `- ${ingredientLine(row)}`),
      ]
      if (r.method.length) out.push("Method:", ...r.method.map((m, n) => `${n + 1}. ${m}`))
      if (r.notes) out.push(`Notes: ${r.notes}`)
      if (r.source) out.push(`Source: ${r.source}`)
      if (r.tags?.length || r.meal) out.push(`Tags: ${[...(r.tags ?? []), ...(r.meal ? [r.meal] : [])].join(", ")}`)
      out.push(r.lastCooked ? `Last cooked ${dateWithDays(r.lastCooked)}.` : "Not cooked yet.", r.wantToCook ? "On the want-to-cook list." : "")
      return out.filter(Boolean).join("\n")
    },
  },
  {
    name: "match_ingredients",
    title: "Match ingredients to the pantry",
    description:
      "Before saving a recipe: finds the pantry items each ingredient line might mean. A line with one clear match can be linked without asking. A line with several plausible matches (\"onion\" when there are red and brown onions) needs the user to choose. A line with no match is left unlinked: it isn't created as a pantry item.",
    inputSchema: { type: "object", properties: { lines: { type: "array", items: { type: "string" } } }, required: ["lines"] },
    annotations: { readOnlyHint: true },
    async run(args, { data }) {
      const lines = strs(args.lines)
      if (!lines?.length) throw new ToolError("Give the ingredient lines.")
      return lines.map((line) => {
        const l = line.toLowerCase()
        // Items whose whole name is in the line; the longest name wins ("chopped tomatoes" over "tomatoes").
        const found = pantryItems(data.items).map((i) => ({ i, length: nameInLine(i, l) })).filter((x) => x.length > 0)
        const longest = Math.max(0, ...found.map((x) => x.length))
        const best = found.filter((x) => x.length === longest).map((x) => x.i)
        if (best.length === 1) return `"${line}": clear match → ${best[0].name} [id: ${best[0].id}]`
        if (best.length > 1) return `"${line}": unsure, could be ${idList(best)}. Ask the user.`
        // Nothing by its full name: try what's left once amounts and preparation words are gone ("1 onion, chopped" → "onion").
        const core = l.replace(/[\d½¼¾⅓⅔/.,()-]+/g, " ").replace(/\b(g|kg|ml|l|tbsp|tsp|cups?|tins?|cans?|jars?|cloves?|bunch(es)?|handfuls?|pinch(es)?|of|x|large|small|medium|fresh|chopped|sliced|diced|finely|roughly|a|an|some)\b/g, " ").replace(/\s+/g, " ").trim()
        const near = core ? nearItems(data.items, core, 4) : []
        if (near.length > 1) return `"${line}": unsure, could be ${idList(near)}. Ask the user, or leave it unlinked if it's none of these.`
        if (near.length === 1) return `"${line}": possible match → ${idList(near)}. Check with the user, or leave it unlinked.`
        return `"${line}": nothing similar. Leave it unlinked (not in the pantry yet).`
      }).join("\n")
    },
  },
  {
    name: "get_history",
    title: "Get History",
    description: "Recent changes to the pantry, newest first, and who made them: you (Collca on the web), phone (the shopping app) or claude.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "Default 20, at most 100." }, who: { type: "string", enum: ["you", "phone", "claude"] } },
    },
    annotations: { readOnlyHint: true },
    async run(args, { backend }) {
      const limit = Math.min(100, Math.max(1, num(args.limit) ?? 20))
      const who = str(args.who)
      const rows = (await backend.history(who ? 300 : limit)).filter((h) => !who || h.who === who).slice(0, limit)
      if (!rows.length) return "No History yet."
      return rows.map((h) => `${h.at.slice(0, 16).replace("T", " ")} · ${h.who} · ${h.title}${h.detail ? ` — ${h.detail}` : ""}${h.undone ? " (undone)" : ""}`).join("\n")
    },
  },
  {
    name: "get_categories_and_stores",
    title: "Get tags and stores",
    description: "The tags items can have (labels such as Dairy or Breakfast; what older versions called categories), and the stores: each one's number of aisles, its places (named aisles such as Freezer, walked after the numbers), its aisle labels and the aisles known so far. Tags don't set aisles: each item has its own aisle in each store.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    async run(_args, { data }) {
      const stores = data.stores.map((s) => {
        return `- ${s.name} [id: ${s.id}]${s.kind ? ` · ${s.kind}` : ""}: ${storeText(s, data.items)}`
      })
      return [`Tags: ${categoriesAtoZ(data.categories).map((c) => `${c.name} [id: ${c.id}]`).join(", ")}`, "Stores:", ...stores].join("\n")
    },
  },

  // ----- add (no asking) -----
  {
    name: "add_items",
    title: "Add pantry items",
    description:
      "Adds new items to the pantry. A minimum above 0 makes it a Staple, which goes on the shopping list by itself when stock drops below the minimum. Items already in the pantry are skipped (the result says which); use add_stock for those.",
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
              notes: { type: "string" },
            },
            required: ["name", "type"],
          },
        },
      },
      required: ["items"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(args, ctx) {
      const input = Array.isArray(args.items) ? (args.items as Json[]) : []
      if (!input.length) throw new ToolError("Give at least one item.")
      const added: SharedItem[] = []
      const skipped: SharedItem[] = []
      for (const n of input) {
        const name = str(n.name)
        if (!name) throw new ToolError("Every item needs a name.")
        const all = { ...ctx.data.items, ...Object.fromEntries(added.map((i) => [i.id, i])) }
        const same = Object.values(all).find((i) => !i.oneOff && matchesName(i, name))
        if (same) skipped.push(same)
        else added.push(newItem(ctx.data, n, all, ctx.now()))
      }
      if (added.length) {
        const one = added.length === 1 ? added[0] : null
        await commit(ctx, {
          items: added,
          title: one ? `Added ${one.name} to the pantry` : `Added ${plural(added.length, "item")} to the pantry`,
          detail: one ? (one.target > 0 ? `A Staple · ${one.target} min` : "Not a Staple") : added.map((i) => i.name).join(", "),
        })
      }
      const out = added.map((i) => `Added: ${itemLine(ctx.data.items[i.id], ctx.data.categories, ctx.data.stores)}`)
      if (skipped.length) out.push(`Already in the pantry, not added: ${idList(skipped)}`)
      return out.join("\n")
    },
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
        use_by: { type: "array", items: { type: "string" }, description: "YYYY-MM-DD for the new units, if known." },
      },
      required: ["item", "amount"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(args, ctx) {
      const i = findItem(ctx.data.items, args.item)
      const amount = Math.round(num(args.amount) ?? 0)
      if (amount < 1) throw new ToolError("amount is a whole number, 1 or more.")
      const dates = (strs(args.use_by) ?? []).map(isoDate)
      const old = [...(i.useBy ?? [])].slice(0, i.inStock)
      while (old.length < i.inStock) old.push(null)
      const fresh = Array.from({ length: amount }, (_, n) => dates[n] ?? null)
      const next = { ...withStock(i, i.inStock + amount), useBy: [...old, ...fresh].sort(byDate), entries: settle(i.entries, amount), boughtAt: ctx.now().toISOString().slice(0, 10) }
      await commit(ctx, { items: [next], title: `Added ${amountOf(i, amount)}`, detail: stockDetail(normalise(next)), itemIds: [i.id] })
      return `Done. ${itemLine(ctx.data.items[i.id], ctx.data.categories, ctx.data.stores)}`
    },
  },
  {
    name: "record_used",
    title: "Record what was used",
    description:
      "Takes used things off stock, when the user says what they've used: \"I used the last of the rice\", \"we had 4 eggs\", \"I opened a new bag of flour\". This isn't an edit, so it doesn't need asking. Counted items: amount is how many were used. Bulk items: amount is how many packs were finished; opened_pack opens one instead.",
    inputSchema: {
      type: "object",
      properties: {
        item: itemRef,
        amount: { type: "number", description: "Default 1." },
        all: { type: "boolean", description: "Used all of it (\"the last of the rice\")." },
        opened_pack: { type: "boolean", description: "Bulk only: opened a pack, nothing finished." },
      },
      required: ["item"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(args, ctx) {
      const i = findItem(ctx.data.items, args.item)
      const pack = i.unit?.[0] ?? "pack"
      if (args.opened_pack === true) {
        if (!isBulk(i)) throw new ToolError(`${i.name} is counted, not bulk: use amount instead.`)
        if ((i.open ?? 0) >= i.inStock) throw new ToolError(`Every ${pack} of ${lower(i.name)} is already open (${haveText(i)}). Ask the user whether one was finished or more came in.`)
        const { item: next, movedTo } = openUnit(i)
        await commit(ctx, { items: [next], title: `Opened a ${pack} of ${lower(i.name)}`, detail: stockDetail(normalise(next)), itemIds: [i.id] })
        if (movedTo) return `Done. Its use-by is now ${movedTo} (use within ${i.useWithinWeeks} weeks once open). ${itemLine(ctx.data.items[i.id], ctx.data.categories, ctx.data.stores)}`
        return `Done. ${itemLine(ctx.data.items[i.id], ctx.data.categories, ctx.data.stores)}`
      }
      if (i.inStock <= 0) throw new ToolError(`There's no ${lower(i.name)} in stock already, so nothing was taken off. If the stock is wrong, ask the user and use update_item.`)
      const used = args.all === true ? i.inStock : Math.round(num(args.amount) ?? 1)
      if (used < 1) throw new ToolError("amount is a whole number, 1 or more.")
      const taken = Math.min(used, i.inStock)
      const next = { ...withStock(i, i.inStock - taken), uses: (i.uses ?? 0) + 1 }
      const title = args.all === true ? `Used all the ${lower(i.name)}`
        : isBulk(i) ? (taken === 1 ? `Finished a ${pack} of ${lower(i.name)}` : `Finished ${amountOf(i, taken)}`)
          : next.inStock === 0 ? `Used the last ${lower(i.name)}` : `Used ${amountOf(i, taken)}`
      await commit(ctx, { items: [next], title, detail: stockDetail(normalise(next)), itemIds: [i.id] })
      const note = used > taken ? ` Only ${taken} were in stock, so it's now at 0.` : ""
      return `Done.${note} ${itemLine(ctx.data.items[i.id], ctx.data.categories, ctx.data.stores)}`
    },
  },
  {
    name: "add_to_shopping_list",
    title: "Add to the shopping list",
    description:
      "Puts things on the shopping list, marked as added by Claude. Use a pantry item's id where there is one. Something that isn't a pantry item (birthday candles) can go on as a one-off: set one_off, and stock isn't tracked for it.",
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
              one_off: { type: "boolean", description: "Not a pantry item." },
            },
            required: ["item"],
          },
        },
      },
      required: ["entries"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(args, ctx) {
      const input = Array.isArray(args.entries) ? (args.entries as Json[]) : []
      if (!input.length) throw new ToolError("Give at least one entry.")
      const at = ctx.now().toISOString()
      const changed: Record<string, SharedItem> = {}
      const names: string[] = []
      for (const e of input) {
        const qty = Math.max(1, Math.round(num(e.qty) ?? 1))
        if (e.one_off === true) {
          const name = cap(str(e.item) ?? "")
          if (!name) throw new ToolError("A one-off needs a name.")
          const id = freshId(`oneoff-${slug(name)}`, (x) => !!ctx.data.items[x] || !!changed[x])
          changed[id] = { id, name, type: "counted", target: 0, inStock: 0, categoryId: "", where: [], oneOff: true, entries: [{ source: { kind: "claude" }, qty, at }] }
          names.push(`${name} (one-off)`)
          continue
        }
        const i = changed[findItem(ctx.data.items, e.item).id] ?? findItem(ctx.data.items, e.item)
        changed[i.id] = { ...i, entries: [...(i.entries ?? []), { source: { kind: "claude" }, qty, at }] }
        names.push(amountOf(i, qty))
      }
      const items = Object.values(changed)
      await commit(ctx, {
        items,
        title: names.length === 1 ? `Added ${names[0]} to the shopping list` : `Added ${plural(names.length, "thing")} to the shopping list`,
        detail: names.length === 1 ? "Added by Claude" : names.join(", "),
      })
      return `On the list: ${names.join(", ")}. Each now needs: ${items.map((i) => `${ctx.data.items[i.id].name} ${needOf(ctx.data.items[i.id])}`).join(", ")}.`
    },
  },
  {
    name: "save_recipe",
    title: "Save a recipe",
    description:
      "Saves a new recipe. First run match_ingredients on the ingredient lines. Link clear matches with item; for lines with nothing similar, leave item out: the ingredient stays on the recipe as not in the pantry yet, and no pantry item is made. It's added to the pantry when the user puts it on the shopping list. If a line could mean more than one item, ask the user before saving. Afterwards, tell the user what was linked, which ingredients aren't in the pantry yet, and what you asked about.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        ...recipeFields,
        want_to_cook: { type: "boolean" },
        ingredients: { type: "array", items: ingredientSchema },
      },
      required: ["name", "serves", "ingredients", "method"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(args, ctx) {
      const name = str(args.name)
      if (!name) throw new ToolError("The recipe needs a name.")
      const same = ctx.data.recipes.find((r) => r.name.toLowerCase() === name.toLowerCase())
      if (same) throw new ToolError(`There's already a recipe called ${same.name} [id: ${same.id}]. Ask the user whether to change that one (update_recipe) or save this under another name.`)
      const now = ctx.now()
      const built = buildIngredients(ctx.data, args.ingredients, now)
      const recipe: SharedRecipe = {
        id: freshId(slug(name), (id) => ctx.data.recipes.some((r) => r.id === id) || !!ctx.data.recipeRows[id]),
        name,
        ingredients: built.ingredients,
        ...recipeFrom(args, { addedBy: "claude", addedAt: now.toISOString() }),
        editedAt: now.toISOString(),
      }
      const detail = [
        `Linked ${plural(built.linked.length, "ingredient")}`,
        built.created.length ? `created ${nameListShort(built.created.map((i) => lower(i.name)))}` : "",
        built.unlinked.length ? `${built.unlinked.length} not linked` : "",
      ].filter(Boolean).join(", ")
      await commit(ctx, { items: built.created, recipes: [recipe], title: `Saved ${name}`, detail, itemIds: built.created.map((i) => i.id), recipeId: recipe.id })
      return `Saved ${name} [id: ${recipe.id}].\n${ingredientsReport(built)}\n${recipeLine(recipe, ctx.data.items)}`
    },
  },
  {
    name: "want_to_cook",
    title: "Want to cook a recipe",
    description:
      "Marks a recipe as one the user wants to cook, and puts whatever it's short of on the shopping list, marked with the recipe's name. For \"add what I need for this recipe to the list\". Ingredients that aren't linked to a pantry item can't go on the list; the result names them.",
    inputSchema: { type: "object", properties: { recipe: recipeRef, serves: { type: "number" } }, required: ["recipe"] },
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(args, ctx) {
      const r = findRecipe(ctx.data.recipes, args.recipe)
      const info = recipeInfo(r, ctx.data.items, Math.max(1, num(args.serves) ?? r.serves) / r.serves)
      const at = ctx.now().toISOString()
      const changed: SharedItem[] = []
      for (const row of info.rows) {
        if (!row.item || row.ing.optional || (row.status !== "short" && row.status !== "little")) continue
        const qty = isBulk(row.item) || row.ing.partial ? Math.max(1, row.ing.buy) : Math.max(row.ing.buy, row.missing)
        changed.push({ ...row.item, entries: [...(row.item.entries ?? []), { source: { kind: "recipe", recipe: r.name }, qty, at }] })
      }
      const listed = info.rows.filter((x) => x.status === "listed").map((x) => x.item!.name)
      const unlinked = info.rows.filter((x) => x.status === "unlinked" && !x.ing.optional).map((x) => x.text)
      await commit(ctx, {
        items: changed,
        recipes: [{ ...r, wantToCook: true }],
        title: `Want to cook ${r.name}`,
        detail: changed.length ? `Added ${plural(changed.length, "thing")} to the shopping list` : "Nothing needed buying",
        itemIds: changed.map((i) => i.id),
        recipeId: r.id,
      })
      const out = [changed.length ? `Added to the list: ${changed.map((i) => i.name).join(", ")}.` : "Nothing new needed buying."]
      if (listed.length) out.push(`Already on the list: ${listed.join(", ")}.`)
      if (unlinked.length) out.push(`Not linked to the pantry, so not added: ${unlinked.join("; ")}.`)
      return out.join(" ")
    },
  },
  {
    name: "cooked_recipe",
    title: "Record a cooked recipe",
    description:
      "Records that the user cooked a recipe: takes what it used off stock, clears its entries from the shopping list and sets the date it was last cooked. By default, counted ingredients come off by what the recipe needs; ingredients that use part of something (a clove of garlic, some flour) only change stock if the user finished one, so ask and list those in finished. Use used to correct amounts.",
    inputSchema: {
      type: "object",
      properties: {
        recipe: recipeRef,
        serves: { type: "number" },
        used: { type: "array", items: { type: "object", properties: { item: itemRef, amount: { type: "number" } }, required: ["item", "amount"] }, description: "Counted items, how many were used, where it differs from the recipe." },
        finished: { type: "array", items: itemRef, description: "Items where a pack or unit was finished (the last of the garlic, a bag of flour)." },
      },
      required: ["recipe"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(args, ctx) {
      const r = findRecipe(ctx.data.recipes, args.recipe)
      const info = recipeInfo(r, ctx.data.items, Math.max(1, num(args.serves) ?? r.serves) / r.serves)
      const counts: Record<string, number> = {}
      for (const row of info.rows) if (row.item && !isBulk(row.item) && !row.ing.partial && row.item.inStock > 0) counts[row.item.id] = (counts[row.item.id] ?? 0) + row.need
      for (const u of (Array.isArray(args.used) ? args.used : []) as Json[]) counts[findItem(ctx.data.items, u.item).id] = Math.max(0, Math.round(num(u.amount) ?? 0))
      const finished = ((Array.isArray(args.finished) ? args.finished : []) as unknown[]).map((f) => findItem(ctx.data.items, f).id)
      const next: Items = {}
      const get = (id: string) => next[id] ?? ctx.data.items[id]
      const parts: string[] = []
      for (const [id, n] of Object.entries(counts)) {
        if (n <= 0) continue
        const i = get(id)
        next[id] = { ...withStock(i, i.inStock - n), uses: (i.uses ?? 0) + 1 }
        parts.push(`${i.name} −${Math.min(n, i.inStock)}`)
      }
      for (const id of finished) {
        const i = get(id)
        if (i.inStock <= 0) continue
        next[id] = { ...withStock(i, i.inStock - 1), uses: (i.uses ?? 0) + 1 }
        parts.push(`${i.name} finished`)
      }
      for (const i of Object.values(ctx.data.items)) {
        const cleared = removeRecipeEntries(get(i.id), r.name)
        if (cleared) next[i.id] = cleared
      }
      await commit(ctx, {
        items: Object.values(next),
        recipes: [{ ...r, lastCooked: ctx.now().toISOString(), wantToCook: false }],
        title: `Cooked ${r.name}`,
        detail: parts.join(", ") || "No stock changes",
        itemIds: [...Object.keys(counts), ...finished],
        recipeId: r.id,
      })
      return `Recorded ${r.name} as cooked. ${parts.length ? `Stock: ${parts.join(", ")}.` : "No stock changed."}`
    },
  },

  // ----- edit and delete (ask first) -----
  {
    name: "update_item",
    title: "Change a pantry item",
    description:
      "Changes any property of an item: name, type, minimum, stock, open packs, unit, pack size, tags, its aisle in a store, location, use-by (best before) dates, when packs were opened, other names, brand, price, notes, the day it was last bought, and whether it's been ordered (only for something on the shopping list). Set a property to null to clear it. Use-by dates are numbered soonest first, undated last, as search_pantry lists them; change one with use_by_one, or replace them all with use_by. An edit: ask the user first, then call with confirmed: true. To record something used, use record_used instead (no asking needed).",
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
            unit: { type: ["string", "null"], description: "Singular: \"tin\", \"bag\". null for plain counts." },
            pack_size: {
              anyOf: [{ type: "object", properties: { amount: { type: "number" }, measure: { type: "string", enum: ["g", "ml"] } }, required: ["amount", "measure"] }, { type: "null" }],
              description: "Bulk only: what one pack holds, e.g. { amount: 1000, measure: \"g\" }. Used to check a recipe has enough.",
            },
            tags: { type: ["array", "null"], items: { type: "string" }, description: "Replaces its tags: existing tags by name or id. [] or null clears them. Claude can't add new tags." },
            aisle: {
              type: "object",
              properties: {
                store: { type: "string", description: "The store's id or name." },
                aisle: { type: ["number", "string", "null"], description: "A whole number, or a place's name (Freezer, Tills). A place the store doesn't have is added to it. null clears it." },
              },
              required: ["store", "aisle"],
              description: "Its aisle in one store. Say the store and the old and new aisle when asking.",
            },
            bought: { type: ["string", "null"], description: "The day it was last bought, YYYY-MM-DD. Stock added sets it by itself." },
            location: { type: ["string", "null"], enum: [...LOCATIONS, null], description: "household is shown to the user as Other." },
            use_by: { type: "array", items: { type: "string" }, description: "Replaces every date, one per unit or pack. YYYY-MM-DD. [] clears them." },
            open_counts: { type: "boolean", description: "Bulk only: true if an open pack counts towards the minimum like a full one. false (the default) counts only full packs." },
            use_within_weeks: { type: ["number", "null"], description: "Bulk only: weeks to use a pack within once it's open (1 to 52). Opening a pack then moves its use-by no later than that. null clears it." },
            no_expiry: { type: "boolean", description: "true for things that never go off (salt, tins, cleaning products): clears every date and stops the item asking for one. false to track dates again." },
            use_by_one: {
              type: "object",
              properties: { position: { type: "number", description: "1 = the soonest date, as search_pantry numbers them." }, date: { type: ["string", "null"], description: "YYYY-MM-DD, or null to make that unit undated." } },
              required: ["position", "date"],
              description: "Changes one unit's date and leaves the others.",
            },
            opened_at: { type: "array", items: { type: ["string", "null"] }, description: "Bulk: when each open pack was opened, YYYY-MM-DD, one per open pack. null for unknown." },
            other_names: { type: ["array", "null"], items: { type: "string" }, description: "Replaces the other names." },
            brand: { type: ["string", "null"] },
            price_pence: { type: ["number", "null"], description: "Price each, in pence. Setting it clears the estimate mark unless price_is_estimate is true." },
            price_is_estimate: { type: "boolean", description: "true when the price is your guess, not one the user gave (from a receipt or the shelf, say)." },
            notes: { type: ["string", "null"] },
            ordered: { type: "boolean", description: "true when the user has ordered it (online, say), so it isn't bought in a shop. It stays on the shopping list, marked, and clears by itself once it's no longer needed. Only for something on the list." },
          },
        },
        confirmed,
      },
      required: ["item", "changes", "confirmed"],
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async run(args, ctx) {
      const i = findItem(ctx.data.items, args.item)
      const c = (args.changes ?? {}) as Json
      needConfirmed(args, `changing ${i.name}`)
      let next: SharedItem = { ...i }
      const said: string[] = []
      const name = str(c.name)
      if (name && name !== i.name) {
        const clash = Object.values(ctx.data.items).find((x) => x.id !== i.id && matchesName(x, name))
        if (clash) throw new ToolError(`${clash.name} [id: ${clash.id}] already has that name. The user can merge the two in Collca.`)
        next.name = cap(name)
        said.push(`renamed from ${i.name}`)
      }
      if (c.type === "counted" || c.type === "bulk") if (c.type !== i.type) { next.type = c.type; said.push(`now ${c.type}`) }
      if (num(c.minimum) !== undefined && num(c.minimum) !== i.target) { next.target = Math.max(0, num(c.minimum)!); said.push(`minimum ${i.target} → ${next.target}`) }
      if (num(c.stock) !== undefined && num(c.stock) !== i.inStock) {
        const n = Math.max(0, Math.round(num(c.stock)!))
        next = { ...withStock(next, n), entries: n > i.inStock ? settle(next.entries, n - i.inStock) : next.entries }
        said.push(`stock ${i.inStock} → ${n}`)
      }
      // A key that's there with null (or "") clears the property; a key that's left out leaves it alone.
      const has = (k: string) => k in c
      const cleared = (k: string) => c[k] === null || c[k] === ""
      if (num(c.open) !== undefined) {
        const open = Math.max(0, Math.round(num(c.open)!))
        if (next.type !== "bulk") throw new ToolError(`${i.name} is counted, so it has no open packs. Change type to bulk first if it should.`)
        if (open > next.inStock) throw new ToolError(`Only ${next.inStock} in stock, so at most ${next.inStock} can be open.`)
        next.open = open
        said.push(`open packs ${i.open ?? 0} → ${open}`)
      }
      if (has("unit")) { next.unit = cleared("unit") ? undefined : unitPair(str(c.unit) ?? null); said.push(next.unit ? "unit" : "unit cleared") }
      if (has("pack_size")) {
        if (cleared("pack_size")) { next.packSize = undefined; said.push("pack size cleared") }
        else {
          const p = c.pack_size as Json
          const amount = num(p?.amount)
          if (!amount || amount <= 0 || (p.measure !== "g" && p.measure !== "ml")) throw new ToolError("pack_size is { amount, measure }, with measure g or ml.")
          if (next.type !== "bulk") throw new ToolError(`Pack size is for bulk items, and ${i.name} is counted. Change type to bulk too if it should be.`)
          next.packSize = { amount, measure: p.measure }
          said.push(`pack size ${amount} ${p.measure}`)
        }
      }
      if (has("tags") || has("category")) {
        next = withTags(next, has("tags") ? (cleared("tags") ? [] : tagIds(ctx.data, c.tags)) : cleared("category") ? [] : tagIds(ctx.data, undefined, c.category))
        said.push(tagsOf(next).length ? `tags: ${tagNames(ctx.data.categories, next).join(", ")}` : "tags cleared")
      }
      let storeChange: SharedStore | undefined
      if (c.aisle !== undefined) {
        const a = (c.aisle ?? {}) as Json
        const store = findStore(ctx.data, a.store)
        if (!store) throw new ToolError("Say which store the aisle is in.")
        const was = itemAisle(i, store)
        const value = parseAisle(store, a.aisle)
        next = withAisle(next, store.id, value)
        const added = withPlace(store, value)
        if (added !== store) storeChange = added
        said.push(`aisle at ${store.name}: ${was === null ? "none" : aisleTitle(was)} → ${value === null ? "none" : aisleTitle(value)}`)
      }
      if (has("bought")) { next.boughtAt = cleared("bought") ? undefined : isoDate(c.bought); said.push(next.boughtAt ? `last bought ${next.boughtAt}` : "bought date cleared") }
      if (has("location")) { next.location = cleared("location") ? undefined : location(c.location); said.push(next.location ? "location" : "location cleared") }
      if (Array.isArray(c.use_by)) { next.useBy = (strs(c.use_by) ?? []).map(isoDate).sort(); said.push(next.useBy.length ? "use-by dates" : "use-by dates cleared") }
      if (typeof c.open_counts === "boolean") {
        if (next.type !== "bulk") throw new ToolError(`${i.name} is counted, so it has no open packs.`)
        next.openCounts = c.open_counts || undefined
        said.push(c.open_counts ? "open pack counts towards the minimum" : "open pack doesn't count towards the minimum")
      }
      if (has("use_within_weeks")) {
        if (next.type !== "bulk") throw new ToolError(`${i.name} is counted, so it has no open packs.`)
        const w = cleared("use_within_weeks") ? undefined : Math.round(num(c.use_within_weeks) ?? 0)
        if (w !== undefined && (w < 1 || w > 52)) throw new ToolError("use_within_weeks is a whole number of weeks, 1 to 52, or null.")
        next.useWithinWeeks = w
        said.push(w ? `use within ${w} ${w === 1 ? "week" : "weeks"} once open` : "use-within period cleared")
      }
      if (typeof c.no_expiry === "boolean") {
        next.noExpiry = c.no_expiry || undefined
        if (c.no_expiry) next.useBy = []
        said.push(c.no_expiry ? "marked as not expiring" : "use-by dates tracked again")
      }
      if (c.use_by_one && typeof c.use_by_one === "object") {
        const one = c.use_by_one as Json
        const dates = normalise(next).useBy ?? []
        const n = Math.round(num(one.position) ?? 0)
        if (n < 1 || n > dates.length) throw new ToolError(dates.length ? `position is 1 to ${dates.length}: ${next.name} has ${plural(dates.length, "dated unit")} in stock.` : `${next.name} has nothing in stock to date.`)
        const was = dates[n - 1]
        dates[n - 1] = one.date === null ? null : isoDate(one.date)
        next.useBy = dates.sort(byDate)
        said.push(`use-by ${was ?? "undated"} → ${one.date ?? "undated"}`)
      }
      if (Array.isArray(c.opened_at)) {
        if (next.type !== "bulk") throw new ToolError(`${i.name} is counted, so it has no open packs.`)
        const open = next.open ?? 0
        if (c.opened_at.length > open) throw new ToolError(`${next.name} has ${plural(open, "open pack")}, so give at most ${open} opened dates (or change open too).`)
        next.openedAt = (c.opened_at as unknown[]).map((d) => (d === null ? null : isoDate(d)))
        said.push("opened dates")
      }
      if (has("other_names")) { next.otherNames = cleared("other_names") ? undefined : strs(c.other_names); said.push("other names") }
      if (has("brand")) { next.brand = str(c.brand); said.push(next.brand ? "brand" : "brand cleared") }
      if (has("price_pence")) {
        next.price = cleared("price_pence") ? undefined : Math.round(num(c.price_pence) ?? 0)
        next.priceEstimate = (next.price !== undefined && c.price_is_estimate === true) || undefined
        said.push(next.price !== undefined ? `price ${priceChange(i, next)}` : "price cleared")
      } else if (typeof c.price_is_estimate === "boolean" && next.price !== undefined && !!i.priceEstimate !== c.price_is_estimate) {
        next.priceEstimate = c.price_is_estimate || undefined
        said.push(c.price_is_estimate ? "price marked as an estimate" : "price no longer an estimate")
      }
      if (has("notes")) { next.notes = str(c.notes); said.push(next.notes ? "notes" : "notes cleared") }
      if (typeof c.ordered === "boolean" && c.ordered !== !!i.ordered) {
        if (c.ordered && needOf(next) <= 0) throw new ToolError(`${next.name} isn't on the shopping list, so it can't be marked as ordered.`)
        next.ordered = c.ordered || undefined
        said.push(c.ordered ? "marked as ordered" : "no longer marked as ordered")
      }
      if (next.type !== "bulk") { next.open = undefined; next.packSize = undefined; next.openedAt = undefined }
      if (!said.length) return "Nothing to change."
      await commit(ctx, { items: [next], title: `Changed ${next.name}`, detail: cap(said.join(", ")), itemIds: [i.id] })
      // A new place for the store: it joins the store's places, after the others.
      if (storeChange) await commitStores(ctx, { save: [storeChange], title: `${storeChange.name}: added the place ${(storeChange.places ?? []).at(-1)}` })
      return `Changed. ${itemLine(ctx.data.items[i.id], ctx.data.categories, ctx.data.stores)}`
    },
  },
  {
    name: "set_prices",
    title: "Set prices for several items",
    description:
      "Sets the price each of several pantry items at once, for example from a receipt, or your own estimates for items with no price (search_pantry with filter no_price finds them). Say whether these are estimates: estimated prices are marked, and totals that use them show as approximate. An edit: list every item with its old and new price, ask the user once, then call with confirmed: true. One History entry covers the lot, so it can be undone in Collca in one go the same day.",
    inputSchema: {
      type: "object",
      properties: {
        prices: {
          type: "array",
          items: { type: "object", properties: { item: itemRef, price_pence: { type: "number", description: "Price each, in pence: 165 for £1.65." } }, required: ["item", "price_pence"] },
        },
        estimate: { type: "boolean", description: "true when these are your guesses; false when the user gave them (a receipt, the shelf, a website)." },
        confirmed,
      },
      required: ["prices", "estimate", "confirmed"],
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async run(args, ctx) {
      const list = Array.isArray(args.prices) ? (args.prices as Json[]) : []
      if (!list.length) throw new ToolError("Give prices: a list of { item, price_pence }.")
      if (typeof args.estimate !== "boolean") throw new ToolError("Say whether these prices are estimates: estimate true (your guesses) or false (the user gave them).")
      const byId = new Map<string, SharedItem>()
      for (const p of list) {
        const i = findItem(ctx.data.items, p.item)
        const pence = num(p.price_pence)
        if (pence === undefined || pence <= 0) throw new ToolError(`${i.name}: price_pence has to be a number above 0, in pence (165 for £1.65). Nothing was changed.`)
        byId.set(i.id, { ...(byId.get(i.id) ?? i), price: Math.round(pence), priceEstimate: args.estimate || undefined })
      }
      needConfirmed(args, `setting ${plural(byId.size, "price")}`)
      const changed = [...byId.values()].filter((n) => { const i = ctx.data.items[n.id]; return i.price !== n.price || !!i.priceEstimate !== !!n.priceEstimate })
      if (!changed.length) return "Nothing to change: those prices are already set."
      const lines = changed.map((n) => `${n.name} ${priceChange(ctx.data.items[n.id], n)}`)
      await commit(ctx, {
        items: changed,
        title: `Set ${args.estimate ? "estimated " : ""}prices for ${plural(changed.length, "item")}`,
        detail: lines.join(", "),
        itemIds: changed.map((n) => n.id),
      })
      const total = listTotal(listRows(ctx.data.items))
      return `Set ${plural(changed.length, "price")}:\n${lines.map((l) => `- ${l}`).join("\n")}\nShopping list: ${lower(totalText(total))}`
    },
  },
  {
    name: "delete_item",
    title: "Delete a pantry item",
    description: "Deletes an item. Recipes that use it keep their wording but lose the link, and it comes off the shopping list. A delete: ask the user first, naming those recipes, then call with confirmed: true. It can be undone from History in Collca the same day.",
    inputSchema: { type: "object", properties: { item: itemRef, confirmed }, required: ["item", "confirmed"] },
    annotations: { readOnlyHint: false, destructiveHint: true },
    async run(args, ctx) {
      const i = findItem(ctx.data.items, args.item)
      const using = ctx.data.recipes.filter((r) => r.ingredients.some((g) => g.itemId === i.id))
      needConfirmed(args, `deleting ${i.name}${using.length ? ` (used by ${using.map((r) => r.name).join(", ")})` : ""}`)
      await commit(ctx, { deleteItems: [i.id], undoRecipes: using, title: `Deleted ${i.name}`, detail: "Recipes keep their wording but lose the link", itemIds: [i.id] })
      for (const r of using) r.ingredients = r.ingredients.map((g) => (g.itemId === i.id ? { ...g, itemId: "" } : g))
      return `Deleted ${i.name}.${using.length ? ` These recipes lost the link: ${using.map((r) => r.name).join(", ")}.` : ""}`
    },
  },
  {
    name: "change_shopping_list",
    title: "Change or remove a list entry",
    description: "Changes how many of something to buy, or takes it off the list (qty 0). An edit: ask the user first, then call with confirmed: true. A Staple below its minimum stays on the list until its stock or minimum changes.",
    inputSchema: { type: "object", properties: { item: itemRef, qty: { type: "number", description: "How many to buy. 0 takes it off." }, confirmed }, required: ["item", "qty", "confirmed"] },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async run(args, ctx) {
      const i = findItem(ctx.data.items, args.item)
      const qty = Math.max(0, Math.round(num(args.qty) ?? -1))
      if (num(args.qty) === undefined) throw new ToolError("Give qty: how many to buy, or 0 to take it off.")
      if (needOf(i) === 0) throw new ToolError(`${i.name} isn't on the shopping list. Use add_to_shopping_list.`)
      needConfirmed(args, qty === 0 ? `taking ${i.name} off the list` : `changing ${i.name} on the list to ${qty}`)
      if (qty === 0) {
        if (i.oneOff) {
          await commit(ctx, { deleteItems: [i.id], title: `Took ${i.name} off the shopping list`, itemIds: [i.id] })
          return `Took ${i.name} off the list.`
        }
        const next = { ...i, entries: [] }
        const left = needOf(next)
        await commit(ctx, { items: [next], title: `Took ${i.name} off the shopping list`, itemIds: [i.id] })
        return left > 0
          ? `Cleared the added entries, but ${i.name} is a Staple below its minimum, so ${left} stay on the list. To take it off, the stock or minimum has to change (update_item).`
          : `Took ${i.name} off the list.`
      }
      // As the pantry app does it: an entry changes when the entries are what put it there, otherwise the minimum.
      const delta = qty - needOf(i)
      const [first, ...rest] = i.entries ?? []
      const next = first && (i.target === 0 || needOf(i) === entryTotal(i))
        ? { ...i, entries: [{ ...first, qty: Math.max(1, first.qty + delta) }, ...rest] }
        : { ...i, target: Math.max(1, i.target + delta) }
      await commit(ctx, { items: [next], title: `${i.name} on the list: ${needOf(next)} to buy`, detail: next.target !== i.target ? `Minimum ${i.target} → ${next.target}` : undefined, itemIds: [i.id] })
      return `${i.name}: ${needOf(next)} to buy.${next.target !== i.target ? ` Its minimum changed from ${i.target} to ${next.target}, since it's a Staple.` : ""}`
    },
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
        confirmed,
      },
      required: ["recipe", "changes", "confirmed"],
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async run(args, ctx) {
      const r = findRecipe(ctx.data.recipes, args.recipe)
      const c = (args.changes ?? {}) as Json
      needConfirmed(args, `changing ${r.name}`)
      const name = str(c.name) ?? r.name
      const clash = ctx.data.recipes.find((x) => x.id !== r.id && x.name.toLowerCase() === name.toLowerCase())
      if (clash) throw new ToolError(`There's already a recipe called ${clash.name}.`)
      const built = c.ingredients !== undefined ? buildIngredients(ctx.data, c.ingredients, ctx.now()) : null
      const next: SharedRecipe = { ...r, ...recipeFrom(c, r), id: r.id, name, ingredients: built?.ingredients ?? r.ingredients, editedAt: ctx.now().toISOString() }
      // A renamed recipe's list entries follow it.
      const renamed = name !== r.name
        ? Object.values(ctx.data.items).filter((i) => i.entries?.some((e) => e.source.kind === "recipe" && e.source.recipe === r.name))
          .map((i) => ({ ...i, entries: i.entries!.map((e) => (e.source.kind === "recipe" && e.source.recipe === r.name ? { ...e, source: { kind: "recipe" as const, recipe: name } } : e)) }))
        : []
      await commit(ctx, {
        items: [...(built?.created ?? []), ...renamed],
        recipes: [next],
        title: `Changed ${name}`,
        detail: name !== r.name ? `Renamed from ${r.name}` : built ? "Ingredients" : undefined,
        recipeId: r.id,
      })
      return `Changed ${name}.${built ? `\n${ingredientsReport(built)}` : ""}\n${recipeLine(next, ctx.data.items)}`
    },
  },
  {
    name: "delete_recipe",
    title: "Delete a recipe",
    description: "Deletes a saved recipe and takes its entries off the shopping list. Pantry items stay. A delete: ask the user first, then call with confirmed: true.",
    inputSchema: { type: "object", properties: { recipe: recipeRef, confirmed }, required: ["recipe", "confirmed"] },
    annotations: { readOnlyHint: false, destructiveHint: true },
    async run(args, ctx) {
      const r = findRecipe(ctx.data.recipes, args.recipe)
      needConfirmed(args, `deleting ${r.name}`)
      const cleared = Object.values(ctx.data.items).map((i) => removeRecipeEntries(i, r.name)).filter((i): i is SharedItem => !!i)
      await commit(ctx, { items: cleared, deleteRecipes: [r.id], title: `Deleted ${r.name}`, detail: cleared.length ? `Took ${plural(cleared.length, "thing")} off the shopping list` : undefined, recipeId: r.id, itemIds: cleared.map((i) => i.id) })
      return `Deleted ${r.name}.${cleared.length ? ` Took its ${plural(cleared.length, "item")} off the list.` : ""}`
    },
  },
  {
    name: "add_store",
    title: "Add a store",
    description: "Adds a store. Needs no asking. Its items' aisles fill in as the user shops there with the phone (it asks after each tick-off), so there's nothing to set up. To change a store that already exists, use update_store.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "\"Sainsbury's, Stoke Newington\"." },
        kind: { type: "string", description: "Optional: \"Supermarket\", \"Butcher\"." },
        place: { type: "string", description: "Optional: the street or area." },
        no_aisle_numbers: { type: "boolean", description: "true for a shop that isn't walked in aisles (a greengrocer, a butcher): its list goes A to Z." },
        aisle_count: { type: "number", description: "Optional: how many numbered aisles it has. The phone offers that many when it asks. Default 20." },
        places: { type: "array", items: { type: "string" }, description: "Optional: named aisles such as Freezer or Tills, in the order they're walked, after the numbers." },
      },
      required: ["name"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(args, ctx) {
      const name = str(args.name)
      if (!name) throw new ToolError("Give the store a name.")
      const clash = ctx.data.stores.find((x) => x.name.toLowerCase() === name.toLowerCase())
      if (clash) throw new ToolError(`There's already a store called ${clash.name} [id: ${clash.id}]. To change it, use update_store.`)
      const id = freshId(slug(name), (x) => ctx.data.stores.some((s) => s.id === x))
      const count = aisleCount(args.aisle_count)
      const store: SharedStore = {
        id, name, kind: str(args.kind) ?? "", place: str(args.place) ?? "",
        // Stores still keep a retired number per tag (null), so older apps see the store.
        aisles: Object.fromEntries(ctx.data.categories.map((c) => [c.id, null])),
        ...(args.no_aisle_numbers === true ? { noAisleNumbers: true, sells: [] } : {}),
        ...(count ? { aisleCount: count } : {}),
        ...((strs(args.places) ?? []).length ? { places: [...new Set((strs(args.places) ?? []).map(cap))] } : {}),
      }
      await commitStores(ctx, { save: [store], title: `Added the store ${name}`, detail: storeText(store, ctx.data.items) })
      return `Added ${name} [id: ${id}]: ${storeText(store, ctx.data.items)}.`
    },
  },
  {
    name: "update_store",
    title: "Change a store",
    description: "Renames a store, or changes its kind, place, whether it has aisle numbers, its number of aisles, its places (named aisles such as Freezer, in walking order) or its aisle labels (\"Dairy and eggs\" for aisle 4). To move an item to another aisle, use update_item. An edit: ask the user first, saying what changes, then call with confirmed: true. This can't be undone from History, so the reply says what it was.",
    inputSchema: {
      type: "object",
      properties: {
        store: { type: "string", description: "The store's id or name (get_categories_and_stores)." },
        changes: {
          type: "object",
          properties: {
            name: { type: "string" },
            kind: { type: "string" },
            place: { type: "string" },
            no_aisle_numbers: { type: "boolean" },
            aisle_count: { type: ["number", "null"], description: "How many numbered aisles. null goes back to 20." },
            places: { type: "array", items: { type: "string" }, description: "Replaces its places, in walking order. Items in a place that's left out go back to No aisle there." },
            aisle_labels: { type: "object", additionalProperties: { type: ["string", "null"] }, description: "Labels by aisle: { \"4\": \"Dairy and eggs\", \"Freezer\": \"Back wall\" }. null removes a label. Others stay." },
          },
        },
        confirmed,
      },
      required: ["store", "changes", "confirmed"],
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async run(args, ctx) {
      const x = findStore(ctx.data, args.store)!
      const c = (args.changes ?? {}) as Json
      const name = str(c.name) ?? x.name
      const clash = ctx.data.stores.find((y) => y.id !== x.id && y.name.toLowerCase() === name.toLowerCase())
      if (clash) throw new ToolError(`There's already a store called ${clash.name}.`)
      needConfirmed(args, `changing ${x.name}`)
      const next: SharedStore = { ...x, name, kind: c.kind === undefined ? x.kind : str(c.kind) ?? "", place: c.place === undefined ? x.place : str(c.place) ?? "" }
      const said: string[] = name !== x.name ? [`renamed from ${x.name}`] : []
      if (typeof c.no_aisle_numbers === "boolean" && c.no_aisle_numbers !== !!x.noAisleNumbers) {
        if (c.no_aisle_numbers) Object.assign(next, { noAisleNumbers: true, sells: x.sells ?? [] })
        else next.noAisleNumbers = undefined
        said.push(c.no_aisle_numbers ? "now no aisle numbers (A to Z)" : "aisle numbers again")
      }
      if ("aisle_count" in c) {
        const n = c.aisle_count === null ? undefined : aisleCount(c.aisle_count)
        if (n !== x.aisleCount) { next.aisleCount = n; said.push(`aisles ${x.aisleCount ?? DEFAULT_AISLES} → ${n ?? DEFAULT_AISLES}`) }
      }
      let cleared: SharedItem[] = []
      if (Array.isArray(c.places)) {
        const places = [...new Set((strs(c.places) ?? []).map(cap))]
        const gone = (x.places ?? []).filter((p) => !places.some((q) => q.toLowerCase() === p.toLowerCase()))
        next.places = places.length ? places : undefined
        cleared = pantryItems(ctx.data.items).filter((i) => { const a = i.aisleAt?.[x.id]; return typeof a === "string" && gone.some((p) => p.toLowerCase() === a.toLowerCase()) })
          .map((i) => withAisle(i, x.id, null))
        if (JSON.stringify(places) !== JSON.stringify(x.places ?? [])) said.push(`places: ${(x.places ?? []).join(", ") || "none"} → ${places.join(", ") || "none"}`)
      }
      if (c.aisle_labels !== undefined) {
        if (!c.aisle_labels || typeof c.aisle_labels !== "object" || Array.isArray(c.aisle_labels)) throw new ToolError("aisle_labels is an object of aisle → label, such as { \"4\": \"Dairy and eggs\" }.")
        const labels = { ...(x.aisleLabels ?? {}) }
        for (const [k, v] of Object.entries(c.aisle_labels as Json)) {
          const key = aisleKey(/^\d+$/.test(k.trim()) ? Number(k) : k)
          const was = labels[key]
          if (v === null || v === "") delete labels[key]
          else if (typeof v === "string") labels[key] = v.trim()
          else throw new ToolError("Each label is text, or null to remove it.")
          if ((labels[key] ?? "") !== (was ?? "")) said.push(`${aisleTitle(/^\d+$/.test(key) ? Number(key) : k.trim())} label: ${was ?? "none"} → ${labels[key] ?? "none"}`)
        }
        next.aisleLabels = Object.keys(labels).length ? labels : undefined
      }
      if (!said.length) return "Nothing to change."
      const detail = cap(said.join("; "))
      await commitStores(ctx, { save: [next], title: `Changed ${name}`, detail })
      if (cleared.length) await commit(ctx, { items: cleared, title: `${plural(cleared.length, "item")} back to No aisle at ${name}`, itemIds: cleared.map((i) => i.id) })
      return `Changed ${name}. ${detail}. It can't be undone from History, so to go back, change it again.\nNow: ${storeText(next, ctx.data.items)}.`
    },
  },
  {
    name: "delete_store",
    title: "Delete a store",
    description: "Deletes a store, its places and labels. Items stay, but lose their aisle there. A delete: ask the user first, then call with confirmed: true. It can't be undone from History.",
    inputSchema: { type: "object", properties: { store: { type: "string", description: "The store's id or name." }, confirmed }, required: ["store", "confirmed"] },
    annotations: { readOnlyHint: false, destructiveHint: true },
    async run(args, ctx) {
      const x = findStore(ctx.data, args.store)!
      needConfirmed(args, `deleting ${x.name}`)
      const had = storeText(x, ctx.data.items)
      await commitStores(ctx, { remove: [x.id], title: `Deleted the store ${x.name}`, detail: had })
      // Items bought at this store go back to any store, and lose their aisle there.
      const moved = Object.values(ctx.data.items).filter((i) => i.where.includes(x.id) || i.aisleAt?.[x.id] !== undefined)
        .map((i) => ({ ...withAisle(i, x.id, null), where: i.where.filter((s) => s !== x.id) }))
      if (moved.length) await commit(ctx, { items: moved, title: `${moved.length === 1 ? moved[0].name : `${moved.length} items`} no longer tied to ${x.name}`, itemIds: moved.map((i) => i.id) })
      return `Deleted ${x.name}. It had: ${had}. It can't be undone from History; add_store would recreate it, but not its items' aisles.`
    },
  },
]

/** A store's number of aisles: a whole number from 1 to 200, or undefined for the default (20). */
function aisleCount(v: unknown) {
  if (v === undefined || v === null) return undefined
  const n = num(v)
  if (n === undefined || !Number.isInteger(n) || n < 1 || n > 200) throw new ToolError("aisle_count is a whole number from 1 to 200.")
  return n === DEFAULT_AISLES ? undefined : n
}

function nameListShort(names: string[]) {
  if (names.length <= 3) return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
  return `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`
}

/** Runs a tool. Errors Claude can act on come back as isError results; anything else is a server fault. */
export async function callTool(name: string, args: Json, ctx: Omit<Ctx, "data"> & { data: () => Promise<PantryData> }) {
  const tool = tools.find((t) => t.name === name)
  if (!tool) return { content: [{ type: "text", text: `There's no tool called ${name}.` }], isError: true }
  try {
    const text = await tool.run(args ?? {}, { ...ctx, data: await ctx.data() })
    return { content: [{ type: "text", text }] }
  } catch (e) {
    const text = e instanceof ToolError ? e.message : `Something went wrong on the pantry's side: ${e instanceof Error ? e.message : String(e)}`
    return { content: [{ type: "text", text }], isError: true }
  }
}
