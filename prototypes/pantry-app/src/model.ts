// The pantry app's data model and the pure functions that derive everything shown on screen.
// Items, recipes, stores and aisles share their shape with the shopping app: see
// prototypes/shared/src/pantry.ts. Rules follow prototypes/shopping-list/intent.md.
import type {
  Category, ListEntry, ListSource, Location, SharedIngredient, SharedItem, SharedRecipe, SharedStore,
} from "../../shared/src/pantry"

export type { Category, ListEntry, ListSource, Location }
export type Item = SharedItem
export type Items = Record<string, Item>
export type Recipe = SharedRecipe
export type Ingredient = SharedIngredient
export type Store = SharedStore

export type Who = "you" | "claude" | "phone"

/** What an item or recipe looked like before a change. null means it didn't exist. */
export type Snapshot = {
  items?: Record<string, Item | null>
  recipes?: Record<string, Recipe | null>
  /** Categories and stores before the change, when they changed (removing a category). */
  categories?: Category[]
  stores?: Store[]
}

export type HistoryEntry = {
  id: string
  at: string
  who: Who
  title: string
  detail?: string
  itemIds?: string[]
  recipeId?: string
  /** Puts things back the way they were. Only today's changes can be undone. */
  undo?: Snapshot
  undone?: boolean
  /** Consecutive changes with the same key (tapping a stepper) merge into one entry. */
  key?: string
}

/** An item that changed here and on the phone since the phone's last sync. */
export type Conflict = {
  itemId: string
  here: number
  hereNote: string
  phone: number
  phoneNote: string
}

export type Db = {
  categories: Category[]
  stores: Store[]
  recipes: Recipe[]
  history: HistoryEntry[]
  conflicts: Conflict[]
  signedIn: boolean
  email: string
  defaultStoreId: string
  claudeConnected: boolean
  /** The items as this app last saw them. A difference on load means the phone synced. */
  seenItems: Items
  /** The items as they were at the last sync with Supabase. Undefined until the first sync. */
  syncedItems?: Items
  /** The categories as they were at the last sync with Supabase. */
  syncedCategories?: Category[]
  /** The stores, with their aisle numbers, as they were at the last sync with Supabase. */
  syncedStores?: Store[]
  /** The recipes as they were at the last sync with Supabase. */
  syncedRecipes?: Recipe[]
  /** The History entries as they were at the last sync, by id: a fingerprint of each. */
  syncedHistory?: Record<string, string>
  /** When this computer last synced with Supabase. */
  syncedAt?: string
}

export const locations: { value: Location; label: string }[] = [
  { value: "fridge", label: "Fridge" },
  { value: "freezer", label: "Freezer" },
  { value: "cupboard", label: "Cupboard" },
  { value: "household", label: "Household" },
]
export const locationLabel = (l?: Location) => locations.find((x) => x.value === l)?.label ?? "No location"

// ---------- stock ----------

export const isStaple = (i: Item) => i.target > 0
export const isBulk = (i: Item) => i.type === "bulk"
/** Each unit has its own use-by date when you keep more than one. */
export const perUnitDates = (i: Item) => i.target > 1

/** Whole packs that count towards the minimum. An open pack doesn't, unless the item says it does. */
export const fullOf = (i: Item, total = i.inStock) => (isBulk(i) && !i.openCounts ? Math.max(0, total - (i.open ?? 0)) : total)
/** How many a Staple is short of its minimum. */
export const shortfall = (i: Item) => Math.max(0, i.target - fullOf(i))
export const entryTotal = (i: Item) => (i.entries ?? []).reduce((n, e) => n + e.qty, 0)
/** How many to buy: a Staple's shortfall, or what's on the list for it, whichever is more. */
export const needOf = (i: Item) => Math.max(shortfall(i), entryTotal(i))

