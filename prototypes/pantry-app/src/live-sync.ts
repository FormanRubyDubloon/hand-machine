// Keeps Collca on the web in step with Supabase by itself. There is no Sync button (Isaac's decision,
// 20 November 2026, the same as the phone). It syncs:
// - after a change here, once you pause (CHANGE_SETTLE_MS), so edits go out without asking;
// - when Claude or the phone changes something: every change they make writes a History row, and
//   Supabase Realtime tells us about new ones (20261120160000_history_realtime). Claude's changes are
//   said in a toast. Several changes close together become one sync and one toast;
// - on coming back to the tab (at most once a minute), when the connection comes back, and every two
//   minutes while the tab is visible, in case the live connection dropped.
// Every one is a background sync: no "Synced" toasts and no error toasts. The header says when changes
// are waiting or a sync didn't go through (app.tsx), and the next sync tries again.
import * as React from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { usePantry } from "./state"

const SETTLE_MS = 800
const CHANGE_SETTLE_MS = 1500
const BUSY_RETRY_MS = 500
const FOCUS_GAP_MS = 60_000
const EVERY_MS = 120_000

function isOnline() {
  return typeof navigator === "undefined" || navigator.onLine !== false
}

/** Returns whether the browser thinks it's online, for the header. */
export function useLiveSync(enabled: boolean, userId: string | undefined): { online: boolean } {
  const { actions, syncing, state, pending } = usePantry()
  // Read inside timers and listeners, so they always see the latest.
  const latest = React.useRef({ actions, syncing })
  React.useEffect(() => { latest.current = { actions, syncing } })
  const [online, setOnline] = React.useState(isOnline)
  // Set by the main effect: asks for a sync after `ms`, or now.
  const request = React.useRef<(ms?: number) => void>(() => {})

  React.useEffect(() => {
    if (!enabled || !userId) return
    let heard: string[] = []
    let timer: ReturnType<typeof setTimeout> | undefined
    let lastSync = Date.now()

    const pull = async () => {
      if (!isOnline()) return
      // A sync already running would skip ours: try again when it's done.
      if (latest.current.syncing) {
        timer = setTimeout(() => void pull(), BUSY_RETRY_MS)
        return
      }
      const titles = heard
      heard = []
      lastSync = Date.now()
      const ok = await latest.current.actions.syncNow({ quiet: true, background: true })
      if (!ok || !titles.length) return
      toast(titles.length === 1 ? `Claude: ${titles[0]}` : `Claude made ${titles.length} changes`, {
        description: titles.length > 1 ? titles.slice(0, 3).join(" · ") + (titles.length > 3 ? " …" : "") : undefined,
      })
    }
    request.current = (ms = 0) => {
      clearTimeout(timer)
      timer = setTimeout(() => void pull(), ms)
    }

    // Changes made somewhere else: Claude and the phone. This computer's own rows are "you".
    const channel = supabase
      .channel(`pantry-changes-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "history", filter: "who=neq.you" }, (payload) => {
        const row = payload.new as { who?: string; title?: string }
        if (row.who === "claude") heard.push(row.title ?? "Changed the pantry")
        // Wait for a pause, so a batch of changes is one sync.
        request.current(SETTLE_MS)
      })
      .subscribe()

    const back = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastSync < FOCUS_GAP_MS) return
      request.current()
    }
    const up = () => {
      setOnline(true)
      request.current()
    }
    const down = () => setOnline(false)
    const every = setInterval(() => {
      if (document.visibilityState === "visible") request.current()
    }, EVERY_MS)
    document.addEventListener("visibilitychange", back)
    window.addEventListener("focus", back)
    window.addEventListener("online", up)
    window.addEventListener("offline", down)

    return () => {
      clearTimeout(timer)
      clearInterval(every)
      request.current = () => {}
      document.removeEventListener("visibilitychange", back)
      window.removeEventListener("focus", back)
      window.removeEventListener("online", up)
      window.removeEventListener("offline", down)
      void supabase.removeChannel(channel)
    }
  }, [enabled, userId])

  // A change here: send it once you pause. Each edit restarts the wait. A sync that fails leaves the
  // state as it was, so this doesn't loop; the two-minute sync or the connection coming back retries.
  React.useEffect(() => {
    if (enabled && pending > 0) request.current(CHANGE_SETTLE_MS)
  }, [enabled, state, pending])

  return { online }
}
