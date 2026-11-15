// The one seed both prototypes start from, and the localStorage keys they share.
// The pantry app (desktop) and the shopping app (phone) run on the same site, so a change in one
// shows in the other: pantry edits reach the phone at its next sync, and a phone sync lands here.
//
// Shapes match prototypes/shopping-list/src/model.ts. The pantry-only fields (location, use-by
// dates, price, brand, other names, pack size) are optional, so the phone carries them through
// a sync without knowing about them.

/** Pantry items, shared. The phone reads and writes this at sync. */
export const ITEMS_KEY = "hm-pantry:items:v2"
/** Stores, aisles (categories), recipes and history. Owned by the pantry app; the phone pulls at sync. */
export const DB_KEY = "hm-pantry:db:v3"
/** The phone's own state. The pantry app reads its last sync time from here. */
export const PHONE_KEY = "hm-shopping-list:v5"

export type Location = "fridge" | "freezer" | "cupboard"
export type Category = { id: string; name: string }
export type ListSource = { kind: "hand" } | { kind: "claude" } | { kind: "recipe"; recipe: string }
export type ListEntry = { source: ListSource; qty: number; at?: string }

export type SharedItem = {
  id: string
  name: string
  type: "counted" | "bulk"
  /** Minimum to keep. Above 0 makes it a Staple. */
  target: number
  /** Counted: how many. Bulk: whole packs, including open ones. */
  inStock: number
  /** Bulk: how many of the packs are open. */
  open?: number
  unit?: [string, string]
  notes?: string
  /** Shop or aisle. */
  categoryId: string
  /** Store ids that sell it. Empty means any store with the aisle. */
  where: string[]
  entries?: ListEntry[]
  editedAt?: string
  /** When the item was first added. Read from Supabase (created_at); never written back. */
  addedAt?: string

  // ----- pantry app only -----
  location?: Location
  otherNames?: string[]
  /** Bulk: what one pack holds, e.g. 1000 g. */
  packSize?: { amount: number; measure: "g" | "ml" }
  /** Pence. */
  price?: number
  /** Blank means any brand. */
  brand?: string
  /** One ISO date per unit or pack in stock, soonest first. One date only when the minimum is 1 or less. */
  useBy?: (string | null)[]
  /** Bulk: when each open pack was opened, matching the first `open` entries of useBy. */
  openedAt?: (string | null)[]
  /** A one-off on the list: not a pantry item, stock isn't tracked. */
  oneOff?: boolean
  /**
   * New: made from a recipe ingredient the pantry didn't have, and not bought yet. It's on the shopping
   * list and shown as New in the pantry app until some arrives (stock above 0).
   */
  review?: boolean
  /** How often it's recorded as used. Orders the Home tiles. */
  uses?: number
}

export type SharedIngredient = {
  /** The recipe's own wording, at the recipe's own servings. */
  text: string
  /** Pantry item. "" when the item was deleted: the wording stays, the link goes. */
  itemId: string
  /** Counted items: how many it needs. */
  need: number
  /** How many to put on the list when it's short. */
  buy: number
  /** Uses part of a unit or pack (a clove of garlic, some milk): Cooked it shows "Finished it" instead of a count. */
  partial?: boolean
  /** Bulk with a pack size: how much it uses, in the pack's measure. Drives the pack-size warning. */
  uses?: number
}

export type SharedRecipe = {
  id: string
  name: string
  minutes: number
  serves: number
  wantToCook: boolean
  soon?: string
  ingredients: SharedIngredient[]
  method: string[]
  // ----- pantry app only -----
  prep?: number
  cook?: number
  tags?: string[]
  meal?: "Breakfast" | "Lunch" | "Dinner" | "Baking"
  source?: string
  notes?: string
  lastCooked?: string | null
  addedBy?: "claude" | "you"
  addedAt?: string
  /** When the recipe was last changed (not when it was cooked or marked want-to-cook). */
  editedAt?: string
}

export type SharedStore = {
  id: string
  name: string
  /** Aisle number per category. null = not sold here. */
  aisles: Record<string, number | null>
  kind?: string
  place?: string
}

// ---------- dates ----------

const DAY = 86_400_000
/** Midnight today plus n days, as an ISO date. Keeps the seed fresh whatever day the demo runs. */
export function day(n: number) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  return new Date(d.getTime() + n * DAY).toISOString().slice(0, 10)
}
/** Today (or n days ago) at a time, as an ISO timestamp. */
export function at(h: number, m: number, daysAgo = 0) {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return new Date(d.getTime() - daysAgo * DAY).toISOString()
}

// ---------- seed ----------

export const seedCategories: Category[] = [
  { id: "fruit-and-veg", name: "Fruit & veg" },
  { id: "meat-and-fish", name: "Meat & fish" },
  { id: "deli-and-cured-meats", name: "Deli & cured meats" },
  { id: "dairy-and-chilled", name: "Dairy & chilled" },
  { id: "frozen", name: "Frozen" },
  { id: "tins-and-jars", name: "Tins & jars" },
  { id: "grains-and-pulses", name: "Grains & pulses" },
  { id: "bread-and-crackers", name: "Bread & crackers" },
  { id: "baking", name: "Baking" },
  { id: "herbs-and-spices", name: "Herbs & spices" },
  { id: "stock-and-seasonings", name: "Stock & seasonings" },
  { id: "sauces-and-condiments", name: "Sauces & condiments" },
  { id: "oils-and-vinegar", name: "Oils & vinegar" },
  { id: "nuts-and-dried-fruit", name: "Nuts & dried fruit" },
  { id: "tea-and-coffee", name: "Tea & coffee" },
  { id: "long-life-milk", name: "Long-life milk" },
  { id: "snacks-and-treats", name: "Snacks & treats" },
  { id: "bathroom-and-kitchen", name: "Bathroom & kitchen" },
]

