// The app's state, and keeping it in step with Supabase without a Sync button.
//
// Every change is saved on the phone straight away, so nothing is lost without signal. Then it syncs by itself:
// - shortly after a change (changes close together go as one sync),
// - when the app comes back to the front, and when signal comes back,
// - when Collca on the web or Claude changes something (a new History row, heard through Supabase Realtime),
// - every two minutes while the app is open, in case the live connection dropped.
// With no signal it just waits; the next trigger takes everything that's waiting.
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Network from "expo-network"
import * as React from "react"
import { AppState } from "react-native"
import { factsOf, type Counts } from "../../../prototypes/pantry-app/src/model"
import { itemPrint } from "../logic/merge"
import { uid } from "../logic/actions"
import { refreshShop } from "../logic/list"
import { demoState } from "./demo"
import { DEMO, configured, supabase } from "./supabase"
import { emptyState, type HistoryEntry, type Item, type PhoneState } from "./state"
import { applySync, isNetworkError, pendingCount, runSync } from "./sync"
import { accountColourTheme, colourThemeMetadata, newerColourTheme, type ColourTheme } from "../../../prototypes/shared/src/colour-theme"

// The demo key moves on when the demo seed changes: v2 with Batch 4 (aisles on items), v3 with Batch 6 (a 20-second
// step on Berry porridge, to try a timer's alert quickly).
const KEY = DEMO ? "collca:demo:v4" : "collca:phone:v1"
const AFTER_CHANGE_MS = 1200
const HEARD_MS = 800
const EVERY_MS = 120_000
const FRONT_GAP_MS = 20_000
/** How long a toast with Undo stays up. */
export const TOAST_UNDO_MS = 5000

export type SyncStatus = "idle" | "syncing" | "offline" | "error"
/** How long the Got all and Skip popup stays still between sliding in and out (Isaac, 27 Nov 2026: one or two seconds). */
export const POPUP_HOLD_MS = 2000
/** The popup's slide in, and again out. */
export const POPUP_MOVE_MS = 320
/** popup: shown as the centred popup (the item sheet's Got all and Skip), not the toast at the bottom. */
export type Toast = { id: number; message: string; undo?: () => void; popup?: "got" | "skip" }

/** A History entry for Collca on the web: what changed, and what the items were before, so it can be undone there. */
export type Note = {
  title: string; detail?: string; recipeId?: string; key?: string
  /** How the change counts for Insights (factsOf in the model): a tick-off, a use, a throw-out, cooking. */
  counts?: Counts
}

type Ctx = {
  ready: boolean
  state: PhoneState
  /** Runs a change, saves it and syncs. `note` puts it in Collca's History. */
  change: (fn: (s: PhoneState) => PhoneState, note?: Note | ((before: PhoneState, after: PhoneState) => Note | undefined)) => void
  /** Changes that only matter on this phone (which store, which aisle, the theme): saved, not synced. */
  local: (fn: (s: PhoneState) => PhoneState) => void
  status: SyncStatus
  online: boolean
  pending: number
  lastError?: string
  syncNow: () => Promise<boolean>
  /** A sync the person asked for by pulling a list down. The list shows its own spinner for it. */
  pullToSync: () => Promise<void>
  pulling: boolean
  toast: Toast | null
  say: (message: string, undo?: () => void, popup?: "got" | "skip") => void
  dismissToast: () => void
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  resolveConflict: (itemId: string, keep: "phone" | "other") => void
  /** Changes the colour theme at once; it goes to the account with the next sync. */
  setColourTheme: (theme: ColourTheme) => void
}

const StoreContext = React.createContext<Ctx | null>(null)

export function useStore() {
  const ctx = React.use(StoreContext)
  if (!ctx) throw new Error("useStore outside StoreProvider")
  return ctx
}

