// App state: the pantry items (shared with the shopping app) and everything else the pantry app
// keeps (stores, aisles, recipes, history). Every change goes through `commit`, which records a
// History entry with a snapshot so any change made today can be undone.
import * as React from "react"
import { toast } from "sonner"
import {
  at, DB_KEY, fillAisles, ITEMS_KEY, PHONE_KEY, readJson, seedCategories, seedPantryItems, seedRecipes, seedStores, writeJson,
} from "../../shared/src/pantry"
import {
  fingerprint, historyFingerprint, pendingCategoryIds, pendingHistoryIds, pendingIds, pendingRecipeIds, pendingStoreIds, recipeFingerprint, storeFingerprint, syncCategories, syncItems,
  syncHistory, syncRecipes, syncStores,
} from "./sync"
import { deleteCategories } from "../../shared/src/pantry-remote"
import { href } from "./router"
import type { CategoryColour, CategoryIcon } from "../../shared/src/category-look"
import {
  amountOf, cap, haveText, unitText, nameList, isBulk, isToday, lower, needOf, normalise, openUnit, plural, settle, withStock,
  type Db, type HistoryEntry, type Item, type Items, type Recipe, type Snapshot, type Store, type Who,
} from "./model"

type S = { db: Db; items: Items }

const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const byId = <T extends { id: string }>(list: T[]) => Object.fromEntries(list.map((x) => [x.id, x]))

// ---------- seed ----------

// No demo history: it described demo items that no longer exist.
const seedHistory = (): HistoryEntry[] => []

function seedDb(items: Items): Db {
  return {
    categories: seedCategories,
    stores: seedStores.map((s) => fillAisles(s, seedCategories)),
    recipes: structuredClone(seedRecipes),
    history: seedHistory(),
    conflicts: [],
    signedIn: false,
    email: "you@example.com",
    defaultStoreId: "sainsburys",
    claudeConnected: true,
    seenItems: items,
  }
}

const normaliseAll = (items: Items) => Object.fromEntries(Object.entries(items).map(([id, i]) => [id, normalise(i)]))

// ---------- undo and revert ----------

/** The items and recipes a snapshot names, as they are now (null for ones that don't exist), plus the
 *  categories and stores when it has them. Saved before an undo so Revert can reverse it. */
function snapshotOf(s: S, snap: Snapshot): Snapshot {
  const out: Snapshot = {}
  if (snap.items) out.items = Object.fromEntries(Object.keys(snap.items).map((id) => [id, s.items[id] ?? null]))
  if (snap.recipes) out.recipes = Object.fromEntries(Object.keys(snap.recipes).map((id) => [id, s.db.recipes.find((r) => r.id === id) ?? null]))
  if (snap.categories) {
    out.categories = s.db.categories
    out.stores = s.db.stores
  }
  return out
}

/** Puts a snapshot's items and recipes back: null removes one, anything else replaces or restores it. */
function putBack(s: S, snap: Snapshot): { items: Items; recipes: Recipe[] } {
  const items = { ...s.items }
  for (const [id, before] of Object.entries(snap.items ?? {})) {
    if (before) items[id] = before
    else delete items[id]
  }
  let recipes = [...s.db.recipes]
  for (const [id, before] of Object.entries(snap.recipes ?? {})) {
    const index = recipes.findIndex((r) => r.id === id)
    if (!before) recipes = recipes.filter((r) => r.id !== id)
    else if (index >= 0) recipes[index] = before
    else recipes.push(before)
  }
  return { items, recipes }
}

// ---------- phone syncs ----------

/** A History entry for what the phone changed, or null if nothing did. */
function phoneSyncEntry(before: Items, after: Items, when = new Date().toISOString()): HistoryEntry | null {
  const bought: string[] = []
  const changed: string[] = []
  const undo: Snapshot = { items: {} }
  for (const id of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const b = before[id]
    const a = after[id]
    if (JSON.stringify(b) === JSON.stringify(a)) continue
    undo.items![id] = b ?? null
    if (a && b && a.inStock > b.inStock) bought.push(id)
    else changed.push(id)
  }
  const ids = [...bought, ...changed]
  if (!ids.length) return null
  const names = bought.map((id) => after[id].name)
  return {
    id: uid("h"), at: when, who: "phone", title: "Synced a shop",
    detail: bought.length ? `${plural(bought.length, "item")} bought: ${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""}` : `${plural(ids.length, "change")}`,
    itemIds: ids, undo,
  }
}

function load(): S {
  const stored = readJson<Items>(ITEMS_KEY)
  const items = normaliseAll(stored ?? seedPantryItems())
  const saved = readJson<Partial<Db>>(DB_KEY)
  const db: Db = { ...seedDb(items), ...saved } as Db
  // The phone may have synced while this app was closed.
  if (saved?.seenItems && stored) {
    const entry = phoneSyncEntry(normaliseAll(saved.seenItems), items)
    if (entry) db.history = [entry, ...db.history]
  }
  return { db, items }
}

function readPhoneSync(): string {
  return readJson<{ lastSyncedAt?: string }>(PHONE_KEY)?.lastSyncedAt ?? at(10, 2)
}

// ---------- helpers ----------

/**
 * History after a sync: the merged list, except any entry added or changed here while the sync ran,
 * which stays as it is now (it isn't in the synced base, so it goes out next time).
 */
function mergeHistory(now: HistoryEntry[], synced: HistoryEntry[], started: HistoryEntry[]): HistoryEntry[] {
  const was = Object.fromEntries(started.map((h) => [h.id, historyFingerprint(h)]))
  const edited = now.filter((h) => was[h.id] !== historyFingerprint(h))
  const ids = new Set(edited.map((h) => h.id))
  return [...edited, ...synced.filter((h) => !ids.has(h.id))].sort((a, b) => b.at.localeCompare(a.at))
}

export { amountOf }

