import { Toaster } from "@/components/ui/sonner"
import { useRoute } from "./router"
import { AppStateProvider } from "./state"
import { Aisles } from "./screens/aisles"
import { Done } from "./screens/done"
import { EditStore } from "./screens/edit-store"
import { Home } from "./screens/home"
import { Menu } from "./screens/menu"
import { Shop } from "./screens/shop"
import { Stores } from "./screens/stores"
import { SyncConflict, SyncOffline, SyncReview } from "./screens/sync"

function CurrentScreen() {
  const route = useRoute()
  switch (route.name) {
    case "home": return <Home />
    case "shop": return <Shop />
    case "aisles": return <Aisles />
    case "menu": return <Menu />
    case "done": return <Done />
    case "stores": return <Stores />
    case "edit-store": return <EditStore id={route.id} />
    case "sync": return <SyncReview />
    case "sync-conflict": return <SyncConflict />
    case "sync-offline": return <SyncOffline />
  }
}

export function App() {
  return (
    <AppStateProvider>
        {/* Phone-first. On a wider screen it sits in a phone-width column. */}
        <div className="min-h-dvh bg-muted">
          <div className="mx-auto max-w-[430px] bg-background shadow-sm sm:border-x sm:border-border">
            <CurrentScreen />
          </div>
        </div>
        <Toaster position="top-center" offset={{ top: "max(16px, env(safe-area-inset-top))" }} mobileOffset={{ top: "max(16px, env(safe-area-inset-top))" }} />
    </AppStateProvider>
  )
}
