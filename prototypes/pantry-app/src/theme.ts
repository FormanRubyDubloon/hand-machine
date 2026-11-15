// Light, dark, or follow the computer. The design system switches theme with a .dark class on
// <html>. The choice is kept on this computer only; the phone follows its own system setting.
export type ThemeChoice = "auto" | "light" | "dark"

const KEY = "pantry.theme"

export function getTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    return v === "light" || v === "dark" ? v : "auto"
  } catch {
    return "auto"
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

function apply(choice: ThemeChoice) {
  const dark = choice === "auto" ? query().matches : choice === "dark"
  document.documentElement.classList.toggle("dark", dark)
  document.documentElement.style.colorScheme = dark ? "dark" : "light"
  listeners.forEach((l) => l())
}

export function setTheme(choice: ThemeChoice) {
  try {
    if (choice === "auto") localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, choice)
  } catch {
    // Private windows can refuse storage. The choice still applies until the page closes.
  }
  apply(choice)
}

/** Applies the saved choice, and keeps up with the computer's setting while the choice is Auto. */
export function initTheme() {
  apply(getTheme())
  query().addEventListener("change", () => apply(getTheme()))
}
