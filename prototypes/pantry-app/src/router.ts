// A tiny hash router, like the shopping app's. Panels over a page are routes too,
// so a link to an item or a recipe opens it.
import { useSyncExternalStore } from "react"

export type RecipesTab = "cook" | "all"
export type SettingsTab = "general" | "stores" | "categories" | "claude" | "account"

export type Route =
  | { name: "home" }
  | { name: "pantry"; item?: string; prefill?: string }
  | { name: "import" }
  | { name: "recipes"; tab: RecipesTab; recipe?: string; edit?: boolean }
  | { name: "recipe-full"; id: string; item?: string }
  | { name: "list"; add?: boolean }
  | { name: "settings"; tab: SettingsTab }

export function parse(hash: string): Route {
  const [path, query = ""] = hash.replace(/^#\/?/, "").split("?")
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent)
  const q = new URLSearchParams(query)
  switch (parts[0]) {
    case "pantry":
      if (parts[1] === "import") return { name: "import" }
      return { name: "pantry", item: parts[1], prefill: q.get("name") ?? undefined }
    case "recipes": {
      const tab: RecipesTab = parts[1] === "all" ? "all" : "cook"
      const recipe = parts[1] === "all" || parts[1] === "cook" ? parts[2] : parts[1]
      // An item after "full" is open in the item side panel over the recipe.
      if (parts.includes("full") && recipe) return { name: "recipe-full", id: recipe, item: parts[parts.indexOf("full") + 1] }
      return { name: "recipes", tab, recipe, edit: parts.includes("edit") || undefined }
    }
    case "list":
      return { name: "list", add: parts[1] === "add" || undefined }
    case "settings":
      return { name: "settings", tab: parts[1] === "claude" || parts[1] === "account" || parts[1] === "categories" || parts[1] === "stores" ? parts[1] : "general" }
    default:
      return { name: "home" }
  }
}

const enc = encodeURIComponent

export function href(route: Route): string {
  switch (route.name) {
    case "home": return "#/"
    case "pantry":
      return route.item ? `#/pantry/${enc(route.item)}${route.prefill ? `?name=${enc(route.prefill)}` : ""}` : "#/pantry"
    case "import": return "#/pantry/import"
    case "recipes":
      return `#/recipes/${route.tab}${route.recipe ? `/${enc(route.recipe)}${route.edit ? "/edit" : ""}` : ""}`
    case "recipe-full": return `#/recipes/cook/${enc(route.id)}/full${route.item ? `/${enc(route.item)}` : ""}`
    case "list": return route.add ? "#/list/add" : "#/list"
    case "settings": return `#/settings/${route.tab}`
  }
}

export function navigate(route: Route, { replace = false } = {}) {
  const url = href(route)
  if (replace) {
    history.replaceState(null, "", url)
    window.dispatchEvent(new HashChangeEvent("hashchange"))
  } else location.hash = url
}

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb)
  return () => window.removeEventListener("hashchange", cb)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash)
  return parse(hash)
}