function diffSnapshot(prev: S, next: S): Snapshot {
  const items: Record<string, Item | null> = {}
  for (const id of new Set([...Object.keys(prev.items), ...Object.keys(next.items)])) {
    if (prev.items[id] !== next.items[id] && JSON.stringify(prev.items[id]) !== JSON.stringify(next.items[id])) items[id] = prev.items[id] ?? null
  }
  const recipes: Record<string, Recipe | null> = {}
  const pr = byId(prev.db.recipes)
  const nr = byId(next.db.recipes)
  for (const id of new Set([...Object.keys(pr), ...Object.keys(nr)])) {
    if (JSON.stringify(pr[id]) !== JSON.stringify(nr[id])) recipes[id] = pr[id] ?? null
  }
  const snapshot: Snapshot = { items, recipes }
  if (JSON.stringify(prev.db.categories) !== JSON.stringify(next.db.categories)) {
    snapshot.categories = prev.db.categories
    snapshot.stores = prev.db.stores
  }
  return snapshot
}

type EntryInput = { who?: Who; title: string | ((undo: Snapshot, next: S) => string); detail?: string | ((undo: Snapshot, next: S) => string); itemIds?: string[]; recipeId?: string; key?: string }

/** What changed between two versions of an item, for History. */
function itemChanges(before: Item, draft: Item) {
  const changes: string[] = []
  if (before.inStock !== draft.inStock) changes.push(`stock ${before.inStock} → ${draft.inStock}`)
  else if ((before.open ?? 0) !== (draft.open ?? 0)) changes.push(`open ${before.open ?? 0} → ${draft.open ?? 0}`)
  if (before.target !== draft.target) changes.push(`minimum ${before.target} → ${draft.target}`)
  if (before.name !== draft.name) changes.push(`renamed from ${before.name}`)
  if (before.type !== draft.type) changes.push(draft.type === "bulk" ? "now Bulk" : "now Counted")
  if (JSON.stringify(before.unit) !== JSON.stringify(draft.unit)) changes.push("unit type")
  if (JSON.stringify(before.packSize) !== JSON.stringify(draft.packSize)) changes.push("size")
  if (before.location !== draft.location) changes.push("location")
  if (before.categoryId !== draft.categoryId) changes.push("shop aisle")
  if (JSON.stringify(before.where) !== JSON.stringify(draft.where)) changes.push("store")
  if (before.price !== draft.price) changes.push("price")
  else if (!!before.priceEstimate !== !!draft.priceEstimate) changes.push(draft.priceEstimate ? "price marked as an estimate" : "price no longer an estimate")
  if (before.brand !== draft.brand) changes.push("brand")
  if (!!before.openCounts !== !!draft.openCounts) changes.push(draft.openCounts ? "open pack counts towards the minimum" : "open pack doesn't count towards the minimum")
  if (!!before.noExpiry !== !!draft.noExpiry) changes.push(draft.noExpiry ? "no use-by dates" : "use-by dates tracked again")
  else if (JSON.stringify(before.useBy) !== JSON.stringify(draft.useBy)) changes.push("use-by dates")
  if (before.useWithinWeeks !== draft.useWithinWeeks) changes.push("use within, once open")
  if (before.notes !== draft.notes) changes.push("notes")
  if (JSON.stringify(before.otherNames) !== JSON.stringify(draft.otherNames)) changes.push("other names")
  return changes
}

// ---------- the store ----------

