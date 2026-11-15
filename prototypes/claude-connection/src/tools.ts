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
  amountOf, byUseFirst, cap, distance, entryTotal, haveText, isBulk, isStaple, lower, matchesName, namesOf, needOf, normalise, plural,
  recipeInfo, settle, soldAt, stockOf, aisleOrder, listRows, todayIso, withStock, type Items, type Reason,
} from "../../pantry-app/src/model"
import { unitPair } from "../../shared/src/rows"
import type { Category, Location, SharedIngredient, SharedItem, SharedRecipe, SharedStore } from "../../shared/src/pantry"
import type { Backend, HistoryRow, PantryData } from "./backend"
import { categoryName, dateWithDays, ingredientLine, itemLine, recipeLine } from "./text"

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

/** `{ "Frozen": 12, "Baking": null }` → category ids to numbers. null clears a number. */
function aisleChanges(data: PantryData, v: unknown): Record<string, number | null> {
  if (v === undefined) return {}
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new ToolError("aisles is an object of category name → aisle number, for example { \"Frozen\": 12 }. Use null to clear a number.")
  const out: Record<string, number | null> = {}
  for (const [ref, n] of Object.entries(v as Json)) {
    const id = findCategory(data, ref)
    if (n === null) out[id] = null
    else if (typeof n === "number" && Number.isInteger(n) && n > 0) out[id] = n
    else throw new ToolError(`The aisle number for ${ref} has to be a whole number above 0, or null to clear it.`)
  }
  return out
}

const aislesSchema = {
  type: "object",
  description: "Aisle number per category, by category name or id: { \"Frozen\": 12, \"Baking\": 7 }. null clears a number (the store doesn't sell it). Categories left out stay as they are. Claude can't add or rename categories.",
  additionalProperties: { type: ["number", "null"] },
}

const aisleText = (x: SharedStore, cats: Category[]) =>
  aisleOrder(x, cats).filter((c) => x.aisles[c.id] != null).map((c) => `${x.aisles[c.id]} ${c.name}`).join(", ") || "no aisles set"

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

function findCategory(data: PantryData, ref: unknown): string {
  const q = str(ref)
  if (!q) return ""
  const c = data.categories.find((x) => x.id === q || x.name.toLowerCase() === q.toLowerCase())
  if (c) return c.id
  throw new ToolError(
    `There's no category "${q}". Use one that exists (${data.categories.map((x) => x.name).join(", ")}). Claude can't add categories yet.`,
  )
}

function findStore(data: PantryData, ref: unknown) {
  const q = str(ref)
  if (!q) return undefined
  const s = data.stores.find((x) => x.id === q || x.name.toLowerCase() === q.toLowerCase()) ??
    data.stores.find((x) => x.name.toLowerCase().includes(q.toLowerCase()))
  if (!s) throw new ToolError(`No store matches "${q}". Stores: ${data.stores.map((x) => x.name).join(", ")}.`)
  return s
}