export type Stock = "out" | "low" | null
/** Low means half the minimum or fewer. Between half and the minimum it's below minimum, but not Low. */
export const LOW_AT = 0.5
/** Only Staples are Out or Low. */
export const stockOf = (i: Item): Stock => (!isStaple(i) ? null : i.inStock <= 0 ? "out" : fullOf(i) <= i.target * LOW_AT ? "low" : null)

export function unitText(i: Item, n: number) {
  if (!i.unit) return String(n)
  return `${n} ${n === 1 ? i.unit[0] : i.unit[1]}`
}
export const unitWord = (i: Item, n: number) => (i.unit ? (n === 1 ? i.unit[0] : i.unit[1]) : "")

const singular = (name: string) => name.replace(/oes$/i, "o").replace(/([^s])s$/i, "$1")
/** "1 lemon", "2 eggs", "1 bottle of whole milk". */
export function amountOf(i: Item, n: number) {
  if (i.unit) return `${unitText(i, n)} of ${lower(i.name)}`
  return `${n} ${lower(n === 1 ? singular(i.name) : i.name)}`
}

/** What you have, the way you'd say it: "2 bags · 1 open", "1 bag · open". */
export function haveText(i: Item, sep = " · ") {
  if (i.inStock === 0 && !i.unit) return "0"
  const base = unitText(i, i.inStock)
  if (!isBulk(i) || !i.open) return base
  return i.inStock === 1 ? `${base}${sep}open` : `${base}${sep}${i.open} open`
}

/** "5 units in stock", "2 bags in stock · 1 open", "none in stock". For labels; sentences use haveText. */
export function inStockText(i: Item, sep = " · ") {
  if (i.inStock === 0) return "none in stock"
  const base = `${unitText(i, i.inStock)} in stock`
  if (!isBulk(i) || !i.open) return base
  return i.inStock === 1 ? `${base}${sep}open` : `${base}${sep}${i.open} open`
}

/** Keeps use-by dates and open packs in step with the stock. Dates are soonest first. */
export function normalise(i: Item): Item {
  const open = isBulk(i) ? Math.min(i.open ?? 0, i.inStock) : undefined
  // Things that never go off keep no dates at all.
  const want = i.noExpiry ? 0 : perUnitDates(i) || isBulk(i) ? i.inStock : Math.min(1, i.inStock)
  const dates = i.noExpiry ? [] : [...(i.useBy ?? [])].slice(0, want)
  while (dates.length < want) dates.push(null)
  const opened = [...(i.openedAt ?? [])].slice(0, open ?? 0)
  while (opened.length < (open ?? 0)) opened.push(null)
  // New (made from a recipe, not bought yet) until some arrives.
  return { ...i, open, useBy: dates, openedAt: isBulk(i) ? opened : undefined, review: i.review && i.inStock <= 0 ? true : undefined }
}

/** Sets stock. Using takes the soonest date first; buying adds an undated unit at the end. */
export function withStock(i: Item, n: number): Item {
  const next = Math.max(0, n)
  const dates = [...(i.useBy ?? [])]
  if (next < i.inStock) dates.splice(0, Math.min(dates.length, i.inStock - next))
  let open = i.open ?? 0
  if (isBulk(i) && next < i.inStock) open = Math.max(0, open - (i.inStock - next))
  return normalise({ ...i, inStock: next, useBy: dates, open: isBulk(i) ? open : undefined, openedAt: i.openedAt?.slice(i.openedAt.length - open) })
}

/** Bought more: list entries are settled by what came in, oldest first. */
export function settle(entries: ListEntry[] | undefined, bought: number): ListEntry[] | undefined {
  if (!entries?.length || bought <= 0) return entries
  let left = bought
  const out: ListEntry[] = []
  for (const e of entries) {
    if (left >= e.qty) left -= e.qty
    else {
      out.push({ ...e, qty: e.qty - left })
      left = 0
    }
  }
  return out
}

// ---------- dates ----------

