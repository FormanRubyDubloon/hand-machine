// Design tokens. Two choices pick one of four sets (claude/handoff-themes.md):
// - the colour theme, Walnut (the original warm colours) or Thyme (green and mustard), saved on the account;
// - light or dark, kept on this phone.
// Each set matches the web's theme-warm.css (Walnut) or theme-thyme.css (Thyme); keep them in step.
// The item sheet, cooking view and toast are always dark ("focused mode"): deep brown in Walnut, deep green in Thyme.
import * as React from "react"
import { AccessibilityInfo, Platform, useColorScheme } from "react-native"
import { useStore } from "../data/store"
import { DEFAULT_COLOUR_THEME, type ColourTheme } from "../../../prototypes/shared/src/colour-theme"

/** The always-dark screens: list item sheet, cooking view, toast, Shop done screen. */
export type Focus = {
  bg: string; ink: string; gold: string; onGold: string; place: string; label: string; field: string
  danger: string; toast: string; line: string; press: string; placeholder: string
  /** A highlight badge on the dark screens (Shop done's "Has most"): orange in Thyme, gold in Walnut. */
  badge: string; onBadge: string
  /** Shop done's string bag: the soft green of the leek and vegetable, and the orange. */
  leaf: string; fruit: string
}

// bg = background, muted = muted-foreground, primary and onPrimary = primary and primary-foreground,
// panel = muted, line = border, stone = line-strong, input = input (field edges, 3:1),
// danger and onDanger = destructive and destructive-foreground. placeholder and press are phone only.
export type Colours = {
  bg: string; ink: string; muted: string; primary: string; onPrimary: string; panel: string; line: string; stone: string
  input: string; danger: string; onDanger: string; press: string; placeholder: string
  link: string; navActive: string; statusOut: string; onStatusOut: string; statusLow: string; statusLowBorder: string; onStatusLow: string
  /** Home's Tonight pot (HOME-1): its body and the knob on its lid, drawn on the statusOut card. Decorative only. */
  potBody: string; potKnob: string
  /** Home's Tonight card fill and its text: statusOut, except a warm cream in Thyme light (Isaac, 26 Nov 2026). */
  tonight: string; onTonight: string
  /** Home's shop bar fill, its text and its second line: focus.bg, except olive in Thyme light (Isaac, 26 Nov 2026). */
  shopBar: string; onShopBar: string; shopBarLabel: string
  focus: Focus
}

const walnutFocus: Focus = {
  bg: "#3D2B1F", ink: "#F2EFE3", gold: "#C2A86A", onGold: "#1F1712", place: "#DCC79D", label: "#C0BCAE", field: "#2A1D15",
  danger: "#E59A86", toast: "#2A1D15", line: "rgba(242,239,227,0.18)", press: "rgba(242,239,227,0.14)", placeholder: "#B5A88E",
  badge: "#C2A86A", onBadge: "#1F1712",
  // Walnut's bag colours are a guess, not yet checked on a mock-up.
  leaf: "#A89B6E", fruit: "#D98A4E",
}
const thymeFocus: Focus = {
  bg: "#23331F", ink: "#F2EDE0", gold: "#E5B83A", onGold: "#1B2818", place: "#F7EAC2", label: "#D0D7C7", field: "#1B2818",
  danger: "#F7B9A6", toast: "#1B2818", line: "rgba(242,237,224,0.18)", press: "rgba(242,237,224,0.14)", placeholder: "#A9B69F",
  badge: "#E68A0A", onBadge: "#1B2818",
  leaf: "#8FA486", fruit: "#E68A0A",
}

