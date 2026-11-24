// Everything the phone keeps. It's saved on the phone (AsyncStorage) after every change, so the app opens and
// works with no signal, and it's synced with Supabase by itself whenever there's signal (src/data/sync.ts).
//
// The shapes are the pantry's own (prototypes/shared/src/pantry.ts), so the phone, Collca on the web and the
// Claude connection all read and write the same items, recipes, categories and stores.
import type { Category, HistoryEntry, Item, Items, ListEntry, Recipe, Store } from "../../../prototypes/pantry-app/src/model"
import type { ListFilter } from "../logic/list"

export type { Category, HistoryEntry, Item, Items, ListEntry, Recipe, Store }

export type Theme = "light" | "dark" | "system"

/** One row of the shop in progress: how many were needed when it joined the list, and how many you've got. */
export type ShopRow = {
  need: number
  got: number
  /** The item's list entries before anything was ticked, so "Not got it" can put them back. */
  entries?: ListEntry[]
  /** Whether it was New before anything was ticked. */
  review?: boolean
  /** Skipped this shop: off the list until you change store or start a new list. Still needs buying. */
  skipped?: boolean
}

/**
 * The shop in progress. Ticking adds stock straight away (and it syncs), so a ticked item would drop off a
 * plain shopping list. The shop remembers what was on the list, so ticked things stay on screen, struck
 * through, until you start a new list.
 */
export type Shop = { startedAt: string; rows: Record<string, ShopRow> }

/** An item changed on this phone and somewhere else, in the same field, since the last sync. */
export type Conflict = {
  itemId: string
  /** The fields that clash, e.g. ["inStock"]. */
  fields: string[]
  /** The other side's version, as Supabase has it. */
  remote: Item
  /** When the other side changed it. */
  remoteAt?: string
}

/** What was in Supabase at the last sync. A difference from it is a change made on this phone. */
export type Synced = { items: Items; categories: Category[]; stores: Store[]; recipes: Recipe[] }

export type PhoneState = {
  v: 1
  /** The signed-in account this pantry belongs to. */
  owner: { id: string; email: string } | null
  items: Items
  categories: Category[]
  stores: Store[]
  recipes: Recipe[]
  /** Null until the first sync after signing in. */
  synced: Synced | null
  /** History entries for changes made here, waiting to go to Collca's History. */
  outbox: HistoryEntry[]
  conflicts: Conflict[]
  storeId: string
  /** Which aisle the list is showing: an index into the store's aisles, or "all" for A to Z. */
  aisle: number | "all"
  shop: Shop | null
  /** The list filters. Kept through a shop; cleared when a new list starts. */
  filter?: ListFilter
  /** The pantry's "In stock only" switch turned off: show everything. Kept on this phone, not synced. */
  pantryAll?: boolean
  theme: Theme
  syncedAt?: string
}

export const emptyState = (): PhoneState => ({
  v: 1,
  owner: null,
  items: {},
  categories: [],
  stores: [],
  recipes: [],
  synced: null,
  outbox: [],
  conflicts: [],
  storeId: "",
  aisle: 0,
  shop: null,
  theme: "system",
})
