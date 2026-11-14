// App state: the pantry items (shared with the shopping app) and everything else the pantry app
// keeps (stores, aisles, recipes, history). Every change goes through `commit`, which records a
// History entry with a snapshot so any change made today can be undone.
import * as React from "react"
import { toast } from "sonner"
import {
  at, DB_KEY, fillAisles, ITEMS_KEY, PHONE_KEY, readJson, seedCategories, seedItems, seedPantryItems, seedRecipes, seedStores, writeJson,
} from "../../shared/src/pantry"
import {
  cap, haveText, isBulk, isToday, lower, needOf, normalise, plural, settle, timeText, todayIso, unitText, withStock,
  type Conflict, type Db, type HistoryEntry, type Item, type Items, type Recipe, type Snapshot, type Store, type Who,
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

const singular = (name: string) => name.replace(/oes$/i, "o").replace(/([^s])s$/i, "$1")
/** "1 lemon", "2 eggs", "1 bottle of whole milk". */
export function amountOf(i: Item, n: number) {
  if (i.unit) return `${unitText(i, n)} of ${lower(i.name)}`
  return `${n} ${lower(n === 1 ? singular(i.name) : i.name)}`
}

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
  return { items, recipes }
}

type EntryInput = { who?: Who; title: string | ((undo: Snapshot, next: S) => string); detail?: string | ((undo: Snapshot, next: S) => string); itemIds?: string[]; recipeId?: string; key?: string }

// ---------- the store ----------