const LOCATIONS: Location[] = ["fridge", "freezer", "cupboard"]
function location(v: unknown): Location | undefined {
  const s = str(v)?.toLowerCase()
  if (!s) return undefined
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
  category: { type: "string", description: "An existing category's name or id (get_categories_and_stores). Leave out if unsure." },
  location: { type: "string", enum: LOCATIONS },
}
const ingredientSchema = {
  type: "object",
  properties: {
    text: { type: "string", description: "The recipe's own wording: \"400 g tin chopped tomatoes\"." },
    item: { type: "string", description: "The pantry item's id, when it's a clear match." },
    new_item: { type: "object", properties: newItemProps, required: ["name", "type"], description: "When nothing in the pantry is similar: a new item to create (minimum 0, so it isn't a Staple)." },
    need: { type: "number", description: "Counted items: how many the recipe uses at its servings. Default 1." },
    buy: { type: "number", description: "How many to put on the list when short. Default 1." },
    partial: { type: "boolean", description: "Uses part of a unit (a clove of garlic, some milk): any stock will do." },
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

/** Turns Claude's ingredient lines into the app's, creating new items where asked. */
function buildIngredients(data: PantryData, input: unknown, now: Date): { ingredients: SharedIngredient[] } & NewItems {
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
    } else if (g.new_item && typeof g.new_item === "object") {
      const n = g.new_item as Json
      const name = str(n.name)
      if (!name) throw new ToolError(`The new item for "${text}" needs a name.`)
      const same = Object.values(all()).find((i) => matchesName(i, name))
      if (same) {
        itemId = same.id
        linked.push(`${text} → ${same.name} (already in the pantry)`)
      } else {
        const item = newItem(data, n, all(), now)
        created.push(item)
        itemId = item.id
      }
    } else unlinked.push(text)
    return { text, itemId, need: Math.max(1, num(g.need) ?? 1), buy: Math.max(1, num(g.buy) ?? 1), partial: g.partial === true || undefined }
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
    categoryId: findCategory(data, n.category),
    where: [],
    location: location(n.location),
    otherNames: strs(n.other_names)?.length ? strs(n.other_names) : undefined,
    notes: str(n.notes),
    useBy: useBy.length ? useBy : undefined,
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

// ---------- the tools ----------

export const tools: Tool[] = [
  // ----- read -----
  {
    name: "search_pantry",
    title: "Search the pantry",
    description:
      "Look up pantry items and their stock. Each line gives the id, what's in stock, whether it's a Staple (an item with a minimum to keep), whether it's low or out, how many are on the shopping list, the soonest use-by date, location and category. With no query and no filter it lists everything.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Part of a name, another name, or a category name." },
        filter: { type: "string", enum: ["all", "staples", "low_or_out", "out", "use_soon", "not_staples"], description: "use_soon: has a use-by date in the next 7 days." },
      },
    },
    annotations: { readOnlyHint: true },
    async run(args, { data }) {
      const q = str(args.query)?.toLowerCase()
      const filter = str(args.filter) ?? "all"
      let list = pantryItems(data.items)
      if (q) {
        list = list.filter((i) => namesOf(i).some((n) => n.toLowerCase().includes(q)) || categoryName(data.categories, i.categoryId).toLowerCase().includes(q))
      }
      list = list.filter((i) => {
        if (filter === "staples") return isStaple(i)
        if (filter === "not_staples") return !isStaple(i)
        if (filter === "out") return isStaple(i) && i.inStock <= 0
        if (filter === "low_or_out") return stockOf(i) !== null
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
      return `${plural(list.length, "item")}:\n${list.map((i) => itemLine(i, data.categories)).join("\n")}`
    },
  },
  {
    name: "get_shopping_list",
    title: "Get the shopping list",
    description:
      "What's on the shopping list and why: Staples below their minimum, things for recipes the user wants to cook, and things added by hand or by Claude. Give a store to get it in that store's aisle order, with anything the store doesn't sell listed apart.",
    inputSchema: { type: "object", properties: { store: { type: "string", description: "A store's name or id (get_categories_and_stores)." } } },
    annotations: { readOnlyHint: true },
    async run(args, { data }) {
      const rows = listRows(data.items)
      if (!rows.length) return "The shopping list is empty."
      const line = (r: (typeof rows)[number]) => `- ${r.item.oneOff ? r.item.name : amountOf(r.item, r.qty)} [id: ${r.item.id}] · ${r.reasons.map((x) => reasonText(x, r.item)).join("; ")}`
      const store = findStore(data, args.store)
      const out: string[] = []
      if (store) {
        out.push(`${store.name}, in aisle order:`)
        for (const c of aisleOrder(store, data.categories)) {
          const here = rows.filter((r) => r.item.categoryId === c.id && soldAt(r.item, store))
          if (here.length) out.push(`Aisle ${store.aisles[c.id] ?? "?"} · ${c.name}`, ...here.map(line))
        }
        const elsewhere = rows.filter((r) => !soldAt(r.item, store))
        if (elsewhere.length) out.push(`Not sold at ${store.name} (or no aisle set):`, ...elsewhere.map(line))
      } else {
        for (const c of [...data.categories, { id: "", name: "No category" }]) {
          const here = rows.filter((r) => (r.item.categoryId || "") === c.id || (c.id === "" && !data.categories.some((x) => x.id === r.item.categoryId)))
          if (here.length) out.push(`${c.name}:`, ...here.map(line))
        }
      }
      return `${plural(rows.length, "thing")} on the list.\n${out.join("\n")}`
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
      "Before saving a recipe: finds the pantry items each ingredient line might mean. A line with one clear match can be linked without asking. A line with several plausible matches (\"onion\" when there are red and brown onions) needs the user to choose. A line with no match becomes a new item.",
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
        if (near.length > 1) return `"${line}": unsure, could be ${idList(near)}. Ask the user, or create a new item if it's none of these.`
        if (near.length === 1) return `"${line}": possible match → ${idList(near)}. Check with the user, or create a new item.`
        return `"${line}": nothing similar. Create a new item.`
      }).join("\n")
    },
  },
  {
    name: "get_history",
    title: "Get History",
    description: "Recent changes to the pantry, newest first, and who made them: you (the pantry app), phone (the shopping app) or claude.",
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
    title: "Get categories and stores",
    description: "The categories (shop sections) items can go in, and the stores with their aisle numbers.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    async run(_args, { data }) {
      const stores = data.stores.map((s) => {
        const numbered = aisleOrder(s, data.categories).filter((c) => s.aisles[c.id] != null)
        return `- ${s.name} [id: ${s.id}]${s.kind ? ` · ${s.kind}` : ""}: ${numbered.map((c) => `${s.aisles[c.id]} ${c.name}`).join(", ") || "no aisles set"}`
      })
      return [`Categories: ${data.categories.map((c) => `${c.name} [id: ${c.id}]`).join(", ")}`, "Stores:", ...stores].join("\n")
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
          detail: one ? (one.target > 0 ? `A Staple · keep ${one.target}` : "Not a Staple") : added.map((i) => i.name).join(", "),
        })
      }
      const out = added.map((i) => `Added: ${itemLine(ctx.data.items[i.id], ctx.data.categories)}`)
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
      const next = { ...withStock(i, i.inStock + amount), useBy: [...old, ...fresh].sort(byDate), entries: settle(i.entries, amount) }
      await commit(ctx, { items: [next], title: `Added ${amountOf(i, amount)}`, detail: stockDetail(normalise(next)), itemIds: [i.id] })
      return `Done. ${itemLine(ctx.data.items[i.id], ctx.data.categories)}`
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
        const next = { ...i, open: (i.open ?? 0) + 1, openedAt: [...(i.openedAt ?? []), todayIso()] }
        await commit(ctx, { items: [next], title: `Opened a ${pack} of ${lower(i.name)}`, detail: stockDetail(normalise(next)), itemIds: [i.id] })
        return `Done. ${itemLine(ctx.data.items[i.id], ctx.data.categories)}`
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
      return `Done.${note} ${itemLine(ctx.data.items[i.id], ctx.data.categories)}`
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
      "Saves a new recipe. First run match_ingredients on the ingredient lines. Link clear matches with item; for lines with nothing similar, give new_item (it becomes a pantry item with minimum 0). If a line could mean more than one item, ask the user before saving. Every ingredient should be a pantry item; leave item and new_item out only for things like water. Afterwards, tell the user what was linked, what was created and what you asked about.",
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
        if (!row.item || (row.status !== "short" && row.status !== "little")) continue
        const qty = isBulk(row.item) || row.ing.partial ? Math.max(1, row.ing.buy) : Math.max(row.ing.buy, row.missing)
        changed.push({ ...row.item, entries: [...(row.item.entries ?? []), { source: { kind: "recipe", recipe: r.name }, qty, at }] })
      }
      const listed = info.rows.filter((x) => x.status === "listed").map((x) => x.item!.name)
      const unlinked = info.rows.filter((x) => x.status === "unlinked").map((x) => x.text)
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
      "Changes any property of an item: name, type, minimum, stock, open packs, unit, pack size, category, location, use-by (best before) dates, when packs were opened, other names, brand, price and notes. Set a property to null to clear it. Use-by dates are numbered soonest first, undated last, as search_pantry lists them; change one with use_by_one, or replace them all with use_by. An edit: ask the user first, then call with confirmed: true. To record something used, use record_used instead (no asking needed).",
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
            category: { type: ["string", "null"] },
            location: { type: ["string", "null"], enum: [...LOCATIONS, null] },
            use_by: { type: "array", items: { type: "string" }, description: "Replaces every date, one per unit or pack. YYYY-MM-DD. [] clears them." },
            use_by_one: {
              type: "object",
              properties: { position: { type: "number", description: "1 = the soonest date, as search_pantry numbers them." }, date: { type: ["string", "null"], description: "YYYY-MM-DD, or null to make that unit undated." } },
              required: ["position", "date"],
              description: "Changes one unit's date and leaves the others.",
            },
            opened_at: { type: "array", items: { type: ["string", "null"] }, description: "Bulk: when each open pack was opened, YYYY-MM-DD, one per open pack. null for unknown." },
            other_names: { type: ["array", "null"], items: { type: "string" }, description: "Replaces the other names." },
            brand: { type: ["string", "null"] },
            price_pence: { type: ["number", "null"] },
            notes: { type: ["string", "null"] },
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
        if (clash) throw new ToolError(`${clash.name} [id: ${clash.id}] already has that name. The user can merge the two in the pantry app.`)
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
      if (has("category")) { next.categoryId = cleared("category") ? "" : findCategory(ctx.data, c.category); said.push(next.categoryId ? "shop or aisle" : "category cleared") }
      if (has("location")) { next.location = cleared("location") ? undefined : location(c.location); said.push(next.location ? "location" : "location cleared") }
      if (Array.isArray(c.use_by)) { next.useBy = (strs(c.use_by) ?? []).map(isoDate).sort(); said.push(next.useBy.length ? "use-by dates" : "use-by dates cleared") }
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
      if (has("price_pence")) { next.price = cleared("price_pence") ? undefined : Math.round(num(c.price_pence) ?? 0); said.push(next.price !== undefined ? "price" : "price cleared") }
      if (has("notes")) { next.notes = str(c.notes); said.push(next.notes ? "notes" : "notes cleared") }
      if (next.type !== "bulk") { next.open = undefined; next.packSize = undefined; next.openedAt = undefined }
      if (!said.length) return "Nothing to change."
      await commit(ctx, { items: [next], title: `Changed ${next.name}`, detail: cap(said.join(", ")), itemIds: [i.id] })
      return `Changed. ${itemLine(ctx.data.items[i.id], ctx.data.categories)}`
    },
  },
  {
    name: "delete_item",
    title: "Delete a pantry item",
    description: "Deletes an item. Recipes that use it keep their wording but lose the link, and it comes off the shopping list. A delete: ask the user first, naming those recipes, then call with confirmed: true. It can be undone from History in the pantry app the same day.",
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
    description: "Adds a store with its aisle numbers, so the shopping list follows its layout. Needs no asking. Categories you don't number aren't sold there. To change a store that already exists, use update_store.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "\"Sainsbury's, Stoke Newington\"." },
        kind: { type: "string", description: "Optional: \"Supermarket\", \"Butcher\"." },
        place: { type: "string", description: "Optional: the street or area." },
        aisles: aislesSchema,
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
      const aisles = Object.fromEntries(Object.entries(aisleChanges(ctx.data, args.aisles)).filter(([, n]) => n !== null))
      const store: SharedStore = { id, name, kind: str(args.kind) ?? "", place: str(args.place) ?? "", aisles }
      await commitStores(ctx, { save: [store], title: `Added the store ${name}`, detail: aisleText(store, ctx.data.categories) })
      return `Added ${name} [id: ${id}]: ${aisleText(store, ctx.data.categories)}.`
    },
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
        confirmed,
      },
      required: ["store", "changes", "confirmed"],
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async run(args, ctx) {
      const x = findStore(ctx.data, args.store)!
      const c = (args.changes ?? {}) as Json
      const aisles = aisleChanges(ctx.data, c.aisles)
      const name = str(c.name) ?? x.name
      const clash = ctx.data.stores.find((y) => y.id !== x.id && y.name.toLowerCase() === name.toLowerCase())
      if (clash) throw new ToolError(`There's already a store called ${clash.name}.`)
      needConfirmed(args, `changing ${x.name}`)
      const next: SharedStore = {
        ...x, name, kind: c.kind === undefined ? x.kind : str(c.kind) ?? "", place: c.place === undefined ? x.place : str(c.place) ?? "",
        aisles: Object.fromEntries(Object.entries({ ...x.aisles, ...aisles }).filter(([, n]) => n != null)),
      }
      const moved = Object.entries(aisles).map(([id, n]) => `${categoryName(ctx.data.categories, id)} ${x.aisles[id] ?? "none"} → ${n ?? "none"}`)
      const detail = [name !== x.name ? `Renamed from ${x.name}` : "", ...moved].filter(Boolean).join("; ") || undefined
      await commitStores(ctx, { save: [next], title: `Changed ${name}`, detail })
      return `Changed ${name}.${detail ? ` ${detail}.` : ""} It can't be undone from History, so to go back, change it again.\nNow: ${aisleText(next, ctx.data.categories)}.`
    },
  },
  {
    name: "delete_store",
    title: "Delete a store",
    description: "Deletes a store and its aisle numbers. Items stay. A delete: ask the user first, then call with confirmed: true. It can't be undone from History.",
    inputSchema: { type: "object", properties: { store: { type: "string", description: "The store's id or name." }, confirmed }, required: ["store", "confirmed"] },
    annotations: { readOnlyHint: false, destructiveHint: true },
    async run(args, ctx) {
      const x = findStore(ctx.data, args.store)!
      needConfirmed(args, `deleting ${x.name}`)
      await commitStores(ctx, { remove: [x.id], title: `Deleted the store ${x.name}`, detail: aisleText(x, ctx.data.categories) })
      return `Deleted ${x.name}. It had: ${aisleText(x, ctx.data.categories)}. It can't be undone from History; add_store would recreate it.`
    },
  },
]

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
