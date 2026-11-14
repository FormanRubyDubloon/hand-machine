import { AnimatePresence, MotionConfig, motion } from "motion/react"
import { Toaster } from "@/components/ui/sonner"
import * as React from "react"
import { useRoute, type Route } from "./router"
import { AppStateProvider, useApp } from "./state"
import { AislesDrawer } from "./screens/aisles"
import { Done } from "./screens/done"
import { EditStore } from "./screens/edit-store"
import { Home } from "./screens/home"
import { MenuDrawer } from "./screens/menu"
import { RecipeDetail, Recipes } from "./screens/recipes"
import { Shop } from "./screens/shop"
import { SignIn } from "./screens/signin"
import { Stores } from "./screens/stores"
import { SyncConflict, SyncOffline, SyncReview } from "./screens/sync"

function CurrentScreen() {
  const current = useRoute()
  // The menu and the aisle list are drawers over the screen you came from, so keep showing that screen.
  const behind = React.useRef<Route>({ name: "home" })
  if (current.name !== "menu" && current.name !== "aisles") behind.current = current
  const route = behind.current
  return (
    <>
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={route.name + ("id" in route ? route.id : "")}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } }}
        exit={{ opacity: 0, transition: { duration: 0.1, ease: "easeIn" } }}
      >
        {screenFor(route)}
      </motion.div>
    </AnimatePresence>
    <MenuDrawer open={current.name === "menu"} />
    <AislesDrawer open={current.name === "aisles"} />
    </>
  )
}

function screenFor(route: ReturnType<typeof useRoute>) {
  switch (route.name) {
    case "home": return <Home />
    case "shop": return <Shop />
    case "aisles": return null
    case "menu": return null
    case "recipes": return <Recipes />
    case "recipe": return <RecipeDetail id={route.id} />
    case "done": return <Done />
    case "stores": return <Stores />
    case "edit-store": return <EditStore id={route.id} />
    case "sync": return <SyncReview />
    case "sync-conflict": return <SyncConflict />
    case "sync-offline": return <SyncOffline />
  }
}

/** Signed out, only the sign-in screen shows. */
function Frame() {
  const { state } = useApp()
  return (
    <div className="min-h-dvh bg-muted">
      <div className="mx-auto max-w-[430px] bg-background shadow-sm sm:border-x sm:border-border">
        {state.signedIn ? <CurrentScreen /> : <SignIn />}
      </div>
    </div>
  )
}

export function App() {
  return (
    <AppStateProvider>
      <MotionConfig reducedMotion="user">
        {/* Phone-first. On a wider screen it sits in a phone-width column. */}
        <Frame />
        <Toaster position="top-center" offset={{ top: "max(16px, env(safe-area-inset-top))" }} mobileOffset={{ top: "max(16px, env(safe-area-inset-top))" }} />
      </MotionConfig>
    </AppStateProvider>
  )
}
