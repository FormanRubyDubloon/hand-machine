// Two choices (claude/handoff-themes.md):
// - Light, dark, or follow the computer: a .dark class on <html>, kept on this computer only.
// - The colour theme, Walnut or Thyme: a .theme-thyme class on <html> (Walnut is no class), kept on
//   this computer and on the account, so the phone matches. The newest choice wins.
// index.html sets both classes before the page draws, from the same keys, so there's no flash.
// Keep its inline script in step with apply() here.
import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import {
  DEFAULT_COLOUR_THEME,
  accountColourTheme,
  asColourTheme,
  colourThemeMetadata,
  newerColourTheme,
  type ColourTheme,
  type ColourThemeChoice,
} from "../../shared/src/colour-theme"

export type ThemeChoice = "auto" | "light" | "dark"

const KEY = "pantry.theme"
const COLOUR_KEY = "collca.colourTheme"

export function getTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    return v === "light" || v === "dark" ? v : "auto"
  } catch {
    return "auto"
  }
}

function getColourChoice(): ColourThemeChoice | undefined {
  try {
    const v = JSON.parse(localStorage.getItem(COLOUR_KEY) ?? "null") as { theme?: unknown; at?: unknown } | null
    const theme = asColourTheme(v?.theme)
    return theme ? { theme, at: typeof v?.at === "string" ? v.at : undefined } : undefined
  } catch {
    return undefined
  }
}

export const getColourTheme = (): ColourTheme => getColourChoice()?.theme ?? DEFAULT_COLOUR_THEME

function saveColourChoice(c: ColourThemeChoice) {
  try {
    localStorage.setItem(COLOUR_KEY, JSON.stringify(c))
  } catch {
    // Private windows can refuse storage. The choice still applies until the page closes.
  }
}

const query = () => window.matchMedia("(prefers-color-scheme: dark)")

const listeners = new Set<() => void>()
export const subscribeTheme = (l: () => void) => {
  listeners.add(l)
  return () => void listeners.delete(l)
}
/** Whether the app is showing dark right now, whatever the choice. */
export const isDark = () => document.documentElement.classList.contains("dark")
/** Whether the computer itself is set to dark, for the "It's dark right now" note. */
export const systemIsDark = () => query().matches

function apply() {
  const choice = getTheme()
  const dark = choice === "auto" ? query().matches : choice === "dark"
  const thyme = getColourTheme() === "thyme"
  const root = document.documentElement
  // A theme change is instant (no fade): switch the controls' colour transitions off for a frame.
  root.classList.add("theme-switching")
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")))
  root.classList.toggle("dark", dark)
  root.classList.toggle("theme-thyme", thyme)
  root.style.colorScheme = dark ? "dark" : "light"
  root.style.background = "" // index.html's stand-in until the CSS arrived
  // The browser's own bar (Safari, installed apps) follows the page colour: --background as hex.
  const bar = thyme ? (dark ? "#344A31" : "#F2EDE0") : dark ? "#2A1D15" : "#F2EFE3"
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.removeAttribute("media")
    m.content = bar
  })
  listeners.forEach((l) => l())
}

export function setTheme(choice: ThemeChoice) {
  try {
    if (choice === "auto") localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, choice)
  } catch {
    // As above.
  }
  apply()
}

/** Changes the colour theme at once, here and on the account. */
export function setColourTheme(theme: ColourTheme) {
  const choice = { theme, at: new Date().toISOString() }
  saveColourChoice(choice)
  apply()
  // Saved to the account in the background. If it fails (offline), this computer keeps it and
  // sends it next time it checks with the account.
  void supabase.auth.getSession().then(({ data }) => {
    if (data.session) return supabase.auth.updateUser({ data: colourThemeMetadata(choice) }).then(() => undefined)
  }).catch(() => {})
}

/**
 * Brings this computer and the account into line: the newer choice wins. Runs when a session
 * appears and when the tab comes back (at most once a minute), so a change made on the phone shows on the next visit.
 * It asks Supabase for the user rather than trusting the stored session, which can be old.
 */
let lastCheck = 0
export async function syncColourTheme(session: Session | null) {
  if (!session || Date.now() - lastCheck < 60_000) return
  lastCheck = Date.now()
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return
    const local = getColourChoice()
    const account = accountColourTheme(data.user.user_metadata)
    const winner = newerColourTheme(local, account)
    if (!winner) return
    if (winner !== local) {
      saveColourChoice(winner)
      apply()
    } else if (local && (!account || account.theme !== local.theme || account.at !== local.at)) {
      await supabase.auth.updateUser({ data: colourThemeMetadata(local) })
    }
  } catch {
    // Offline: try again next time.
  }
}

/** Applies the saved choices, and keeps up with the computer's setting while light or dark is Auto. */
export function initTheme() {
  apply()
  query().addEventListener("change", () => apply())
}
