import * as React from "react"
import { CloudIcon, PlusIcon, SettingsIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"
import { isToday, timeText, shortDate } from "./model"
import { markSetupDone, setupDone, useAuthSession } from "../../shared/src/auth"
import { hasRemotePantry } from "../../shared/src/pantry-remote"
import { navigate, useRoute, type Route } from "./router"
import { PantryProvider, usePantry } from "./state"
import { Search } from "./search"
import { ConflictsDialog } from "./screens/conflicts"
import { Home } from "./screens/home"
import { ImportScreen } from "./screens/import"
import { ListScreen } from "./screens/list"
import { PantryScreen } from "./screens/pantry"
import { RecipeFull } from "./screens/recipe-page"
import { RecipesScreen } from "./screens/recipes"
import { Settings } from "./screens/settings"
import { isDark, subscribeTheme } from "./theme"
import { SignIn } from "./screens/signin"
import { Setup } from "./screens/setup"
import { useLiveSync } from "./live-sync"
import { goHomeForTour, IntroDialog, Tour } from "./intro"

const nav: { label: string; route: Route; match: Route["name"][] }[] = [
  { label: "Home", route: { name: "home" }, match: ["home"] },
  { label: "Pantry", route: { name: "pantry" }, match: ["pantry", "import"] },
  { label: "Recipes", route: { name: "recipes", tab: "cook" }, match: ["recipes", "recipe-full"] },
  { label: "Shopping list", route: { name: "list" }, match: ["list"] },
]

/** Sends this computer's changes to Supabase and brings back what changed there. */
function SyncButton() {
  const { db, actions, syncing, pending } = usePantry()
  return (
    <Button
      variant="outline"
      size="sm"
      data-tour="sync"
      disabled={syncing}
      onClick={() => void actions.syncNow()}
      title={db.syncedAt ? `Last synced ${isToday(db.syncedAt) ? "today" : shortDate(db.syncedAt)}, ${timeText(db.syncedAt)}` : "Not synced yet"}
    >
      <CloudIcon className={cn(syncing && "animate-pulse")} />
      {syncing ? "Syncing" : pending ? `Sync · ${pending}` : "Sync"}
    </Button>
  )
}

function Header({ route }: { route: Route }) {
  return (
    // Three columns: logo and nav, search in the centre of the header, buttons on the right.
    <header className="grid h-16 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-10 border-b border-border px-8">
      <div className="flex items-center gap-10 self-stretch">
        <a href="#/" className="text-base font-semibold tracking-[0.12em] uppercase">
          Collca
        </a>
        <nav aria-label="Main" className="flex flex-1 gap-7 self-stretch">
          {nav.map((n) => {
            const current = n.match.includes(route.name)
            return (
              <a
                key={n.label}
                data-tour={`nav-${n.route.name}`}
                href={`#/${n.route.name === "home" ? "" : n.route.name === "recipes" ? "recipes/cook" : n.route.name}`}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex items-center border-b-2 pt-0.5 text-xs font-semibold tracking-widest uppercase transition-colors",
                  current ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {n.label}
              </a>
            )
          })}
        </nav>
      </div>
      <Search />
      <div className="flex shrink-0 items-center justify-end gap-2">
        <SyncButton />
        <Button variant="outline" size="icon" aria-label="Settings" title="Settings" data-tour="settings" onClick={() => navigate({ name: "settings", tab: "general" })}>
          <SettingsIcon className="size-4.5" />
        </Button>
        <Button data-tour="add-item" onClick={() => navigate({ name: "pantry", item: "new" })}>
          <PlusIcon />
          Add item
        </Button>
      </div>
    </header>
  )
}

/** After a phone sync with items changed in both places. Stays until you choose. */
function ConflictBanner({ onReview }: { onReview: () => void }) {
  const { db } = usePantry()
  const n = db.conflicts.length
  if (!n) return null
  return (
    <div className="flex shrink-0 items-center justify-between gap-4 bg-primary px-8 py-3 text-primary-foreground">
      <span className="text-sm">
        <strong className="font-semibold">{n === 1 ? "1 item" : `${n} items`} changed in two places.</strong>{" "}
        <span className="text-primary-foreground/70">Your phone synced a shop. Until you choose, {n === 1 ? "it keeps" : "they keep"} the value from here.</span>
      </span>
      <Button variant="secondary" size="sm" className="bg-background text-foreground hover:bg-muted" onClick={onReview}>
        Choose
      </Button>
    </div>
  )
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case "home": return <Home item={route.item} recipe={route.recipe} />
    case "pantry": return <PantryScreen route={route} />
    case "import": return <ImportScreen />
    case "recipes": return <RecipesScreen route={route} />
    case "recipe-full": return <RecipeFull key={route.id} id={route.id} tab={route.tab ?? "cook"} item={route.item} serves={route.serves} />
    case "list": return <ListScreen route={route} />
    case "settings": return <Settings tab={route.tab} store={route.store} />
  }
}

