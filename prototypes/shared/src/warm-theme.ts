// Turns the warm reskin on (see prototypes/shared/RESKIN-WARM.md).
// Add ?theme=ds to the address to see the app on the hand-machine design system instead.
// That's there so the two looks can be compared side by side.
export function applyWarmTheme() {
  const off = new URLSearchParams(window.location.search).get("theme") === "ds"
  document.documentElement.classList.toggle("theme-warm", !off)
}
