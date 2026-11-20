// Keeps Collca on the web up to date without pressing Sync.
// - Claude's changes: every change Claude makes writes a History row (who = 'claude'). Supabase Realtime
//   tells us about new ones (20261120160000_history_realtime), and we run a quiet Sync to pull them in,
//   then say what changed in a toast. Several changes close together become one Sync and one toast.
// - Coming back to the tab: a quiet Sync, at most once a minute, in case the live connection dropped
//   or something changed elsewhere (the phone).
// The Sync is the same one the button runs, so anything changed here goes out at the same time.
import * as React from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { usePantry } from "./state"

const SETTLE_MS = 800
const BUSY_RETRY_MS = 500
const FOCUS_GAP_MS = 60_000

export function useLiveSync(enabled: boolean, userId: string | undefined) {
  const { actions, syncing } = usePantry()
  // Read inside timers and listeners, so they always see the latest.
  const latest = React.useRef({ actions, syncing })
  React.useEffect(() => { latest.current = { actions, syncing } })

  React.useEffect(() => {
    if (!enabled || !userId) return
    let heard: string[] = []
    let timer: ReturnType<typeof setTimeout> | undefined
    let lastSync = Date.now()

    const pull = async () => {
      // A Sync already running would skip ours: try again when it's done.
      if (latest.current.syncing) {
        timer = setTimeout(() => void pull(), BUSY_RETRY_MS)
        return
      }
      const titles = heard
      heard = []
      lastSync = Date.now()
      await latest.current.actions.syncNow({ quiet: true })
      if (!titles.length) return
      toast(titles.length === 1 ? `Claude: ${titles[0]}` : `Claude made ${titles.length} changes`, {
        description: titles.length > 1 ? titles.slice(0, 3).join(" · ") + (titles.length > 3 ? " …" : "") : undefined,
      })
    }

    const channel = supabase
      .channel(`claude-changes-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "history", filter: "who=eq.claude" }, (payload) => {
        heard.push((payload.new as { title?: string }).title ?? "Changed the pantry")
        // Wait for a pause, so a batch of changes is one Sync.
        clearTimeout(timer)
        timer = setTimeout(() => void pull(), SETTLE_MS)
      })
      .subscribe()

    const back = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastSync < FOCUS_GAP_MS) return
      clearTimeout(timer)
      void pull()
    }
    document.addEventListener("visibilitychange", back)
    window.addEventListener("focus", back)

    return () => {
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", back)
      window.removeEventListener("focus", back)
      void supabase.removeChannel(channel)
    }
  }, [enabled, userId])
}