function usePantryState() {
  const [state, setState] = React.useState<S>(load)
  const [phoneSyncedAt, setPhoneSyncedAt] = React.useState(readPhoneSync)
  const [syncing, setSyncing] = React.useState(false)
  // Why the last sync failed, or null when it went through. Shown in the header (app.tsx).
  const [syncError, setSyncError] = React.useState<string | null>(null)
  const ref = React.useRef(state)
  React.useLayoutEffect(() => {
    ref.current = state
  }, [state])

  // Persist. The items go where the phone reads them.
  React.useEffect(() => {
    writeJson(ITEMS_KEY, state.items)
    writeJson(DB_KEY, { ...state.db, seenItems: state.items })
  }, [state])

  // Another tab changed the data: the phone synced, or another pantry tab saved.
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PHONE_KEY) setPhoneSyncedAt(readPhoneSync())
      if (e.key === ITEMS_KEY && e.newValue) {
        const next = normaliseAll(JSON.parse(e.newValue) as Items)
        const fromPantryTab = JSON.stringify(readJson<Db>(DB_KEY)?.seenItems) === e.newValue
        setState((s) => {
          if (fromPantryTab) return { db: { ...s.db, ...readJson<Db>(DB_KEY) }, items: next }
          const entry = phoneSyncEntry(s.items, next)
          if (entry) toast("Your phone synced", { description: entry.detail })
          return { db: { ...s.db, history: entry ? [entry, ...s.db.history] : s.db.history }, items: next }
        })
      }
      if (e.key === DB_KEY && e.newValue) {
        const db = JSON.parse(e.newValue) as Db
        setState((s) => ({ ...s, db: { ...s.db, stores: db.stores ?? s.db.stores } }))
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  /** Applies a change and, with an entry, records it in History with an undo snapshot. Returns the entry id. */
  const commit = React.useCallback((fn: (s: S) => S, input?: EntryInput) => {
    const id = uid("h")
    setState((prev) => {
      const next = fn(prev)
      if (next === prev || !input) return next
      const snapshot = diffSnapshot(prev, next)
      const last = prev.db.history[0]
      const merge = input.key && last && last.key === input.key && !last.undone && Date.now() - new Date(last.at).getTime() < 120_000
      const undo: Snapshot = merge ? { items: { ...snapshot.items, ...last.undo?.items }, recipes: { ...snapshot.recipes, ...last.undo?.recipes } } : snapshot
      const text = (v: EntryInput["title"] | undefined) => (typeof v === "function" ? v(undo, next) : v)
      const entry: HistoryEntry = {
        id: merge ? last.id : id, at: new Date().toISOString(), who: input.who ?? "you",
        title: text(input.title)!, detail: text(input.detail), itemIds: input.itemIds, recipeId: input.recipeId, key: input.key, undo,
      }
      return { ...next, db: { ...next.db, history: [entry, ...(merge ? prev.db.history.slice(1) : prev.db.history)] } }
    })
    return id
  }, [])

  const setItems = (s: S, patch: Items): S => ({ ...s, items: { ...s.items, ...patch } })
  const setDb = (s: S, patch: Partial<Db>): S => ({ ...s, db: { ...s.db, ...patch } })
  const edit = (s: S, id: string, fn: (i: Item) => Item): S => (s.items[id] ? setItems(s, { [id]: normalise({ ...fn(s.items[id]), editedAt: new Date().toISOString() }) }) : s)
  const setRecipes = (s: S, fn: (r: Recipe[]) => Recipe[]): S => setDb(s, { recipes: fn(s.db.recipes) })

  /** A stock change from a stepper or a tile. Consecutive taps on one item merge in History. */
  const stockTitle = (id: string) => (undo: Snapshot, next: S) => {
    const before = undo.items?.[id]
    const after = next.items[id]
    if (!before || !after) return "Changed stock"
    const d = after.inStock - before.inStock
    if (d < 0 && after.inStock === 0) return `Used the last ${lower(after.name)}`
    if (d < 0) return `Used ${amountOf(after, -d)}`
    if (d > 0) return `Added ${amountOf(after, d)}`
    return `Changed stock for ${after.name}`
  }
  const stockDetail = (id: string) => (_: Snapshot, next: S) => {
    const i = next.items[id]
    if (!i) return ""
    const below = needOf(i) > 0 && i.target > 0 ? " · below minimum, on the list" : ""
    return `${cap(haveText(i))} left${below}`
  }

  const actions = {
    commit,

    // ----- stock -----
    setStock(id: string, n: number) {
      commit(
        (s) => edit(s, id, (i) => {
          const next = withStock(i, n)
          return n > i.inStock ? { ...next, entries: settle(i.entries, n - i.inStock) } : { ...next, uses: (i.uses ?? 0) + 1 }
        }),
        { title: stockTitle(id), detail: stockDetail(id), itemIds: [id], key: `stock:${id}` },
      )
    },
    useOne(id: string) {
      const i = ref.current.items[id]
      if (i && i.inStock > 0) actions.setStock(id, i.inStock - 1)
    },
    useAll(id: string) {
      const i = ref.current.items[id]
      if (!i) return
      commit((s) => edit(s, id, (x) => ({ ...withStock(x, 0), uses: (x.uses ?? 0) + 1 })), {
        title: `Used all the ${lower(i.name)}`, detail: i.target > 0 ? "Out · on the shopping list" : "None left", itemIds: [id],
      })
    },
    finishPack(id: string) {
      const i = ref.current.items[id]
      if (!i || i.inStock === 0) return
      commit((s) => edit(s, id, (x) => ({ ...withStock(x, x.inStock - 1), uses: (x.uses ?? 0) + 1 })), {
        title: `Finished a ${i.unit?.[0] ?? "pack"} of ${lower(i.name)}`, detail: stockDetail(id), itemIds: [id],
      })
    },
    openPack(id: string) {
      const i = ref.current.items[id]
      if (!i || (i.open ?? 0) >= i.inStock) return
      commit((s) => edit(s, id, (x) => openUnit(x).item), {
        title: `Opened a ${i.unit?.[0] ?? "pack"} of ${lower(i.name)}`, detail: stockDetail(id), itemIds: [id],
      })
    },

    // ----- items -----
    /**
     * Saves an item. The item panel's Edit saves every change as it's made, passing a `key` so a run of
     * changes to one item merges into one History entry; the detail then lists everything since the run began.
     */
    saveItem(draft: Item, isNew: boolean, opts?: { key?: string; title?: string; detail?: string }) {
      const before = ref.current.items[draft.id]
      commit(
        (s) => {
          const bought = before ? draft.inStock - before.inStock : 0
          const item = normalise({ ...draft, entries: bought > 0 ? settle(draft.entries, bought) : draft.entries, editedAt: new Date().toISOString(), addedAt: draft.addedAt ?? new Date().toISOString() })
          return setItems(s, { [draft.id]: item })
        },
        {
          title: opts?.title ?? (isNew ? `Added ${draft.name} to the pantry` : `Changed ${draft.name}`),
          detail: opts?.detail ?? (isNew
            ? (draft.target > 0 ? `A Staple · ${draft.target} min` : "Not a Staple")
            : (undo, next) => {
                const was = undo.items?.[draft.id]
                const now = next.items[draft.id]
                return cap((was && now ? itemChanges(was, now) : []).join(", ") || "No changes")
              }),
          itemIds: [draft.id],
          key: opts?.key,
        },
      )
    },
    deleteItem(id: string) {
      const i = ref.current.items[id]
      if (!i) return
      commit(
        (s) => {
          const items = { ...s.items }
          delete items[id]
          const recipes = s.db.recipes.map((r) =>
            r.ingredients.some((g) => g.itemId === id) ? { ...r, ingredients: r.ingredients.map((g) => (g.itemId === id ? { ...g, itemId: "" } : g)) } : r,
          )
          return { items, db: { ...s.db, recipes } }
        },
        { title: `Deleted ${i.name}`, detail: "Recipes keep their wording but lose the link", itemIds: [id] },
      )
      toast(`Deleted ${i.name}`, { description: "You can undo this from History today." })
    },
    mergeItems(keepId: string, goneId: string) {
      const keep = ref.current.items[keepId]
      const gone = ref.current.items[goneId]
      if (!keep || !gone) return
      commit(
        (s) => {
          const k = s.items[keepId]
          const g = s.items[goneId]
          const merged: Item = normalise({
            ...k,
            inStock: k.inStock + g.inStock,
            open: isBulk(k) ? (k.open ?? 0) + (g.open ?? 0) : undefined,
            target: Math.max(k.target, g.target),
            otherNames: [...new Set([...(k.otherNames ?? []), g.name, ...(g.otherNames ?? [])])].filter((n) => n !== k.name),
            useBy: [...(k.useBy ?? []), ...(g.useBy ?? [])].sort((a, b) => (a ?? "9").localeCompare(b ?? "9")),
            entries: [...(k.entries ?? []), ...(g.entries ?? [])],
            uses: (k.uses ?? 0) + (g.uses ?? 0),
            editedAt: new Date().toISOString(),
          })
          const items = { ...s.items, [keepId]: merged }
          delete items[goneId]
          const recipes = s.db.recipes.map((r) => ({ ...r, ingredients: r.ingredients.map((x) => (x.itemId === goneId ? { ...x, itemId: keepId } : x)) }))
          return { items, db: { ...s.db, recipes } }
        },
        { title: `Merged ${gone.name} into ${keep.name}`, detail: "Stock added together, recipe links moved", itemIds: [keepId, goneId] },
      )
      toast(`Merged ${gone.name} into ${keep.name}`, { description: "You can undo this from History today." })
    },
    addOtherName(id: string, name: string) {
      const i = ref.current.items[id]
      if (!i) return
      commit((s) => edit(s, id, (x) => ({ ...x, otherNames: [...new Set([...(x.otherNames ?? []), name])] })), {
        title: `Added "${name}" as another name for ${i.name}`, detail: "Matches in search and recipes", itemIds: [id],
      })
      toast(`"${name}" now finds ${i.name}`)
    },
    importItems(rows: { existingId?: string; item: Item }[]) {
      commit(
        (s) => {
          const items = { ...s.items }
          for (const r of rows) {
            const ex = r.existingId ? items[r.existingId] : undefined
            items[ex ? ex.id : r.item.id] = normalise(ex ? withStock(ex, ex.inStock + r.item.inStock) : r.item)
          }
          return { ...s, items }
        },
        { title: `Imported ${plural(rows.length, "item")}`, detail: rows.map((r) => r.item.name).join(", "), itemIds: rows.map((r) => r.existingId ?? r.item.id) },
      )
      toast(`Added ${plural(rows.length, "item")} to the pantry`)
    },

    // ----- shopping list -----
    /** Changes how many to buy. A Staple changes its minimum, like the phone; anything else changes its entry. */
    setListQty(id: string, qty: number) {
      const i = ref.current.items[id]
      if (!i || qty < 1) return
      const delta = qty - needOf(i)
      commit(
        (s) => edit(s, id, (x) => {
          const [first, ...rest] = x.entries ?? []
          if (first && (x.target === 0 || needOf(x) === (x.entries ?? []).reduce((n, e) => n + e.qty, 0))) {
            return { ...x, entries: [{ ...first, qty: Math.max(1, first.qty + delta) }, ...rest] }
          }
          return { ...x, target: Math.max(1, x.target + delta) }
        }),
        { title: (_, n) => `${n.items[id]?.name} on the list: ${needOf(n.items[id]!)} to buy`, itemIds: [id], key: `list:${id}` },
      )
    },
    /** Ordered (online, say), so not to buy in a shop. It stays on the list until it's no longer needed. */
    setOrdered(id: string, ordered: boolean) {
      const i = ref.current.items[id]
      if (!i || !!i.ordered === ordered || needOf(i) <= 0) return
      commit((s) => edit(s, id, (x) => ({ ...x, ordered: ordered || undefined })), {
        title: ordered ? `Marked ${lower(i.name)} as ordered` : `${i.name} no longer marked as ordered`,
        itemIds: [id],
      })
    },
    removeFromList(id: string) {
      const i = ref.current.items[id]
      if (!i) return
      commit(
        (s) => {
          if (i.oneOff) {
            const items = { ...s.items }
            delete items[id]
            return { ...s, items }
          }
          return edit(s, id, (x) => ({ ...x, entries: [] }))
        },
        { title: `Took ${i.name} off the shopping list`, itemIds: [id] },
      )
    },
    addToList(id: string, qty: number, makeStaple: boolean) {
      const i = ref.current.items[id]
      if (!i) return
      commit(
        (s) => edit(s, id, (x) => (makeStaple ? { ...x, target: x.inStock + qty } : { ...x, entries: [...(x.entries ?? []), { source: { kind: "hand" }, qty, at: new Date().toISOString() }] })),
        { title: `Added ${amountOf(i, qty)} to the shopping list`, detail: makeStaple ? `Now a Staple · ${i.inStock + qty} min` : "Added by you", itemIds: [id] },
      )
      toast(`Added ${amountOf(i, qty)} to the list`)
    },
    addOneOff(name: string, qty = 1) {
      const id = uid("oneoff")
      commit(
        (s) => setItems(s, {
          [id]: { id, name: cap(name), type: "counted", target: 0, inStock: 0, categoryId: "", where: [], oneOff: true, entries: [{ source: { kind: "hand" }, qty, at: new Date().toISOString() }] },
        }),
        { title: `Added ${cap(name)} to the shopping list`, detail: "A one-off · stock isn't tracked", itemIds: [id] },
      )
      toast(`Added ${cap(name)} to the list`, { description: "As a one-off" })
    },

    // ----- recipes -----
    /** Want to cook only marks the recipe, so the phone saves it for the shop. What to buy is put on the list from the ingredients. */
    wantToCook(recipe: Recipe) {
      return commit(
        (s) => setRecipes(s, (rs) => rs.map((r) => (r.id === recipe.id ? { ...r, wantToCook: true } : r))),
        { title: `Want to cook ${recipe.name}`, detail: "Saved to the phone", recipeId: recipe.id },
      )
    },
    unwant(recipe: Recipe) {
      commit(
        (s) => setRecipes(s, (rs) => rs.map((r) => (r.id === recipe.id ? { ...r, wantToCook: false } : r))),
        { title: `No longer want to cook ${recipe.name}`, detail: "Items you added from it stay on the list", recipeId: recipe.id },
      )
      toast(`${recipe.name} is no longer saved to your phone`)
    },
    /** Puts ingredients that are pantry items on the list from a recipe: one pack or unit each, never the recipe's amount. Returns the History entry id. */
    addIngredients(recipe: Recipe, rows: { itemId: string; qty: number }[]) {
      if (!rows.length) return undefined
      const now = new Date().toISOString()
      const names = rows.map((r) => ref.current.items[r.itemId]?.name).filter(Boolean)
      return commit(
        (s) => {
          let next = s
          for (const r of rows) {
            next = edit(next, r.itemId, (x) => ({ ...x, entries: [...(x.entries ?? []), { source: { kind: "recipe", recipe: recipe.name }, qty: r.qty, at: now }] }))
          }
          return next
        },
        { title: `Added ${nameList(names as string[])} to the shopping list`, detail: `For ${recipe.name}`, recipeId: recipe.id, itemIds: rows.map((r) => r.itemId) },
      )
    },
    /**
     * Ingredients the pantry doesn't have, put on the list from a recipe. Each becomes a pantry item with the fields
     * the user filled in (minimum 0, none in stock), linked to the recipe ingredient and on the list, 1 of it.
     * It's marked New until some is bought.
     */
    addNewIngredients(recipe: Recipe, news: { position: number; name: string; qty?: number; unit?: Item["unit"]; type?: Item["type"]; categoryId: string; location: NonNullable<Item["location"]> }[]) {
      if (!news.length) return undefined
      const now = new Date().toISOString()
      const made: Item[] = []
      const taken = (id: string) => !!ref.current.items[id] || made.some((m) => m.id === id)
      for (const n of news) {
        const name = cap(n.name.trim())
        let id = uid("item")
        while (taken(id)) id = uid("item")
        made.push(normalise({
          id, name, type: n.type ?? "counted", target: 0, inStock: 0, open: n.type === "bulk" ? 0 : undefined,
          unit: n.unit ?? (n.type === "bulk" ? ["bag", "bags"] : undefined),
          categoryId: n.categoryId, location: n.location, where: [], review: true, editedAt: now,
          entries: [{ source: { kind: "recipe", recipe: recipe.name }, qty: Math.max(1, n.qty ?? 1), at: now }],
        }))
      }
      return commit(
        (s) => {
          let next = setItems(s, byId(made))
          next = setRecipes(next, (rs) =>
            rs.map((r) => (r.id === recipe.id ? { ...r, ingredients: r.ingredients.map((g, k) => { const m = news.findIndex((n) => n.position === k); return m >= 0 && !g.itemId ? { ...g, itemId: made[m].id } : g }) } : r)),
          )
          return next
        },
        { title: `Added ${nameList(made.map((m) => m.name))} to the pantry and the shopping list`, detail: `New items from ${recipe.name}`, recipeId: recipe.id, itemIds: made.map((m) => m.id) },
      )
    },
    /**
     * "I already have this" on an ingredient the pantry doesn't know: makes the pantry item with what you have
     * (minimum 0, location and type guessed, marked New for review) and links it to the recipe line.
     */
    haveNewIngredient(recipe: Recipe, position: number, n: { name: string; qty: number; categoryId: string; location: NonNullable<Item["location"]>; unit?: Item["unit"] }) {
      const now = new Date().toISOString()
      let id = uid("item")
      while (ref.current.items[id]) id = uid("item")
      const name = cap(n.name.trim())
      const item = normalise({ id, name, type: "counted", target: 0, inStock: n.qty, unit: n.unit, categoryId: n.categoryId, location: n.location, where: [], review: true, editedAt: now })
      commit(
        (s) => {
          const next = setItems(s, { [id]: item })
          return setRecipes(next, (rs) =>
            rs.map((r) => (r.id === recipe.id ? { ...r, ingredients: r.ingredients.map((g, k) => (k === position && !g.itemId ? { ...g, itemId: id } : g)) } : r)),
          )
        },
        { title: `Added ${name} to the pantry`, detail: `${n.qty} in stock · from ${recipe.name}`, recipeId: recipe.id, itemIds: [id] },
      )
      toast(`Added ${name} to your pantry`, {
        description: (
          <>
            {unitText(item, n.qty)} in stock ·{" "}
            {/* Opens the item's side panel over the recipe page. */}
            <a className="underline underline-offset-4" href={href({ name: "recipe-full", id: recipe.id, item: id })}>Open the item</a>
          </>
        ),
      })
    },
    /** Sets how many of an ingredient this recipe has put on the list. Below 1 takes it off. */
    setIngredientQty(recipe: Recipe, itemId: string, qty: number) {
      const i = ref.current.items[itemId]
      if (!i) return
      const mine = (e: { source: { kind: string; recipe?: string } }) => e.source.kind === "recipe" && e.source.recipe === recipe.name
      commit(
        (s) =>
          edit(s, itemId, (x) => {
            const rest = (x.entries ?? []).filter((e) => !mine(e))
            const was = (x.entries ?? []).filter(mine)
            if (qty < 1) return { ...x, entries: rest }
            return { ...x, entries: [...rest, { source: { kind: "recipe", recipe: recipe.name }, qty, at: was[0]?.at ?? new Date().toISOString() }] }
          }),
        { title: qty < 1 ? `Took ${i.name} off the shopping list` : `${i.name} on the list: ${qty}`, detail: `For ${recipe.name}`, recipeId: recipe.id, itemIds: [itemId], key: `ingredient:${recipe.id}:${itemId}` },
      )
    },
    cooked(recipe: Recipe, counts: Record<string, number>, finished: string[]) {
      const parts: string[] = []
      for (const [id, n] of Object.entries(counts)) if (n > 0) parts.push(`${ref.current.items[id]?.name} −${n}`)
      for (const id of finished) parts.push(`${ref.current.items[id]?.name} finished`)
      commit(
        (s) => {
          let next = setRecipes(s, (rs) => rs.map((r) => (r.id === recipe.id ? { ...r, lastCooked: new Date().toISOString(), wantToCook: false } : r)))
          for (const [id, n] of Object.entries(counts)) if (n > 0) next = edit(next, id, (x) => ({ ...withStock(x, x.inStock - n), uses: (x.uses ?? 0) + 1 }))
          for (const id of finished) next = edit(next, id, (x) => ({ ...withStock(x, x.inStock - 1), uses: (x.uses ?? 0) + 1 }))
          for (const i of Object.values(next.items)) {
            if (i.entries?.some((e) => e.source.kind === "recipe" && e.source.recipe === recipe.name)) {
              next = edit(next, i.id, (x) => ({ ...x, entries: x.entries!.filter((e) => !(e.source.kind === "recipe" && e.source.recipe === recipe.name)) }))
            }
          }
          return next
        },
        { title: `Cooked ${recipe.name}`, detail: parts.join(", ") || "No stock changes", recipeId: recipe.id, itemIds: [...Object.keys(counts), ...finished] },
      )
      toast(`Cooked ${recipe.name}`, { description: "Stock updated." })
    },
    saveRecipe(recipe: Recipe, isNew: boolean) {
      const saved: Recipe = { ...recipe, editedAt: new Date().toISOString() }
      const before = ref.current.db.recipes.find((r) => r.id === recipe.id)
      commit(
        (s) => {
          let next = setRecipes(s, (rs) => (isNew ? [...rs, saved] : rs.map((r) => (r.id === recipe.id ? saved : r))))
          // List entries are labelled with the recipe's name, so a rename carries across.
          if (before && before.name !== recipe.name) {
            for (const i of Object.values(next.items)) {
              if (i.entries?.some((e) => e.source.kind === "recipe" && e.source.recipe === before.name)) {
                next = edit(next, i.id, (x) => ({ ...x, entries: x.entries!.map((e) => (e.source.kind === "recipe" && e.source.recipe === before.name ? { ...e, source: { kind: "recipe", recipe: recipe.name } } : e)) }))
              }
            }
          }
          return next
        },
        { title: isNew ? `Added the recipe ${recipe.name}` : `Edited the recipe ${recipe.name}`, recipeId: recipe.id },
      )
      toast(isNew ? `Added ${recipe.name}` : `Saved ${recipe.name}`)
    },
    /** Points a recipe line at a pantry item, keeping the recipe's wording. Links a recipe line to a pantry item. The item is checked inside the update, so this can follow a saveItem straight away. */
    linkIngredient(recipe: Recipe, position: number, itemId: string) {
      const g = recipe.ingredients[position]
      if (!g) return
      commit(
        (s) =>
          !s.items[itemId] ? s : setRecipes(s, (rs) =>
            rs.map((r) =>
              r.id === recipe.id
                ? { ...r, editedAt: new Date().toISOString(), ingredients: r.ingredients.map((x, k) => (k === position ? { ...x, itemId } : x)) }
                : r,
            ),
          ),
        { title: (_, n) => `Linked "${g.text}" to ${n.items[itemId]?.name}`, detail: `In ${recipe.name}`, recipeId: recipe.id, itemIds: [itemId] },
      )
      const name = ref.current.items[itemId]?.name
      toast(name ? `Linked to ${name}` : `Linked to the new item`)
    },
    deleteRecipe(recipe: Recipe, removeFromList: boolean) {
      commit(
        (s) => {
          let next = setRecipes(s, (rs) => rs.filter((r) => r.id !== recipe.id))
          if (removeFromList) {
            for (const i of Object.values(next.items)) {
              if (i.entries?.some((e) => e.source.kind === "recipe" && e.source.recipe === recipe.name)) {
                next = edit(next, i.id, (x) => ({ ...x, entries: x.entries!.filter((e) => !(e.source.kind === "recipe" && e.source.recipe === recipe.name)) }))
              }
            }
          }
          return next
        },
        { title: `Deleted the recipe ${recipe.name}`, detail: removeFromList ? "Its items came off the shopping list" : "Pantry items stay", recipeId: recipe.id },
      )
      toast(`Deleted ${recipe.name}`, { description: "You can undo this from History today." })
    },

    // ----- stores and aisles -----
    saveStore(store: Store) {
      commit((s) => setDb(s, { stores: s.db.stores.map((x) => (x.id === store.id ? store : x)) }))
    },
    addStore(): string {
      const id = uid("store")
      commit((s) => setDb(s, { stores: [...s.db.stores, { id, name: "New store", kind: "", place: "", aisles: Object.fromEntries(s.db.categories.map((c) => [c.id, null])) }] }))
      return id
    },
    deleteStore(id: string) {
      commit((s) => {
        // Items bought at this store go back to any store.
        const patch: Items = {}
        for (const i of Object.values(s.items)) if (i.where.includes(id)) patch[i.id] = { ...i, where: i.where.filter((x) => x !== id), editedAt: new Date().toISOString() }
        return setDb(setItems(s, patch), {
          stores: s.db.stores.filter((x) => x.id !== id),
          defaultStoreId: s.db.defaultStoreId === id ? s.db.stores.find((x) => x.id !== id)?.id ?? "" : s.db.defaultStoreId,
        })
      })
    },
    setDefaultStore(id: string) {
      commit((s) => setDb(s, { defaultStoreId: id }))
    },
    renameCategory(id: string, name: string) {
      commit((s) => setDb(s, { categories: s.db.categories.map((c) => (c.id === id ? { ...c, name } : c)) }))
    },
    /** Sets or clears a category's colour and icon. Leaving a key out keeps what's there; null clears it. */
    setCategoryLook(id: string, look: { colour?: CategoryColour | null; icon?: CategoryIcon | null }) {
      commit((s) => setDb(s, {
        categories: s.db.categories.map((c) => {
          if (c.id !== id) return c
          const { colour, icon, ...rest } = c
          const nextColour = look.colour === undefined ? colour : look.colour
          const nextIcon = look.icon === undefined ? icon : look.icon
          return { ...rest, ...(nextColour && { colour: nextColour }), ...(nextIcon && { icon: nextIcon }) }
        }),
      }))
    },
    /** A new category. With a store, it gets the next aisle number there; every other store has none. */
    addCategory(storeId: string | null, name: string) {
      const id = uid("aisle")
      commit((s) => {
        const store = s.db.stores.find((x) => x.id === storeId)
        const top = Math.max(0, ...Object.values(store?.aisles ?? {}).map((n) => n ?? 0))
        return setDb(s, {
          categories: [...s.db.categories, { id, name }],
          stores: s.db.stores.map((x) => ({ ...x, aisles: { ...x.aisles, [id]: x.id === storeId ? top + 1 : null } })),
        })
      })
      return id
    },
    /** SET-06, first step: moves every item in one category to another, so the first can be removed. */
    moveCategoryItems(from: string, to: string) {
      const s0 = ref.current
      const a = s0.db.categories.find((c) => c.id === from)
      const b = s0.db.categories.find((c) => c.id === to)
      const moved = Object.values(s0.items).filter((i) => i.categoryId === from).map((i) => i.id)
      if (!a || !b || from === to || !moved.length) return
      commit(
        (s) => moved.reduce((next, id) => edit(next, id, (x) => ({ ...x, categoryId: to })), s),
        { title: `Moved ${plural(moved.length, "item")} from ${a.name} to ${b.name}`, itemIds: moved },
      )
      toast(`Moved ${plural(moved.length, "item")} to ${b.name}`)
    },
    /** SET-06: removes a category from every store. Only an empty one: its items have to be moved first. */
    removeCategory(id: string) {
      const s0 = ref.current
      const gone = s0.db.categories.find((c) => c.id === id)
      if (!gone || Object.values(s0.items).some((i) => i.categoryId === id)) return
      commit(
        (s) => setDb(s, {
          categories: s.db.categories.filter((c) => c.id !== id),
          stores: s.db.stores.map((x) => {
            const aisles = { ...x.aisles }
            delete aisles[id]
            return { ...x, aisles }
          }),
        }),
        { title: `Removed the category ${gone.name}`, detail: "It had no items" },
      )
      toast(`Removed ${gone.name}`, { description: "You can undo this from History today." })
    },

    // ----- sync with Supabase -----
    /**
     * Sends this computer's category, store, item and recipe changes to Supabase and brings back
     * anything that changed there. Categories go first (so stores can number them and items can
     * point at them), recipes after the items (so ingredients can link to new ones), and removed
     * categories are deleted last (once their items have moved). Which store is the default stays here.
     */
    /**
     * quiet: no "Already up to date". background: no counts either, only warnings (the live sync says
     * what Claude did itself), and no error toast: the header says the sync didn't go through, and the
     * next automatic sync tries again. Returns whether it went through.
     */
    async syncNow(opts: { quiet?: boolean; background?: boolean } = {}): Promise<boolean> {
      if (syncing) return false
      setSyncing(true)
      const started = ref.current
      try {
        const cats = await syncCategories(started.db.categories, started.db.syncedCategories)
        const shops = await syncStores(started.db.stores, started.db.syncedStores, cats.categories)
        const result = await syncItems(started.items, started.db.syncedItems)
        const cookbook = await syncRecipes(started.db.recipes, started.db.syncedRecipes, new Set(Object.keys(result.items)))
        const kept = await deleteCategories(cats.remove)
        const log = await syncHistory(started.db.history, started.db.syncedHistory)
        const now = new Date().toISOString()
        setState((s) => {
          // Anything edited while the sync ran is kept as it is now and goes out next time.
          const items = { ...result.items }
          for (const id of new Set([...Object.keys(s.items), ...Object.keys(started.items)])) {
            if (fingerprint(s.items[id]) !== fingerprint(started.items[id])) {
              if (s.items[id]) items[id] = s.items[id]
              else delete items[id]
            }
          }
          // Categories changed while the sync ran stay as they are now and go out next time.
          const categories = JSON.stringify(s.db.categories) === JSON.stringify(started.db.categories) ? cats.categories : s.db.categories
          // Recipes changed while the sync ran stay as they are now and go out next time.
          const recipesUnchanged = s.db.recipes.length === started.db.recipes.length && s.db.recipes.every((r, k) => recipeFingerprint(r) === recipeFingerprint(started.db.recipes[k]))
          const storesUnchanged = s.db.stores.length === started.db.stores.length && s.db.stores.every((x, k) => storeFingerprint(x) === storeFingerprint(started.db.stores[k]))
          const storeList = storesUnchanged ? shops.stores : s.db.stores
          // The default store stays this computer's choice, unless it was deleted elsewhere.
          const defaultStore = storeList.some((x) => x.id === s.db.defaultStoreId) ? s.db.defaultStoreId : storeList[0]?.id ?? ""
          return {
            items,
            db: {
              ...s.db,
              categories,
              // Stores changed while the sync ran stay as they are now and go out next time.
              stores: (storesUnchanged ? shops.stores : s.db.stores).map((x) => fillAisles(x, categories)),
              defaultStoreId: defaultStore,
              syncedStores: shops.stores,
              recipes: recipesUnchanged ? cookbook.recipes : s.db.recipes,
              syncedRecipes: cookbook.recipes,
              syncedItems: result.items,
              // Entries made while the sync ran (or changed since) stay at the top and go out next time.
              history: mergeHistory(s.db.history, log.history, started.db.history),
              syncedHistory: log.base,
              // A category Supabase wouldn't delete yet stays in the base, so the next sync tries again.
              syncedCategories: [...cats.categories, ...kept],
              syncedAt: now,
            },
          }
        })
        const sent = result.pushed + cats.pushed + shops.pushed + cookbook.pushed + log.pushed - kept.length
        const received = result.pulled + cats.pulled + shops.pulled + cookbook.pulled + log.pulled
        const parts = [
          sent ? `${plural(sent, "change")} sent` : "",
          received ? `${plural(received, "change")} received` : "",
        ].filter(Boolean)
        const notes = [
          result.clashes ? `${plural(result.clashes, "item")} changed in both places: the later edit won.` : "",
          result.uncategorised ? `${plural(result.uncategorised, "item")} saved without a category: Supabase doesn't have it.` : "",
          kept.length ? `${nameList(kept.map((c) => c.name))} stayed in Supabase: items there still use ${kept.length === 1 ? "it" : "them"}. Sync tries again next time.` : "",
        ].filter(Boolean)
        // The sync on opening the app stays quiet unless something came or went.
        if (opts.background ? notes.length : !opts.quiet || parts.length || notes.length) {
          toast(parts.length ? `Synced · ${parts.join(", ")}` : "Already up to date", { description: notes.join(" ") || undefined })
        }
        setSyncError(null)
        return true
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        const description = /row-level security/i.test(message) ? "Supabase refused the write. Are you signed in, and have all the migrations in supabase/migrations been applied?" : message
        setSyncError(description)
        if (!opts.background) toast.error("Couldn't sync", { description })
        return false
      } finally {
        setSyncing(false)
      }
    },

    // ----- account and demo -----
    signIn(email?: string) {
      commit((s) => setDb(s, { signedIn: true, email: email || s.db.email }))
    },
    signOut() {
      commit((s) => setDb(s, { signedIn: false }))
    },
    setClaudeConnected(on: boolean) {
      commit((s) => setDb(s, { claudeConnected: on }))
    },
    /** Puts both prototypes back to the seed. Keeps you signed in. */
    resetDemo(keepSignedIn = true) {
      for (const k of [ITEMS_KEY, DB_KEY, PHONE_KEY]) {
        try {
          localStorage.removeItem(k)
        } catch {
          /* ignore */
        }
      }
      const items = normaliseAll(seedPantryItems())
      setState({ items, db: { ...seedDb(items), signedIn: keepSignedIn } })
      setPhoneSyncedAt(at(10, 2))
    },
    resolveConflicts(values: Record<string, number>) {
      const names = Object.keys(values).map((id) => ref.current.items[id]?.name).filter(Boolean) as string[]
      commit(
        (s) => {
          let next = s
          for (const [id, n] of Object.entries(values)) next = edit(next, id, (x) => withStock(x, n))
          return setDb(next, { conflicts: s.db.conflicts.filter((c) => !(c.itemId in values)) })
        },
        { title: `Chose the stock for ${names.join(" and ")}`, detail: "After a phone sync", itemIds: Object.keys(values) },
      )
    },

    // ----- history -----
    undo(entryId: string) {
      setState((s) => {
        const entry = s.db.history.find((h) => h.id === entryId)
        if (!entry?.undo || entry.undone) return s
        const redo = snapshotOf(s, entry.undo)
        const { items, recipes } = putBack(s, entry.undo)
        // A removed category comes back in its old place, with its old aisle numbers. Categories
        // added or renamed since stay as they are now.
        let { categories, stores } = s.db
        if (entry.undo.categories) {
          const now = byId(categories)
          const before = entry.undo.categories.map((c) => now[c.id] ?? c)
          categories = [...before, ...categories.filter((c) => !entry.undo!.categories!.some((b) => b.id === c.id))]
          const old = byId(entry.undo.stores ?? [])
          stores = stores.map((x) => {
            const back = Object.fromEntries(Object.entries(old[x.id]?.aisles ?? {}).filter(([k]) => !(k in x.aisles)))
            return { ...x, aisles: { ...x.aisles, ...back } }
          })
        }
        const history = s.db.history.map((h) => (h.id === entryId ? { ...h, undone: true, redo } : h))
        return { items, db: { ...s.db, recipes, categories, stores, history } }
      })
      toast("Undone")
    },

    /** Reverses an undo: puts back what the undo overwrote, and the entry counts again. */
    revert(entryId: string) {
      setState((s) => {
        const entry = s.db.history.find((h) => h.id === entryId)
        if (!entry?.redo || !entry.undone) return s
        const { items, recipes } = putBack(s, entry.redo)
        // Categories the undo brought back go again, with the aisle numbers it brought back.
        let { categories, stores } = s.db
        if (entry.redo.categories && entry.undo?.categories) {
          const kept = new Set(entry.redo.categories.map((c) => c.id))
          const restored = new Set(entry.undo.categories.map((c) => c.id).filter((id) => !kept.has(id)))
          categories = categories.filter((c) => !restored.has(c.id))
          const had = byId(entry.redo.stores ?? [])
          stores = stores.map((x) => ({
            ...x,
            aisles: Object.fromEntries(Object.entries(x.aisles).filter(([k]) => !restored.has(k) || k in (had[x.id]?.aisles ?? {}))),
          }))
        }
        const history = s.db.history.map((h) => (h.id === entryId ? { ...h, undone: undefined, redo: undefined } : h))
        return { items, db: { ...s.db, recipes, categories, stores, history } }
      })
      toast("Reverted")
    },
  }

  const store = state.db.stores.find((s) => s.id === state.db.defaultStoreId) ?? state.db.stores[0]
  const pending =
    pendingIds(state.items, state.db.syncedItems).length +
    pendingCategoryIds(state.db.categories, state.db.syncedCategories).length +
    pendingStoreIds(state.db.stores, state.db.syncedStores).length +
    pendingRecipeIds(state.db.recipes, state.db.syncedRecipes).length +
    pendingHistoryIds(state.db.history, state.db.syncedHistory).length
  return { state, items: state.items, db: state.db, actions, phoneSyncedAt, store, syncing, syncError, pending }
}

type Ctx = ReturnType<typeof usePantryState>
const StateContext = React.createContext<Ctx | null>(null)

export function usePantry() {
  const ctx = React.useContext(StateContext)
  if (!ctx) throw new Error("usePantry must be used inside <PantryProvider>")
  return ctx
}

export function PantryProvider({ children }: { children: React.ReactNode }) {
  const value = usePantryState()
  return <StateContext.Provider value={value}>{children}</StateContext.Provider>
}

/** Undo is offered for today's changes that carry a snapshot. */
export const canUndo = (h: HistoryEntry) => !!h.undo && !h.undone && isToday(h.at)

/** Revert is offered for today's undone changes whose undo saved what it overwrote. */
export const canRevert = (h: HistoryEntry) => !!h.redo && !!h.undone && isToday(h.at)