function Shell() {
  const { db, actions } = usePantry()
  const { signedIn, session } = useAuthSession()
  // A new account goes through Setup first. One that already has a pantry (made before Setup existed)
  // is marked done instead of being asked. Without a live session there's nothing to ask, so carry on.
  const [setup, setSetup] = React.useState<"checking" | "show" | "done">("checking")
  const userId = session?.user.id
  React.useEffect(() => {
    if (!session) return
    if (setupDone(session)) return setSetup("done")
    let live = true
    void hasRemotePantry().then((has) => {
      if (!live) return
      if (has) void markSetupDone()
      setSetup(has ? "done" : "show")
    })
    return () => { live = false }
    // Only when the account changes, not on every token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])
  const ready = !session || setup === "done"
  // Sync once on opening, so changes made elsewhere (Claude, the phone) show without pressing Sync.
  // It waits for a live session (a stored token alone can't reach Supabase) and for Setup.
  const opened = React.useRef(false)
  React.useEffect(() => {
    if (!session || !ready || opened.current) return
    opened.current = true
    void actions.syncNow({ quiet: true })
  }, [session, ready, actions])
  // After that, Claude's changes come in by themselves, and coming back to the tab syncs (live-sync.ts).
  useLiveSync(!!session && ready, userId)
  // The welcome, then the optional tour (intro.tsx). Only for a new account: it opens when Setup finishes,
  // so existing accounts never see it.
  const [intro, setIntro] = React.useState(false)
  const [tour, setTour] = React.useState(false)
  const startTour = () => {
    setIntro(false)
    goHomeForTour()
    // Let Home draw before the tour looks for its targets.
    setTimeout(() => setTour(true), 250)
  }
  const route = useRoute()
  const [conflicts, setConflicts] = React.useState(false)
  // PAN-19 opens by itself when a sync brings conflicts in.
  const count = db.conflicts.length
  const [seen, setSeen] = React.useState(count)
  if (count !== seen) {
    setSeen(count)
    if (count > seen) setConflicts(true)
  }

  if (signedIn === undefined) return null
  if (!signedIn) return <SignIn />
  if (session && setup === "checking") return null
  if (session && setup === "show") return <Setup onDone={() => { setSetup("done"); setIntro(true) }} />
  return (
    <div className="flex h-dvh min-w-[1180px] flex-col bg-background">
      <Header route={route} />
      <ConflictBanner onReview={() => setConflicts(true)} />
      <main className="flex min-h-0 flex-1">
        <Screen route={route} />
      </main>
      <ConflictsDialog open={conflicts && count > 0} onOpenChange={setConflicts} />
      <IntroDialog open={intro && ready} onSkip={() => setIntro(false)} onTour={startTour} />
      {tour && <Tour onDone={() => setTour(false)} />}
    </div>
  )
}

export function App() {
  const dark = React.useSyncExternalStore(subscribeTheme, isDark)
  return (
    <PantryProvider>
      <Shell />
      {/* Bottom left, so a toast never covers the buttons of a right-hand panel. */}
      <Toaster theme={dark ? "dark" : "light"} position="bottom-left" />
    </PantryProvider>
  )
}
