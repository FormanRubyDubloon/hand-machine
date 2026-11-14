// A tiny hash router. Hash routes keep Safari's back swipe working
// and survive "Add to Home Screen".
import { useEffect, useSyncExternalStore } from "react"

export type Route =
  | { name: "home" }
  | { name: "shop" }
  | { name: "aisles" }
  | { name: "menu" }
  | { name: "recipes" }
  | { name: "recipe"; id: string }
  | { name: "done" }
  | { name: "stores" }
  | { name: "edit-store"; id: string | null }
  | { name: "sync" }
  | { name: "sync-conflict" }
  | { name: "sync-offline" }

export function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean)
  switch (parts[0]) {
    case "shop": return { name: "shop" }
    case "aisles": return { name: "aisles" }
    case "menu": return { name: "menu" }
    case "recipes":
      return parts[1] ? { name: "recipe", id: decodeURIComponent(parts[1]) } : { name: "recipes" }
    case "done": return { name: "done" }
    case "stores":
      if (parts[1] === "new") return { name: "edit-store", id: null }
      if (parts[1]) return { name: "edit-store", id: decodeURIComponent(parts[1]) }
      return { name: "stores" }
    case "sync":
      if (parts[1] === "conflict") return { name: "sync-conflict" }
      if (parts[1] === "offline") return { name: "sync-offline" }
      return { name: "sync" }
    default: return { name: "home" }
  }
}

export function href(route: Route): string {
  switch (route.name) {
    case "home": return "#/"
    case "edit-store": return route.id ? `#/stores/${encodeURIComponent(route.id)}` : "#/stores/new"
    case "recipe": return `#/recipes/${encodeURIComponent(route.id)}`
    case "sync-conflict": return "#/sync/conflict"
    case "sync-offline": return "#/sync/offline"
    default: return `#/${route.name}`
  }
}

// How many entries this app has pushed, so "back" never leaves the app.
let depth = 0

export function navigate(route: Route, { replace = false } = {}) {
  const url = href(route)
  if (replace) {
    history.replaceState(null, "", url)
    window.dispatchEvent(new HashChangeEvent("hashchange"))
  } else {
    depth++
    location.hash = url
  }
  window.scrollTo(0, 0)
}

export function goBack(fallback: Route) {
  if (depth > 0) {
    depth--
    history.back()
  } else navigate(fallback, { replace: true })
}

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb)
  return () => window.removeEventListener("hashchange", cb)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash)
  return parse(hash)
}

/** Swap the current screen for another, e.g. when there's no shop in progress. */
export function Redirect({ to }: { to: Route }) {
  const url = href(to)
  useEffect(() => navigate(parse(url), { replace: true }), [url])
  return null
}
