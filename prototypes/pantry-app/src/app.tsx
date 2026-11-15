import * as React from "react"
import { ChevronDownIcon, CloudIcon, PlusIcon, SettingsIcon, SmartphoneIcon, SparklesIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "@/components/ui/sonner"
import { isToday, timeText, shortDate } from "./model"
import { signOutOfSupabase, useAuthSession } from "../../shared/src/auth"
import { navigate, useRoute, type Route } from "./router"
import { PantryProvider, usePantry } from "./state"
import { Search } from "./search"
import { AddWithClaude } from "./screens/claude"
import { ConflictsDialog } from "./screens/conflicts"
import { Home } from "./screens/home"
import { ImportScreen } from "./screens/import"
import { ListScreen } from "./screens/list"
import { PantryScreen } from "./screens/pantry"
import { RecipeFull } from "./screens/recipe"
import { RecipesScreen } from "./screens/recipes"
import { Settings } from "./screens/settings"
import { isDark, subscribeTheme } from "./theme"
import { SignIn } from "./screens/signin"

const nav: { label: string; route: Route; match: Route["name"][] }[] = [
  { label: "Home", route: { name: "home" }, match: ["home"] },
  { label: "Pantry", route: { name: "pantry" }, match: ["pantry", "import"] },
  { label: "Recipes", route: { name: "recipes", tab: "cook" }, match: ["recipes", "recipe-full"] },
  { label: "Shopping list", route: { name: "list" }, match: ["list"] },
]

const syncText = (iso: string) => `Phone synced ${isToday(iso) ? "today" : shortDate(iso)}, ${timeText(iso)}`

/** Demo controls: things a real backend would do. Kept out of the way, top right. */
function DemoMenu() {
  const { actions } = usePantry()
  const [open, setOpen] = React.useState(false)
  const run = (fn: () => void) => () => {
    fn()
    setOpen(false)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="px-2 text-muted-foreground">
          Demo
          <ChevronDownIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-1 p-2">
        <p className="px-2 pt-1 pb-2 text-xs text-muted-foreground">Fakes for the prototype. Shares its data with the shopping app.</p>
        <Button variant="ghost" className="h-auto justify-start py-2 text-left normal-case tracking-normal" onClick={run(actions.simulatePhoneSync)}>
          <span className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-semibold">Simulate a phone sync</span>
            <span className="text-xs font-normal text-muted-foreground">A shop comes in. Eggs and lemons changed in both places.</span>
          </span>
        </Button>
        <Button variant="ghost" className="h-auto justify-start py-2 text-left normal-case tracking-normal" asChild>
          <a href="/prototypes/shopping-list/" target="_blank" rel="noreferrer">
            <span className="flex flex-col items-start gap-0.5">
              <span className="text-sm font-semibold">Open the shopping app</span>
              <span className="text-xs font-normal text-muted-foreground">In a new tab. Its syncs show up here.</span>
            </span>
          </a>
        </Button>
        <Separator className="my-1" />
        <Button variant="ghost" className="h-auto justify-start py-2 text-left normal-case tracking-normal" onClick={run(() => actions.resetDemo())}>
          <span className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-semibold">Reset demo data</span>
            <span className="text-xs font-normal text-muted-foreground">Both apps go back to the seed.</span>
          </span>
        </Button>
        <Button variant="ghost" className="h-auto justify-start py-2 text-left normal-case tracking-normal" onClick={run(() => void signOutOfSupabase())}>
          <span className="text-sm font-semibold">Sign out</span>
        </Button>
      </PopoverContent>
    </Popover>
  )
}

/** Sends this computer's changes to Supabase and brings back what changed there. */
function SyncButton() {
  const { db, actions, syncing, pending } = usePantry()
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={syncing}
      onClick={() => void actions.syncNow()}
      title={db.syncedAt ? `Last synced ${isToday(db.syncedAt) ? "today" : shortDate(db.syncedAt)}, ${timeText(db.syncedAt)}` : "Not synced yet"}
    >
      <CloudIcon className={cn(syncing && "animate-pulse")} />
      {syncing ? "Syncing" : pending ? `Sync · ${pending}` : "Sync"}
    </Button>
  )
}

function Header({ route, onAddWithClaude }: { route: Route; onAddWithClaude: () => void }) {
  const { phoneSyncedAt } = usePantry()
  const onRecipes = route.name === "recipes" || route.name === "recipe-full"
  return (
    <header className="flex h-16 shrink-0 items-center gap-10 border-b border-border px-8">
      <a href="#/" className="text-base font-semibold tracking-[0.12em] uppercase">
        Pantry
      </a>
      <nav aria-label="Main" className="flex flex-1 gap-7 self-stretch">
        {nav.map((n) => {
          const current = n.match.includes(route.name)
          return (
            <a
              key={n.label}
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
      <Search />
      <span className="flex shrink-0 items-center gap-1.5 text-[13px] text-muted-foreground" title="When the shopping app last synced with the pantry">
        <SmartphoneIcon className="size-3.5" aria-hidden="true" />
        {syncText(phoneSyncedAt)}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <SyncButton />
        <DemoMenu />
        <Button variant="outline" size="icon" aria-label="Settings" title="Settings" onClick={() => navigate({ name: "settings", tab: "general" })}>
          <SettingsIcon className="size-4.5" />
        </Button>
        {onRecipes ? (
          <Button onClick={onAddWithClaude}>
            <SparklesIcon />
            Add with Claude
          </Button>
        ) : (
          <Button onClick={() => navigate({ name: "pantry", item: "new" })}>
            <PlusIcon />
            Add item
          </Button>
        )}
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
    case "home": return <Home />
    case "pantry": return <PantryScreen route={route} />
    case "import": return <ImportScreen />
    case "recipes": return <RecipesScreen route={route} />
    case "recipe-full": return <RecipeFull id={route.id} item={route.item} />
    case "list": return <ListScreen route={route} />
    case "settings": return <Settings tab={route.tab} />
  }
}

function Shell() {
  const { db, actions } = usePantry()
  const { signedIn, session } = useAuthSession()
  // Sync once on opening, so changes made elsewhere (Claude, the phone) show without pressing Sync.
  // It waits for a live session: a stored token alone can't reach Supabase.
  const opened = React.useRef(false)
  React.useEffect(() => {
    if (!session || opened.current) return
    opened.current = true
    void actions.syncNow({ quiet: true })
  }, [session, actions])
  const route = useRoute()
  const [claude, setClaude] = React.useState(false)
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
  return (
    <div className="flex h-dvh min-w-[1180px] flex-col bg-background">
      <Header route={route} onAddWithClaude={() => setClaude(true)} />
      <ConflictBanner onReview={() => setConflicts(true)} />
      <main className="flex min-h-0 flex-1">
        <Screen route={route} />
      </main>
      <AddWithClaude open={claude} onOpenChange={setClaude} />
      <ConflictsDialog open={conflicts && count > 0} onOpenChange={setConflicts} />
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
