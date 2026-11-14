import * as React from "react"
import { toast } from "sonner"
import {
  findConflicts, incomingChanges, merge, outgoingChanges, seedState, shopAisles,
  type Filter, type Item, type Session, type State, type Store,
} from "./model"
import { readRemote, readShared, resetRemote, writeRemote, writeSharedStores } from "./mock-pantry"
import { PHONE_KEY } from "../../shared/src/pantry"
import { navigate } from "./router"

// v5: recipes too. v4: items come from Supabase. v3: one seed shared with the pantry app prototype (prototypes/shared/src/pantry.ts).
const KEY = PHONE_KEY

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...seedState(), ...JSON.parse(raw), sync: null }
  } catch {
    /* fall through */
  }
  return seedState()
}

type Ctx = ReturnType<typeof useShoppingState>
const StateContext = React.createContext<Ctx | null>(null)

export function useApp() {
  const ctx = React.useContext(StateContext)
  if (!ctx) throw new Error("useApp must be used inside <AppStateProvider>")
  return ctx
}

const isOffline = (s: State) => s.simulateOffline || !navigator.onLine

function useShoppingState() {
  const [state, setState] = React.useState<State>(load)
  const ref = React.useRef(state)
  React.useLayoutEffect(() => {
    ref.current = state
  }, [state])

  React.useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...state, sync: null }))
    } catch {
      /* ignore */
    }
  }, [state])

  const update = React.useCallback((fn: (s: State) => State) => setState(fn), [])

  const setItem = (s: State, id: string, patch: Partial<Item>): State => ({
    ...s,
    items: { ...s.items, [id]: { ...s.items[id], ...patch } },
  })
  const setSession = (s: State, patch: Partial<Session>): State =>
    s.session ? { ...s, session: { ...s.session, ...patch } } : s
  const unskip = (s: State, id: string) =>
    setSession(s, { skipped: (s.session?.skipped ?? []).filter((x) => x !== id) })

  const actions = {
    startShop(storeId: string) {
      update((s) => {
        const resume = s.session && s.session.storeId === storeId && !s.session.finished
        const session: Session = resume
          ? s.session!
          : {
              storeId,
              aisleIndex: 0,
              skipped: [],
              startStock: Object.fromEntries(Object.values(s.items).map((i) => [i.id, i.inStock])),
              finished: false,
            }
        return { ...s, lastStoreId: storeId, session }
      })
      navigate({ name: "shop" })
    },
    setAisle(index: number) {
      update((s) => setSession(s, { aisleIndex: index }))
    },
    addOne(id: string) {
      update((s) => unskip(setItem(s, id, { inStock: s.items[id].inStock + 1 }), id))
    },
    /** Takes one back off: undoes a check, but never below what was in stock when the shop began. */
    removeOne(id: string) {
      update((s) => {
        const i = s.items[id]
        const floor = s.session?.startStock[id] ?? 0
        if (i.inStock <= floor) return s
        return setItem(s, id, { inStock: i.inStock - 1 })
      })
    },
    updateItem(id: string, patch: Partial<Pick<Item, "name" | "inStock">>) {
      update((s) => setItem(s, id, patch))
    },
    /** Gets everything still to get on an item. */
    getAll(id: string, remaining: number) {
      update((s) => unskip(setItem(s, id, { inStock: s.items[id].inStock + remaining }), id))
    },
    /** Changes how many to get. A Staple changes its minimum; anything else changes its list entry. */
    setNeeded(id: string, delta: number) {
      update((s) => {
        const i = s.items[id]
        if (i.target > 0) return setItem(s, id, { target: Math.max(1, i.target + delta) })
        const [first, ...rest] = i.entries ?? []
        if (!first) return s
        return setItem(s, id, { entries: [{ ...first, qty: Math.max(1, first.qty + delta) }, ...rest] })
      })
    },
    /** Puts an ingredient on the list for a recipe. It goes to the pantry at the next sync. */
    addToList(itemId: string, qty: number, recipe: string) {
      update((s) => {
        const i = s.items[itemId]
        if (!i) return s
        return setItem(s, itemId, { entries: [...(i.entries ?? []), { source: { kind: "recipe", recipe }, qty }] })
      })
    },
    signIn() {
      update((s) => ({ ...s, signedIn: true }))
    },
    signOut() {
      update((s) => ({ ...s, signedIn: false }))
    },
    skip(id: string) {
      update((s) => setSession(s, { skipped: [...new Set([...(s.session?.skipped ?? []), id])] }))
    },
    restore(id: string, inStock: number, skipped: boolean) {
      update((s) => {
        const next = setItem(s, id, { inStock })
        return skipped ? setSession(next, { skipped: [...(next.session?.skipped ?? []), id] }) : unskip(next, id)
      })
    },
    finishShop() {
      update((s) => ({ ...setSession(s, { finished: true }), filter: "all" }))
      navigate({ name: "done" })
    },
    setFilter(filter: Filter) {
      update((s) => ({ ...s, filter }))
    },
    /** A one-off: on the list now, not a Staple (minimum 0). */
    addItem(input: { name: string; target: number; categoryId: string }) {
      update((s) => {
        const id = `local-${Date.now().toString(36)}`
        const item: Item = {
          id, name: input.name, categoryId: input.categoryId, type: "counted", target: 0, inStock: 0, where: [],
          entries: [{ source: { kind: "hand" }, qty: input.target }],
        }
        const next = { ...s, items: { ...s.items, [id]: item }, order: [...s.order, id] }
        return next.session
          ? setSession(next, { startStock: { ...next.session.startStock, [id]: 0 } })
          : next
      })
    },
    saveStore(store: Store) {
      update((s) => {
        const exists = s.stores.some((x) => x.id === store.id)
        return { ...s, stores: exists ? s.stores.map((x) => (x.id === store.id ? store : x)) : [...s.stores, store] }
      })
    },
    removeStore(id: string) {
      update((s) => ({
        ...s,
        stores: s.stores.filter((x) => x.id !== id),
        lastStoreId: s.lastStoreId === id ? null : s.lastStoreId,
        session: s.session?.storeId === id ? null : s.session,
      }))
    },
    setSimulateOffline(on: boolean) {
      update((s) => ({ ...s, simulateOffline: on }))
    },
    reset() {
      try {
        localStorage.removeItem(KEY)
      } catch {
        /* ignore */
      }
      resetRemote()
      setState({ ...seedState(), signedIn: ref.current.signedIn })
      navigate({ name: "home" }, { replace: true })
    },

    // ----- sync -----
    startSync() {
      const s = ref.current
      if (s.sync) return
      if (isOffline(s)) {
        navigate({ name: "sync-offline" })
        return
      }
      update((s) => ({
        ...s,
        sync: {
          phase: "sending",
          progress: 0,
          snapshot: structuredClone(s.items),
          outgoing: outgoingChanges(s.items, s.baseline).length,
          conflicts: [],
          resolutions: {},
        },
      }))
      navigate({ name: s.session && !s.session.finished ? "shop" : "home" })
    },
    resolveConflict(id: string, value: number) {
      update((s) => {
        if (!s.sync) return s
        const resolutions = { ...s.sync.resolutions, [id]: value }
        const left = s.sync.conflicts.filter((c) => !(c in resolutions))
        return { ...s, sync: { ...s.sync, resolutions, phase: left.length ? "paused" : "finishing" } }
      })
    },
    cancelSync() {
      update((s) => ({ ...s, sync: null }))
    },
  }

  // The sync runs on a timer so you can see it happen and keep shopping.
  const phase = state.sync?.phase
  React.useEffect(() => {
    if (phase !== "sending" && phase !== "receiving") return
    const t = setInterval(() => {
      const s = ref.current
      if (!s.sync) return
      const progress = Math.min(85, s.sync.progress + 3)
      if (progress < 85) {
        update((s) => s.sync ? { ...s, sync: { ...s.sync, progress, phase: progress < 45 ? "sending" : "receiving" } } : s)
        return
      }
      const conflicts = findConflicts(s.sync.snapshot, s.baseline, readRemote())
      update((s) => s.sync ? { ...s, sync: { ...s.sync, progress, conflicts, phase: conflicts.length ? "paused" : "finishing" } } : s)
      if (conflicts.length) navigate({ name: "sync-conflict" })
    }, 90)
    return () => clearInterval(t)
  }, [phase, update])

  React.useEffect(() => {
    if (phase !== "finishing") return
    const t = setTimeout(() => {
      const s = ref.current
      if (!s.sync) return
      const remote = readRemote()
      const changed = new Set([
        ...outgoingChanges(s.sync.snapshot, s.baseline),
        ...incomingChanges(remote, s.baseline),
      ].map((c) => c.item.id))
      const merged = merge(s.sync.snapshot, s.baseline, remote, s.sync.resolutions)
      writeRemote(merged)
      // Re-apply anything ticked while the sync was running.
      const items = structuredClone(merged)
      for (const [id, now] of Object.entries(s.items)) {
        const before = s.sync.snapshot[id]
        if (!before) items[id] = now
        else items[id].inStock += now.inStock - before.inStock
      }
      const session = s.session && {
        ...s.session,
        startStock: {
          ...Object.fromEntries(Object.keys(items).map((id) => [id, items[id].inStock])),
          ...s.session.startStock,
        },
      }
      // Recipes and aisles come from the pantry app. Stores go whichever way changed: if they were
      // edited on this phone since the last sync, the phone's win and go to the pantry.
      const shared = readShared()
      const storesChanged = JSON.stringify(s.stores) !== JSON.stringify(s.storesBaseline)
      if (storesChanged) writeSharedStores(s.stores)
      const stores = storesChanged ? s.stores : shared.stores
      setState({
        ...s, items, baseline: structuredClone(merged), order: [...new Set([...s.order, ...Object.keys(items)])], session, sync: null,
        lastSyncedAt: new Date().toISOString(),
        recipes: shared.recipes, categories: shared.categories, stores, storesBaseline: structuredClone(stores),
        lastStoreId: stores.some((x) => x.id === s.lastStoreId) ? s.lastStoreId : stores[0]?.id ?? null,
      })
      const total = changed.size
      toast(total ? `Synced ${total} ${total === 1 ? "change" : "changes"} with your pantry` : "Up to date with your pantry")
    }, 500)
    return () => clearTimeout(t)
  }, [phase])

  // Derived values used on several screens.
  const store = state.stores.find((s) => s.id === state.lastStoreId) ?? null
  const sessionStore = state.session ? state.stores.find((s) => s.id === state.session!.storeId) ?? null : null
  const aisles = state.session ? shopAisles(state, state.session) : []
  const outgoing = outgoingChanges(state.items, state.baseline)

  return { state, actions, store, sessionStore, aisles, outgoing }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const value = useShoppingState()
  return <StateContext.Provider value={value}>{children}</StateContext.Provider>
}