const DAY = 86_400_000
const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
export const daysUntil = (iso: string) => Math.round((startOf(new Date(iso)) - startOf(new Date())) / DAY)
export const todayIso = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10)

/** "Today", "Tomorrow", "17 Nov", or "Mar 2027" when it's months away. */
export function dateText(iso: string | null | undefined) {
  if (!iso) return "–"
  const n = daysUntil(iso)
  if (n === 0) return "Today"
  if (n === 1) return "Tomorrow"
  const d = new Date(iso)
  if (n > 120 || n < -300) return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}
export function inDaysText(iso: string | null | undefined) {
  if (!iso) return ""
  const n = daysUntil(iso)
  if (n < 0) return `${plural(-n, "day")} ago`
  if (n === 0) return "Today"
  if (n === 1) return "Tomorrow"
  // Far-off dates don't need a countdown.
  return n > 30 ? "" : `In ${plural(n, "day")}`
}
/** The soonest use-by date for something you have. */
export const soonest = (i: Item) => (i.inStock > 0 && !i.noExpiry ? (i.useBy ?? []).find((d): d is string => !!d) ?? null : null)

/** "Just now", "12 min ago", "Today, 09:14", "Yesterday, 11:05", "Thu 12 Nov". */
export function whenText(iso: string) {
  const d = new Date(iso)
  const mins = Math.round((Date.now() - d.getTime()) / 60_000)
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  if (mins >= 0 && mins < 1) return "Just now"
  if (mins >= 0 && mins < 60) return `${mins} min ago`
  const days = Math.round((startOf(new Date()) - startOf(d)) / DAY)
  if (days === 0) return `Today, ${time}`
  if (days === 1) return `Yesterday, ${time}`
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
}
export const isToday = (iso: string) => startOf(new Date(iso)) === startOf(new Date())
export const timeText = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })

// ---------- text ----------

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
export const money = (pence: number) => `£${(pence / 100).toFixed(2)}`
/** "a", "a and b", "a, b and c". */
export function nameList(names: string[]) {
  if (names.length <= 1) return names.join("")
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
}
export const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Why a Staple is where it is, as a sentence for the item panel. */
export function stockSentence(i: Item) {
  const need = needOf(i)
  const listed = need > 0 ? `so ${need} ${need === 1 ? "is" : "are"} on the shopping list.` : "so nothing's on the shopping list."
  if (!isStaple(i)) {
    const e = entryTotal(i)
    return e ? `Not a Staple. ${e} on the shopping list.` : "Not a Staple, so it only goes on the list when you add it."
  }
  if (isBulk(i) && i.open && !i.openCounts) {
    return `${cap(haveText(i, ", "))}. An open ${i.unit?.[0] ?? "pack"} counts as less than a full one, ${listed}`
  }
  const s = shortfall(i)
  if (s === 0) return `At or above its minimum, ${listed}`
  return `${s} below minimum, ${listed}`
}

// ---------- matching ----------

const norm = (s: string) => s.toLowerCase().trim().replace(/(es|s)$/, "")
export const namesOf = (i: Item) => [i.name, ...(i.otherNames ?? [])]
export const matchesName = (i: Item, q: string) => namesOf(i).some((n) => norm(n) === norm(q))
export const containsText = (s: string, q: string) => s.toLowerCase().includes(q.trim().toLowerCase())

/** Edit distance, for "Did you mean". */
export function distance(a: string, b: string) {
  const m = a.length
  const n = b.length
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 1; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[m][n]
}

// ---------- shopping list ----------

export type Reason =
  | { kind: "staple"; stock: Stock }
  | { kind: "recipe"; recipe: string }
  | { kind: "claude"; at?: string }
  | { kind: "hand" }

export type ListRow = { item: Item; qty: number; reasons: Reason[]; group: "staples" | "recipes" | "added" }

