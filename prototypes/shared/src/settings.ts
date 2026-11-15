// Settings that change how the pantry is counted, shared by the pantry app, the phone and Claude.
// They live in Supabase (the `settings` table) and are copied here when each one starts. Plain
// code with no React or browser globals, because the Claude connection bundles it too.
export type Settings = {
  /** Bulk items: an open pack counts towards the minimum, like a full one. */
  openCountsTowardsMinimum: boolean
}

export const settings: Settings = { openCountsTowardsMinimum: false }

const listeners = new Set<() => void>()
let version = 0

/** Changes settings in place, so every model function sees them, and tells whoever is listening. */
export function applySettings(next: Partial<Settings>) {
  Object.assign(settings, next)
  version++
  listeners.forEach((l) => l())
}

export const subscribeSettings = (l: () => void) => {
  listeners.add(l)
  return () => void listeners.delete(l)
}
export const settingsVersion = () => version

export type SettingsRow = { open_counts_towards_minimum: boolean }
export const fromSettingsRow = (r: SettingsRow): Settings => ({ openCountsTowardsMinimum: !!r.open_counts_towards_minimum })