function usePantryState() {
  const [state, setState] = React.useState<S>(load)
  const [phoneSyncedAt, setPhoneSyncedAt] = React.useState(readPhoneSync)
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
      commit((s) => edit(s, id, (x) => ({ ...x, open: (x.open ?? 0) + 1, openedAt: [...(x.openedAt ?? []), todayIso()] })), {
        title: `Opened a ${i.unit?.[0] ?? "pack"} of ${lower(i.name)}`, detail: stockDetail(id), itemIds: [id],
      })
    },

    // ----- items -----
    saveItem(draft: Item, isNew: boolean) {
      const before = ref.current.items[draft.id]
      const changes: string[] = []
      if (before) {
        if (before.inStock !== draft.inStock) changes.push(`stock ${before.inStock} → ${draft.inStock}`)
        if (before.target !== draft.target) changes.push(`minimum ${before.target} → ${draft.target}`)
        if (before.name !== draft.name) changes.push(`renamed from ${before.name}`)
        if (before.location !== draft.location) changes.push("location")
        if (before.categoryId !== draft.categoryId) changes.push("shop or aisle")
        if (before.price !== draft.price) changes.push("price")
        if (before.brand !== draft.brand) changes.push("brand")
        if (JSON.stringify(before.useBy) !== JSON.stringify(draft.useBy)) changes.push("use-by dates")
        if (before.notes !== draft.notes) changes.push("notes")
        if (JSON.stringify(before.otherNames) !== JSON.stringify(draft.otherNames)) changes.push("other names")
      }
      commit(
        (s) => {
          const bought = before ? draft.inStock - before.inStock : 0
          const item = normalise({ ...draft, entries: bought > 0 ? settle(draft.entries, bought) : draft.entries, editedAt: new Date().toISOString() })
          return setItems(s, { [draft.id]: item })
        },
        {
          title: isNew ? `Added ${draft.name} to the pantry` : `Changed ${draft.name}`,
          detail: isNew ? (draft.target > 0 ? `A Staple · keep ${draft.target}` : "Not a Staple") : cap(changes.join(", ") || "No changes"),
          itemIds: [draft.id],
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
        { title: `Added ${amountOf(i, qty)} to the shopping list`, detail: makeStaple ? `Now a Staple · keep ${i.inStock + qty}` : "Added by you", itemIds: [id] },
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
    /** Puts what's short on the list, marked with the recipe. */
    wantToCook(recipe: Recipe, rows: { itemId: string; qty: number }[]) {
      const entryId = commit(
        (s) => {
          let next = setRecipes(s, (rs) => rs.map((r) => (r.id === recipe.id ? { ...r, wantToCook: true } : r)))
          for (const r of rows) {
            next = edit(next, r.itemId, (x) => ({ ...x, entries: [...(x.entries ?? []), { source: { kind: "recipe", recipe: recipe.name }, qty: r.qty, at: new Date().toISOString() }] }))
          }
          return next
        },
        { title: `Want to cook ${recipe.name}`, detail: rows.length ? `Added ${plural(rows.length, "thing")} to the shopping list` : "Saved to the phone", recipeId: recipe.id, itemIds: rows.map((r) => r.itemId) },
      )
      return entryId
    },
    unwant(recipe: Recipe) {
      commit(
        (s) => {
          let next = setRecipes(s, (rs) => rs.map((r) => (r.id === recipe.id ? { ...r, wantToCook: false } : r)))
          for (const i of Object.values(next.items)) {
            if (i.entries?.some((e) => e.source.kind === "recipe" && e.source.recipe === recipe.name)) {
              next = edit(next, i.id, (x) => ({ ...x, entries: x.entries!.filter((e) => !(e.source.kind === "recipe" && e.source.recipe === recipe.name)) }))
            }
          }
          return next
        },
        { title: `No longer want to cook ${recipe.name}`, detail: "Its items came off the shopping list", recipeId: recipe.id },
      )
      toast(`${recipe.name} is off the list`, { description: "Its items came off the shopping list." })
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
      const before = ref.current.db.recipes.find((r) => r.id === recipe.id)
      commit(
        (s) => {
          let next = setRecipes(s, (rs) => (isNew ? [...rs, recipe] : rs.map((r) => (r.id === recipe.id ? recipe : r))))
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
      commit((s) => setDb(s, {
        stores: s.db.stores.filter((x) => x.id !== id),
        defaultStoreId: s.db.defaultStoreId === id ? s.db.stores.find((x) => x.id !== id)?.id ?? "" : s.db.defaultStoreId,
      }))
    },
    setDefaultStore(id: string) {
      commit((s) => setDb(s, { defaultStoreId: id }))
    },
    renameCategory(id: string, name: string) {
      commit((s) => setDb(s, { categories: s.db.categories.map((c) => (c.id === id ? { ...c, name } : c)) }))
    },
    addCategory(storeId: string, name: string) {
      const id = uid("aisle")
      commit((s) => {
        const store = s.db.stores.find((x) => x.id === storeId)
        const top = Math.max(0, ...Object.values(store?.aisles ?? {}).map((n) => n ?? 0))
        return setDb(s, {
          categories: [...s.db.categories, { id, name }],
          stores: s.db.stores.map((x) => ({ ...x, aisles: { ...x.aisles, [id]: x.id === storeId ? top + 1 : null } })),
        })
      })
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
    /**
     * Pretends the phone synced a shop. Eggs and lemons also changed here since the phone's last
     * sync, so they wait for you (PAN-19). Everything else from the shop goes through.
     */
    simulatePhoneSync() {
      const s = ref.current
      const now = new Date().toISOString()
      const bought: Record<string, number> = { eggs: 6, lemons: 4, sourdough: 1, kimchi: 1, "chicken-thighs": 1 }
      const conflicting = ["eggs", "lemons"].filter((id) => s.items[id])
      const base = byId(seedItems)
      const conflicts: Conflict[] = conflicting.map((id) => {
        const mine = s.db.history.find((h) => h.who === "you" && isToday(h.at) && h.itemIds?.includes(id) && !h.undone)
        return {
          itemId: id,
          here: s.items[id].inStock,
          hereNote: mine ? `${lower(mine.title)} at ${timeText(mine.at)}` : "changed here today",
          phone: (base[id]?.inStock ?? s.items[id].inStock) + bought[id],
          phoneNote: `you bought ${bought[id]} at ${timeText(now)}`,
        }
      })
      commit(
        (st) => {
          let next = st
          for (const [id, n] of Object.entries(bought)) {
            if (conflicting.includes(id)) continue
            next = edit(next, id, (x) => ({ ...withStock(x, x.inStock + n), entries: settle(x.entries, n) }))
          }
          return setDb(next, { conflicts })
        },
        { who: "phone", title: "Synced a shop", detail: `Sainsbury's · ${plural(Object.keys(bought).length - conflicting.length, "item")} bought, ${plural(conflicting.length, "item")} to check`, itemIds: Object.keys(bought) },
      )
      setPhoneSyncedAt(now)
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
        const items = { ...s.items }
        for (const [id, before] of Object.entries(entry.undo.items ?? {})) {
          if (before) items[id] = before
          else delete items[id]
        }
        let recipes = [...s.db.recipes]
        for (const [id, before] of Object.entries(entry.undo.recipes ?? {})) {
          const index = recipes.findIndex((r) => r.id === id)
          if (!before) recipes = recipes.filter((r) => r.id !== id)
          else if (index >= 0) recipes[index] = before
          else recipes.push(before)
        }
        const history = s.db.history.map((h) => (h.id === entryId ? { ...h, undone: true } : h))
        return { items, db: { ...s.db, recipes, history } }
      })
      toast("Undone")
    },
  }

  const store = state.db.stores.find((s) => s.id === state.db.defaultStoreId) ?? state.db.stores[0]
  return { state, items: state.items, db: state.db, actions, phoneSyncedAt, store }
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