export function listRows(items: Items): ListRow[] {
  return Object.values(items)
    .filter((i) => needOf(i) > 0)
    .map((i) => {
      const reasons: Reason[] = []
      if (shortfall(i) > 0) reasons.push({ kind: "staple", stock: stockOf(i) })
      for (const e of i.entries ?? []) {
        if (e.source.kind === "recipe") reasons.push({ kind: "recipe", recipe: e.source.recipe })
        else if (e.source.kind === "claude") reasons.push({ kind: "claude", at: e.at })
        else reasons.push({ kind: "hand" })
      }
      const first = reasons[0]?.kind
      return { item: i, qty: needOf(i), reasons, group: first === "staple" ? "staples" : first === "recipe" ? "recipes" : "added" }
    })
}

export function soldAt(i: Item, store: Store) {
  const aisle = store.aisles[i.categoryId]
  if (aisle === null || aisle === undefined) return false
  return i.where.length === 0 || i.where.includes(store.id)
}

/** Categories A to Z, for every list and menu that isn't in walking order. */
export const categoriesAtoZ = (categories: Category[]) => [...categories].sort((a, b) => a.name.localeCompare(b.name))

/** A store's aisles in walking order. Categories with no number go at the end, A to Z. */
export function aisleOrder(store: Store, categories: Category[]) {
  return categoriesAtoZ(categories).sort((a, b) => (store.aisles[a.id] ?? 999) - (store.aisles[b.id] ?? 999))
}
export const numberedAisles = (store: Store) => new Set(Object.values(store.aisles).filter((n) => n !== null)).size

// ---------- recipes ----------

/** have: enough. some: an open pack, maybe not enough. listed: on the list. short: neither. little: more than your packs hold. */
export type IngredientStatus = "have" | "some" | "listed" | "short" | "little" | "unlinked"

export type IngredientRow = {
  ing: Ingredient
  item: Item | undefined
  status: IngredientStatus
  /** Counted: how many the recipe needs at these servings. */
  need: number
  /** Short by this many (counted). */
  missing: number
  /** Bulk with a pack size: how much is needed and the most your packs could hold. */
  required?: number
  capacity?: number
  text: string
}

/** Scales the first number in the wording: "200 g linguine" × 2 → "400 g linguine". */
export function scaleText(text: string, factor: number) {
  if (factor === 1) return text
  const fractions: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 }
  return text.replace(/(\d+(?:\.\d+)?)?\s?([½¼¾⅓⅔])?/, (m, num, frac) => {
    if (!num && !frac) return m
    const value = (num ? parseFloat(num) : 0) + (frac ? fractions[frac] : 0)
    const scaled = Math.round(value * factor * 100) / 100
    const whole = Math.floor(scaled)
    const rest = scaled - whole
    const fracOut = Object.entries(fractions).find(([, v]) => Math.abs(v - rest) < 0.02)?.[0]
    const out = rest < 0.02 ? String(whole) : fracOut ? `${whole || ""}${fracOut}` : String(scaled)
    return m.endsWith(" ") ? `${out} ` : out
  })
    // 1200 g reads better as 1.2 kg.
    .replace(/^(\d+(?:\.\d+)?) (g|ml)\b/, (m, n, unit) => (parseFloat(n) >= 1000 ? `${parseFloat(n) / 1000} ${unit === "g" ? "kg" : "l"}` : m))
    // "1 jar" scaled up becomes "4 jars", not "4 jar".
    .replace(/^(\d+(?:\.\d+)?|[½¼¾⅓⅔]) (jar|tin|clove|bulb|bunch|pack|bag|slice|fillet|lemon|chilli|pepper|aubergine|box|bottle|spring onion|egg)\b(?!s)/, (m, n, word) =>
      parseFloat(n) > 1 ? `${n} ${/(ch|x)$/.test(word) ? `${word}es` : `${word}s`}` : m)
}

export function measureText(n: number, measure: "g" | "ml") {
  if (n >= 1000) return `${Math.round(n / 100) / 10} ${measure === "g" ? "kg" : "l"}`
  return `${n} ${measure}`
}

