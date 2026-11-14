// Follows the OS light/dark setting. The design system switches theme with a .dark class
// on <html>, so this adds or removes it and keeps up if the OS changes while the app is open.
export function followSystemTheme() {
  const query = window.matchMedia("(prefers-color-scheme: dark)")
  const apply = () => {
    document.documentElement.classList.toggle("dark", query.matches)
    document.documentElement.style.colorScheme = query.matches ? "dark" : "light"
  }
  apply()
  query.addEventListener("change", apply)
}
