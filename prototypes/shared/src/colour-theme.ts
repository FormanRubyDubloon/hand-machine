// The colour theme: Walnut (the original warm colours) or Thyme (green and mustard).
// See claude/handoff-themes.md. Light or dark is a separate choice, kept on each device.
//
// The colour theme is saved on the account (Supabase Auth user metadata), so the web and the
// phone match. Each device also keeps a local copy, so it starts in the right theme offline.
// When both change it before they next talk, the most recent change wins: it's only a preference.
//
// Used by the pantry app and the phone app, so no React, browser globals or @/ imports here.

export type ColourTheme = "walnut" | "thyme"

export const COLOUR_THEMES: { value: ColourTheme; name: string; description: string }[] = [
  { value: "walnut", name: "Walnut", description: "Cream, brown and olive. The original Collca colours." },
  { value: "thyme", name: "Thyme", description: "Cream, deep green and mustard, with an orange highlight." },
]

// Thyme for anyone who hasn't chosen (Isaac, 27 Nov 2026; it was Walnut).
export const DEFAULT_COLOUR_THEME: ColourTheme = "thyme"

export const colourThemeName = (t: ColourTheme) => COLOUR_THEMES.find((c) => c.value === t)!.name

export function asColourTheme(v: unknown): ColourTheme | undefined {
  return v === "walnut" || v === "thyme" ? v : undefined
}

/** A choice and when it was made (ISO). An unknown time counts as the oldest. */
export type ColourThemeChoice = { theme: ColourTheme; at?: string }

/** The account's choice, from Supabase Auth user metadata. */
export function accountColourTheme(meta: Record<string, unknown> | undefined | null): ColourThemeChoice | undefined {
  const theme = asColourTheme(meta?.colour_theme)
  if (!theme) return undefined
  return { theme, at: typeof meta?.colour_theme_at === "string" ? meta.colour_theme_at : undefined }
}

/** What to send with supabase.auth.updateUser({ data }). */
export const colourThemeMetadata = (c: ColourThemeChoice) => ({ colour_theme: c.theme, colour_theme_at: c.at ?? new Date().toISOString() })

/** The more recent of the two. A tie, or neither dated, keeps this device's. */
export function newerColourTheme(local: ColourThemeChoice | undefined, account: ColourThemeChoice | undefined): ColourThemeChoice | undefined {
  if (!account) return local
  if (!local) return account
  return (account.at ?? "") > (local.at ?? "") ? account : local
}
