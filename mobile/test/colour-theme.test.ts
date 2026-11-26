import { describe, expect, it } from "vitest"
import { accountColourTheme, colourThemeMetadata, newerColourTheme } from "../../prototypes/shared/src/colour-theme"

describe("colour theme on the account", () => {
  it("reads the account's choice and ignores anything else", () => {
    expect(accountColourTheme({ colour_theme: "thyme", colour_theme_at: "2026-11-26T10:00:00Z" })).toEqual({ theme: "thyme", at: "2026-11-26T10:00:00Z" })
    expect(accountColourTheme({ colour_theme: "purple" })).toBeUndefined()
    expect(accountColourTheme(undefined)).toBeUndefined()
  })

  it("keeps the newer choice", () => {
    const phone = { theme: "thyme" as const, at: "2026-11-26T10:00:00Z" }
    const web = { theme: "walnut" as const, at: "2026-11-26T11:00:00Z" }
    expect(newerColourTheme(phone, web)).toBe(web)
    expect(newerColourTheme(web, phone)).toBe(web)
  })

  it("keeps this device's on a tie or when neither is dated", () => {
    expect(newerColourTheme({ theme: "thyme" }, { theme: "walnut" })?.theme).toBe("thyme")
    expect(newerColourTheme({ theme: "thyme", at: "x" }, { theme: "walnut", at: "x" })?.theme).toBe("thyme")
  })

  it("takes whichever exists", () => {
    expect(newerColourTheme(undefined, { theme: "thyme" })?.theme).toBe("thyme")
    expect(newerColourTheme({ theme: "walnut" }, undefined)?.theme).toBe("walnut")
  })

  it("writes a dated choice", () => {
    expect(colourThemeMetadata({ theme: "thyme", at: "2026-11-26T10:00:00Z" })).toEqual({ colour_theme: "thyme", colour_theme_at: "2026-11-26T10:00:00Z" })
    expect(colourThemeMetadata({ theme: "walnut" }).colour_theme_at).toMatch(/^\d{4}-/)
  })
})