export const THEMES: Record<ColourTheme, { light: Colours; dark: Colours }> = {
  walnut: {
    light: {
      bg: "#F2EFE3", ink: "#3D2B1F", muted: "#6B5142", primary: "#7A6840", onPrimary: "#FFFFE6", panel: "#E8E5D8", line: "#D6D1C2",
      stone: "#C0BCAE", input: "#8E8775", danger: "#9A3324", onDanger: "#FFFFFF", press: "rgba(61,43,31,0.1)", placeholder: "#8A7B6E",
      link: "#7A6840", navActive: "#7A6840", statusOut: "#7A6840", onStatusOut: "#FFFFE6", statusLow: "#F2EFE3", statusLowBorder: "#7A6840", onStatusLow: "#3D2B1F",
      // Walnut's pot colours are a guess, not yet checked on a mock-up (the card is brown with cream text here).
      potBody: "#DCC79D", potKnob: "#D98A4E",
      tonight: "#7A6840", onTonight: "#FFFFE6", shopBar: "#3D2B1F", onShopBar: "#F2EFE3", shopBarLabel: "#C0BCAE",
      focus: walnutFocus,
    },
    dark: {
      bg: "#2A1D15", ink: "#F2EFE3", muted: "#C0BCAE", primary: "#C2A86A", onPrimary: "#2A1D15", panel: "#3D2B1F", line: "#544136",
      stone: "#6B5142", input: "#806C5E", danger: "#E59A86", onDanger: "#2A1D15", press: "rgba(242,239,227,0.12)", placeholder: "#9C8C7A",
      link: "#C2A86A", navActive: "#C2A86A", statusOut: "#C2A86A", onStatusOut: "#2A1D15", statusLow: "#2A1D15", statusLowBorder: "#C2A86A", onStatusLow: "#F2EFE3",
      potBody: "#7A6840", potKnob: "#D98A4E",
      tonight: "#C2A86A", onTonight: "#2A1D15", shopBar: "#3D2B1F", onShopBar: "#F2EFE3", shopBarLabel: "#C0BCAE",
      focus: walnutFocus,
    },
  },
  thyme: {
    light: {
      bg: "#F2EDE0", ink: "#23331F", muted: "#4D5C48", primary: "#5C6A26", onPrimary: "#F2EDE0", panel: "#EEE3C3", line: "#DDD6C4",
      stone: "#B3AC98", input: "#857F69", danger: "#A3361F", onDanger: "#F2EDE0", press: "rgba(35,51,31,0.1)", placeholder: "#737E6C",
      // The orange tab underline is darkened from #E68A0A in light so it passes 3:1 (Isaac, 26 Nov 2026).
      link: "#3D553A", navActive: "#C4740A", statusOut: "#E1B136", onStatusOut: "#23331F", statusLow: "#F7EAC2", statusLowBorder: "#E1B136", onStatusLow: "#23331F",
      potBody: "#5C6A26", potKnob: "#C4740A",
      // Warm cream card, #E5D9C1 (L* about 87.5): the page's hue made a little warmer, so it reads as a deeper shade of
      // the page. On 27 Nov 2026 (Isaac) it went a little brighter than #E3D5B6, to #E7DABF, then a tenth less
      // saturated; it was taupe, #B3AC98, before 26 Nov. Olive shop bar, with cream for both of the bar's lines (the green label is 4.0:1 on olive).
      tonight: "#E5D9C1", onTonight: "#23331F", shopBar: "#5C6A26", onShopBar: "#F2EDE0", shopBarLabel: "#F2EDE0",
      focus: thymeFocus,
    },
    dark: {
      bg: "#344A31", ink: "#F2EDE0", muted: "#D0D7C7", primary: "#E5B83A", onPrimary: "#23331F", panel: "#405A3C", line: "#4B6345",
      stone: "#677E60", input: "#849A7E", danger: "#F7B9A6", onDanger: "#23331F", press: "rgba(242,237,224,0.12)", placeholder: "#9EA995",
      link: "#E5B83A", navActive: "#E68A0A", statusOut: "#E5B83A", onStatusOut: "#23331F", statusLow: "#4F5A2A", statusLowBorder: "#E5B83A", onStatusLow: "#F2EDE0",
      // From the HOME-1 mock-up: Thyme light's primary and navActive, on the mustard card.
      potBody: "#5C6A26", potKnob: "#C4740A",
      tonight: "#E5B83A", onTonight: "#23331F", shopBar: "#23331F", onShopBar: "#F2EDE0", shopBarLabel: "#D0D7C7",
      focus: thymeFocus,
    },
  },
}

/** Walnut light and dark, for code that needs a fixed set. */
export const light = THEMES.walnut.light
export const dark = THEMES.walnut.dark

/** The splash stays gold in every theme: it matches the illustration. */
export const SPLASH = "#BA9E5F"

/** Figtree stands in for Stevie Sans, and the system serif for Dejanire, until the Adobe Fonts licence is checked. */
export const font = {
  regular: "Figtree_400Regular",
  medium: "Figtree_500Medium",
  semibold: "Figtree_600SemiBold",
  bold: "Figtree_700Bold",
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "Georgia, serif" }) as string,
}

export const space = { screen: 20, row: 12 }
export const radius = { base: 4, pill: 9999, sheet: 12, dialog: 8 }

/** The colour theme this phone is showing. */
export function useColourTheme(): ColourTheme {
  const { state } = useStore()
  return state.colourTheme?.theme ?? DEFAULT_COLOUR_THEME
}

export function useColours(): Colours & { isDark: boolean } {
  const { state } = useStore()
  const system = useColorScheme()
  const isDark = state.theme === "dark" || (state.theme === "system" && system === "dark")
  const set = THEMES[state.colourTheme?.theme ?? DEFAULT_COLOUR_THEME]
  return { ...(isDark ? set.dark : set.light), isDark }
}

/** Reduce Motion: no scale on press, fades instead of slides. */
export function useReduceMotion() {
  const [reduce, setReduce] = React.useState(false)
  React.useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce)
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce)
    return () => sub.remove()
  }, [])
  return reduce
}