export const seedStores: SharedStore[] = [
  {
    id: "sainsburys", name: "Sainsbury's, Stoke Newington", kind: "Supermarket", place: "Stoke Newington",
    aisles: { "fruit-and-veg": 1, "meat-and-fish": 5, "deli-and-cured-meats": 4, "dairy-and-chilled": 3, frozen: 14, "tins-and-jars": 9, "grains-and-pulses": 8, "bread-and-crackers": 2, baking: 7, "herbs-and-spices": 11, "stock-and-seasonings": 11, "sauces-and-condiments": 10, "oils-and-vinegar": 12, "nuts-and-dried-fruit": 7, "tea-and-coffee": 10, "long-life-milk": 3, "snacks-and-treats": 2, "bathroom-and-kitchen": null },
  },
  {
    id: "tesco", name: "Tesco Express", kind: "Supermarket", place: "Church Street",
    aisles: { "fruit-and-veg": 1, "meat-and-fish": 4, "deli-and-cured-meats": 3, "dairy-and-chilled": 3, frozen: 7, "tins-and-jars": 6, "grains-and-pulses": 5, "bread-and-crackers": 2, baking: 5, "herbs-and-spices": 6, "stock-and-seasonings": 6, "sauces-and-condiments": 6, "oils-and-vinegar": 6, "nuts-and-dried-fruit": 5, "tea-and-coffee": 6, "long-life-milk": 3, "snacks-and-treats": 2, "bathroom-and-kitchen": 8 },
  },
  {
    id: "greengrocer", name: "Greengrocer", kind: "Greengrocer", place: "Church Street",
    aisles: { "fruit-and-veg": 1, "meat-and-fish": null, "deli-and-cured-meats": null, "dairy-and-chilled": null, frozen: null, "tins-and-jars": null, "grains-and-pulses": null, "bread-and-crackers": null, baking: null, "herbs-and-spices": null, "stock-and-seasonings": null, "sauces-and-condiments": null, "oils-and-vinegar": null, "nuts-and-dried-fruit": null, "tea-and-coffee": null, "long-life-milk": null, "snacks-and-treats": null, "bathroom-and-kitchen": null },
  },
  {
    id: "butcher", name: "Butcher", kind: "Butcher", place: "Church Street",
    aisles: { "fruit-and-veg": null, "meat-and-fish": 1, "deli-and-cured-meats": 2, "dairy-and-chilled": null, frozen: null, "tins-and-jars": null, "grains-and-pulses": null, "bread-and-crackers": null, baking: null, "herbs-and-spices": null, "stock-and-seasonings": null, "sauces-and-condiments": null, "oils-and-vinegar": null, "nuts-and-dried-fruit": null, "tea-and-coffee": null, "long-life-milk": null, "snacks-and-treats": null, "bathroom-and-kitchen": null },
  },
  {
    id: "fishmonger", name: "Fishmonger", kind: "Fishmonger", place: "Stoke Newington High St",
    aisles: { "fruit-and-veg": null, "meat-and-fish": 1, "deli-and-cured-meats": null, "dairy-and-chilled": null, frozen: null, "tins-and-jars": null, "grains-and-pulses": null, "bread-and-crackers": null, baking: null, "herbs-and-spices": null, "stock-and-seasonings": null, "sauces-and-condiments": null, "oils-and-vinegar": null, "nuts-and-dried-fruit": null, "tea-and-coffee": null, "long-life-milk": null, "snacks-and-treats": null, "bathroom-and-kitchen": null },
  },
]

/**
 * The pantry's items. Empty until `loadSeedFromSupabase` (supabase-seed.ts) fills it, which both
 * prototypes await before they render. The demo items that used to live here are gone.
 */
export const seedItems: SharedItem[] = []

/** The pantry now: the items loaded from Supabase, by id. */
export function seedPantryItems(): Record<string, SharedItem> {
  return Object.fromEntries(structuredClone(seedItems).map((i) => [i.id, i]))
}

/** The recipes. Empty until `loadSeedFromSupabase` fills it; the demo recipes are gone. */
export const seedRecipes: SharedRecipe[] = []

/** "25 min", or "No time" for a recipe whose page didn't say (stored as 0). */
export const minutesText = (m: number) => (m > 0 ? `${m} min` : "No time")

/** Normalise a store's aisles so every category has an entry (null when not sold there). */
export function fillAisles(store: SharedStore, categories: Category[]): SharedStore {
  return { ...store, aisles: Object.fromEntries(categories.map((c) => [c.id, store.aisles[c.id] ?? null])) }
}

// ---------- shared storage ----------

export type SharedDb = {
  categories: Category[]
  stores: SharedStore[]
  recipes: SharedRecipe[]
}

export function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked: ignore in the mock */
  }
}