/**
 * Plain water: "250ml water", "boiling water", "a splash of water", "water, to cover". Always to hand, so it never
 * needs a pantry item and never goes on the list. Kelp, coconut, rose and sparkling water are real ingredients.
 */
export function isWater(text: string) {
  const name = text.toLowerCase().split(/[,(]| to | for | as | or /)[0].trim()
  return /^(?:about |approx\.? |around |roughly )?(?:(?:a |an )?(?:splash|little|dash|drop|drizzle|glass|cup|jug|bit)(?:s)? of |some |extra )?(?:[\d½¼¾⅓⅔.\/\s-]+\s*(?:ml|l|litres?|liters?|cups?|tbsp|tsp|tablespoons?|teaspoons?|pints?|fl ?oz|g)?\.?\s+(?:of\s+)?)?(?:(?:cold|warm|hot|boiling|just-boiled|freshly boiled|boiled|tap|lukewarm|tepid|ice|iced|ice-cold|filtered|fresh)\s+)*water$/.test(name)
}

export function ingredientRow(ing: Ingredient, items: Items, factor = 1): IngredientRow {
  const item = ing.itemId ? items[ing.itemId] : undefined
  const text = scaleText(ing.text, factor)
  const need = ing.partial ? 1 : Math.max(1, Math.ceil(ing.need * factor))
  if (!item) return { ing, item, status: isWater(ing.text) ? "have" : "unlinked", need, missing: 0, text }
  if (isBulk(item) && item.packSize && ing.uses) {
    const required = Math.round(ing.uses * factor)
    const capacity = item.inStock * item.packSize.amount
    if (item.inStock > 0 && required > capacity) return { ing, item, status: "little", need, missing: 0, required, capacity, text }
  }
  if (isBulk(item) || ing.partial) {
    if (item.inStock > 0) return { ing, item, status: isBulk(item) && item.open ? "some" : "have", need, missing: 0, text }
  } else if (item.inStock >= need) return { ing, item, status: "have", need, missing: 0, text }
  const missing = isBulk(item) || ing.partial ? 1 : need - item.inStock
  return { ing, item, status: needOf(item) > 0 ? "listed" : "short", need, missing, text }
}

export type RecipeInfo = {
  rows: IngredientRow[]
  /** Not in stock (whether or not it's on the list), packs that are too small, and ingredients with no pantry item. */
  short: IngredientRow[]
  canCook: boolean
  /** The ingredient in stock that goes off first, if within two weeks. */
  usesUp: { item: Item; date: string } | null
  have: number
}

export function recipeInfo(recipe: Recipe, items: Items, factor = 1): RecipeInfo {
  const rows = recipe.ingredients.map((ing) => ingredientRow(ing, items, factor))
  // An ingredient with no pantry item is short too: you don't have it, and the app can't add it to the list.
  const short = rows.filter((r) => r.status === "short" || r.status === "listed" || r.status === "little" || r.status === "unlinked")
  let usesUp: RecipeInfo["usesUp"] = null
  for (const r of rows) {
    if (!r.item || r.status === "short" || r.status === "listed") continue
    const d = soonest(r.item)
    if (d && daysUntil(d) <= 14 && (!usesUp || d < usesUp.date)) usesUp = { item: r.item, date: d }
  }
  const have = rows.filter((r) => r.status === "have" || r.status === "some").length
  return { rows, short, canCook: short.length === 0, usesUp, have }
}

/** How many of this item the list holds for this recipe. */
export function recipeQty(row: IngredientRow, recipe: Recipe) {
  if (!row.item) return 0
  return (row.item.entries ?? []).filter((e) => e.source.kind === "recipe" && e.source.recipe === recipe.name).reduce((n, e) => n + e.qty, 0)
}

/** On the list: this recipe's entry for the item, or anything else that has it listed. */
export const isListedItem = (row: IngredientRow, recipe: Recipe) => !!row.item && (recipeQty(row, recipe) > 0 || needOf(row.item) > 0)

/**
 * Positions of the ingredients still to sort out: not linked to a pantry item, or short and not on the shopping list.
 * The same ones "Add missing to list" adds.
 */
export const toSortOut = (info: RecipeInfo, recipe: Recipe) =>
  info.rows.flatMap((r, k) => (r.status === "unlinked" || ((r.status === "short" || r.status === "little") && !isListedItem(r, recipe)) ? [k] : []))

export const shortNames = (info: RecipeInfo, max = 3) => {
  const names = info.short.map((r) => (r.item ? r.item.name : r.text))
  const shown = names.slice(0, max).map((n, i) => (i === 0 ? n : lower(n)))
  return names.length > max ? `${shown.join(", ")} +${names.length - max}` : shown.join(", ")
}

export const usesUpText = (u: RecipeInfo["usesUp"]) =>
  u ? `Uses ${lower(u.item.name)}, use by ${daysUntil(u.date) <= 1 ? lower(dateText(u.date)) : dateText(u.date)}` : null

/** Recipes that use what goes off soonest come first. */
export function byUseFirst(a: { info: RecipeInfo; recipe: Recipe }, b: { info: RecipeInfo; recipe: Recipe }) {
  const da = a.info.usesUp?.date ?? "9999"
  const db = b.info.usesUp?.date ?? "9999"
  return da < db ? -1 : da > db ? 1 : a.recipe.name.localeCompare(b.recipe.name)
}

export const recipesUsing = (recipes: Recipe[], itemId: string) => recipes.filter((r) => r.ingredients.some((i) => i.itemId === itemId))

export const minutesBand = (m: number) => (m <= 0 ? "unknown" : m < 20 ? "under20" : m <= 40 ? "20to40" : "over40")
export const recipeTags = (r: Recipe) => [...(r.tags ?? []), ...(r.meal ? [r.meal] : [])]

// ---------- ingredients that aren't in the pantry ----------

const UNIT_WORDS = "g|kg|ml|l|litres?|tsp|tbsp|teaspoons?|tablespoons?|cups?|handfuls?|bunch(?:es)?|pinch(?:es)?|tins?|cans?|packs?|packets?|bags?|jars?|cloves?|slices?|sprigs?|large|small|medium|big|a|an|some|of"

/**
 * A name for a pantry item from the recipe's wording: "15g Parmesan, finely grated, plus extra" becomes
 * "Parmesan". A guess, for the shopping list; it can be changed when the item is reviewed.
 */
export function ingredientName(text: string) {
  const base = text.split(",")[0].replace(/\(.*?\)/g, " ").replace(/\b(plus|to serve|to taste|optional)\b.*$/i, " ")
  let t = base.trim()
  for (;;) {
    const next = t.replace(new RegExp(`^(?:[\\d½¼¾⅓⅔./-]+\\s*)?(?:${UNIT_WORDS})\\b\\s*`, "i"), "").replace(/^[\d½¼¾⅓⅔./-]+\s*/, "")
    if (next === t) break
    t = next
  }
  return cap(t.trim() || text.trim())
}

/** Category and location for a new item, taken from the pantry item whose name shares the most words with it. */
export function guessPlace(name: string, items: Items): { categoryId: string; location?: Item["location"] } {
  const words = lower(name).split(/\s+/).filter((w) => w.length > 2)
  let best: Item | undefined
  let score = 0
  for (const i of Object.values(items)) {
    if (i.oneOff || !i.categoryId) continue
    const theirs = lower(i.name).split(/\s+/)
    const n = words.filter((w) => theirs.includes(w)).length
    if (n > score) (score = n), (best = i)
  }
  return best ? { categoryId: best.categoryId, location: best.location } : { categoryId: "" }
}