/** Items that changed, as they were before: Collca's History uses this to undo the change. */
function beforeOf(before: PhoneState, after: PhoneState): Record<string, Item | null> {
  const out: Record<string, Item | null> = {}
  for (const id of new Set([...Object.keys(before.items), ...Object.keys(after.items)])) {
    if (itemPrint(before.items[id]) !== itemPrint(after.items[id])) out[id] = before.items[id] ?? null
  }
  return out
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<PhoneState>(emptyState)
  const [ready, setReady] = React.useState(false)
  const [status, setStatus] = React.useState<SyncStatus>("idle")
  const [online, setOnline] = React.useState(true)
  const [lastError, setLastError] = React.useState<string>()
  const [toast, setToast] = React.useState<Toast | null>(null)
  const [pulling, setPulling] = React.useState(false)

  // Timers and listeners read the latest state through this.
  const ref = React.useRef(state)
  const running = React.useRef<Promise<boolean> | null>(null)
  const again = React.useRef(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastSync = React.useRef(0)

  const put = React.useCallback((next: PhoneState) => {
    ref.current = next
    setState(next)
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {})
  }, [])

  // ----- load what's on the phone -----
  React.useEffect(() => {
    void (async () => {
      let saved: PhoneState | null = null
      try {
        const raw = await AsyncStorage.getItem(KEY)
        saved = raw ? (JSON.parse(raw) as PhoneState) : null
      } catch {
        saved = null
      }
      if (!saved && DEMO) saved = demoState()
      if (saved) {
        const next = { ...emptyState(), ...saved }
        ref.current = next
        setState(next)
      }
      setReady(true)
    })()
  }, [])

  // ----- syncing -----
  /**
   * The colour theme lives on the account (Supabase Auth user metadata), so it rides along with each sync
   * rather than with the pantry's tables. A change made here is sent; otherwise the account's is read and
   * the newer of the two wins. It's only a preference, so there's no clash to ask about.
   */
  const syncColourTheme = React.useCallback(async () => {
    try {
      const local = ref.current.colourTheme
      if (local?.unsent) {
        const { error } = await supabase.auth.updateUser({ data: colourThemeMetadata(local) })
        if (!error && ref.current.colourTheme === local) put({ ...ref.current, colourTheme: { theme: local.theme, at: local.at } })
        return
      }
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) return
      const account = accountColourTheme(data.user.user_metadata)
      const winner = newerColourTheme(local, account)
      if (winner && winner === account && ref.current.colourTheme === local) put({ ...ref.current, colourTheme: { theme: account.theme, at: account.at } })
    } catch {
      // Offline or signed out: the phone keeps its own and tries again at the next sync.
    }
  }, [put])

  const syncNow = React.useCallback(async (): Promise<boolean> => {
    if (DEMO) {
      put({ ...ref.current, synced: { items: ref.current.items, categories: ref.current.categories, stores: ref.current.stores, recipes: ref.current.recipes }, outbox: [], syncedAt: new Date().toISOString() })
      return true
    }
    if (!configured || !ref.current.owner) return false
    // One at a time. A trigger during a sync runs once more afterwards.
    if (running.current) {
      again.current = true
      return running.current
    }
    const run = (async () => {
      setStatus("syncing")
      lastSync.current = Date.now()
      const sent = ref.current
      try {
        const { data } = await supabase.auth.getSession()
        if (!data.session) throw new Error("Not signed in")
        const outcome = await runSync(sent)
        const next = applySync(ref.current, sent, outcome)
        put({ ...next, shop: next.shop ? refreshShop(next.shop, next.items) : next.shop })
        await syncColourTheme()
        setStatus("idle")
        setLastError(undefined)
        return true
      } catch (e) {
        const offline = isNetworkError(e)
        setStatus(offline ? "offline" : "error")
        setLastError(offline ? undefined : e instanceof Error ? e.message : String(e))
        if (!offline) console.warn("Sync failed:", e)
        return false
      } finally {
        running.current = null
      }
    })()
    running.current = run
    const ok = await run
    if (again.current) {
      again.current = false
      void syncNow()
    }
    return ok
  }, [put, syncColourTheme])

  const pullToSync = React.useCallback(async () => {
    setPulling(true)
    try {
      await syncNow()
    } finally {
      setPulling(false)
    }
  }, [syncNow])

  const soon = React.useCallback((ms: number) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => void syncNow(), ms)
  }, [syncNow])

  // ----- changes -----
  const change = React.useCallback<Ctx["change"]>((fn, note) => {
    const before = ref.current
    const after = fn(before)
    if (after === before) return
    const n = typeof note === "function" ? note(before, after) : note
    let outbox = after.outbox
    if (n && !DEMO) {
      const items = beforeOf(before, after)
      // How it counts for Insights: said by the note, or known from its key (shop: is a tick-off, stock: a
      // stepper). A tick-off belongs to the store you're in and to this shop (its start is its id).
      const c = n.counts ?? (n.key?.startsWith("shop:") ? { as: "shop" as const } : n.key?.startsWith("stock:") ? { as: "stock" as const } : undefined)
      const counts = c?.as === "shop" ? { storeId: after.storeId ?? before.storeId, shopId: (after.shop ?? before.shop)?.startedAt, ...c } : c
      const entry: HistoryEntry = {
        id: uid("phone"), at: new Date().toISOString(), who: "phone", title: n.title, detail: n.detail,
        itemIds: Object.keys(items), recipeId: n.recipeId, undo: Object.keys(items).length ? { items } : undefined,
      }
      // Taps in a row on one thing (ticking eggs one by one) are one History entry, undoing back to before the first.
      const last = outbox[outbox.length - 1]
      if (n.key && last?.key === n.key && Date.now() - Date.parse(last.at) < 10 * 60_000) {
        const undo = { items: { ...items, ...(last.undo?.items ?? {}) } }
        // Facts from the first "before" to now, so ticks taken back net out.
        const facts = counts ? factsOf(undo.items, after.items, counts) : undefined
        outbox = [...outbox.slice(0, -1), { ...entry, id: last.id, key: n.key, itemIds: Object.keys(undo.items), undo, facts: facts?.length ? facts : undefined }]
      } else {
        const facts = counts ? factsOf(items, after.items, counts) : undefined
        outbox = [...outbox, { ...entry, key: n.key, facts: facts?.length ? facts : undefined }]
      }
    }
    put({ ...after, outbox })
    soon(AFTER_CHANGE_MS)
  }, [put, soon])

  const local = React.useCallback((fn: (s: PhoneState) => PhoneState) => put(fn(ref.current)), [put])

  // ----- triggers -----
  const owner = state.owner?.id
  React.useEffect(() => {
    if (!ready || !owner || DEMO) return
    void syncNow()
    const appState = AppState.addEventListener("change", (s) => {
      if (s === "active" && Date.now() - lastSync.current > FRONT_GAP_MS) void syncNow()
    })
    const net = Network.addNetworkStateListener((e) => {
      const up = !!e.isConnected && e.isInternetReachable !== false
      setOnline(up)
      if (up) soon(500)
    })
    void Network.getNetworkStateAsync().then((e) => setOnline(!!e.isConnected && e.isInternetReachable !== false)).catch(() => {})
    const every = setInterval(() => {
      if (AppState.currentState === "active") void syncNow()
    }, EVERY_MS)
    // Anything Collca on the web or Claude does writes a History row. The phone's own rows are left out.
    const channel = supabase
      .channel(`phone-${owner}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "history", filter: "who=neq.phone" }, () => soon(HEARD_MS))
      .subscribe()
    return () => {
      appState.remove()
      net.remove()
      clearInterval(every)
      void supabase.removeChannel(channel)
    }
  }, [ready, owner, syncNow, soon])

  // ----- toasts -----
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const say = React.useCallback((message: string, undo?: () => void, popup?: "got" | "skip") => {
    clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), message, undo, popup })
    // The popup times itself, so it can slide out before it goes; it calls dismissToast when it's done.
    if (!popup) toastTimer.current = setTimeout(() => setToast(null), undo ? TOAST_UNDO_MS : 3200)
  }, [])
  const dismissToast = React.useCallback(() => {
    clearTimeout(toastTimer.current)
    setToast(null)
  }, [])

  // ----- signing in and out -----
  const signIn = React.useCallback(async (email: string, password: string) => {
    if (DEMO) {
      put({ ...demoState(), owner: { id: "demo", email } })
      return null
    }
    if (!configured) return "The app isn't set up with the pantry's address yet. See mobile/README.md."
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) return /invalid login/i.test(error.message) ? "That email and password don't match." : isNetworkError(error) ? "No signal. Try again when you're online." : error.message
    const user = data.user
    // A different account: start from its pantry, not the last one's.
    const mine = ref.current.owner?.id === user.id
    put(mine ? ref.current : { ...emptyState(), theme: ref.current.theme, owner: { id: user.id, email: user.email ?? email } })
    return null
  }, [put])

  const signOut = React.useCallback(async () => {
    if (!DEMO) await supabase.auth.signOut({ scope: "local" }).catch(() => {})
    // Light or dark and the colour theme stay, so the sign-in screen looks the same.
    put({ ...emptyState(), theme: ref.current.theme, colourTheme: ref.current.colourTheme })
  }, [put])

  // ----- changed in two places -----
  const resolveConflict = React.useCallback((itemId: string, keep: "phone" | "other") => {
    const s = ref.current
    const c = s.conflicts.find((x) => x.itemId === itemId)
    if (!c || !s.synced) return
    const conflicts = s.conflicts.filter((x) => x.itemId !== itemId)
    if (keep === "phone") {
      // Treat the other side's version as the last synced one, so the phone's goes up next.
      put({ ...s, conflicts, synced: { ...s.synced, items: { ...s.synced.items, [itemId]: c.remote } } })
    } else {
      put({ ...s, conflicts, items: { ...s.items, [itemId]: c.remote }, synced: { ...s.synced, items: { ...s.synced.items, [itemId]: c.remote } } })
    }
    soon(300)
  }, [put, soon])

  const setColourTheme = React.useCallback((theme: ColourTheme) => {
    put({ ...ref.current, colourTheme: { theme, at: new Date().toISOString(), unsent: true } })
    soon(300)
  }, [put, soon])

  const pending = React.useMemo(() => pendingCount(state), [state])

  const value: Ctx = {
    ready, state, change, local, status, online, pending, lastError, syncNow, pullToSync, pulling, toast, say, dismissToast, signIn, signOut, resolveConflict, setColourTheme,
  }
  return <StoreContext value={value}>{children}</StoreContext>
}
