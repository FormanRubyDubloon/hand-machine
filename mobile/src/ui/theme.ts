// Design tokens from the PROTO-1 handoff (section 3). Light and dark follow the prototype exactly; the item sheet,
// cooking view and toast are always dark ("focused mode"), in both themes.
import * as React from "react"
import { AccessibilityInfo, Platform, useColorScheme } from "react-native"
import { useStore } from "../data/store"

export type Colours = {
  bg: string; ink: string; muted: string; olive: string; onOlive: string; panel: string; line: string; stone: string
  danger: string; onDanger: string; press: string; placeholder: string
}

export const light: Colours = {
  bg: "#F2EFE3", ink: "#3D2B1F", muted: "#6B5142", olive: "#7A6840", onOlive: "#FFFFE6", panel: "#E8E5D8", line: "#D6D1C2",
  stone: "#C0BCAE", danger: "#9A3324", onDanger: "#FFFFFF", press: "rgba(61,43,31,0.1)", placeholder: "#8A7B6E",
}
// Dark matches the web's warm theme (theme-warm.css .dark), Isaac's decision 24 November 2026:
// bg = background, muted = muted-foreground, onOlive and onDanger = primary- and destructive-foreground,
// panel = muted, line = border, stone = line-strong. placeholder and press are phone only.
export const dark: Colours = {
  bg: "#2A1D15", ink: "#F2EFE3", muted: "#C0BCAE", olive: "#C2A86A", onOlive: "#2A1D15", panel: "#3D2B1F", line: "#544136",
  stone: "#6B5142", danger: "#E59A86", onDanger: "#2A1D15", press: "rgba(242,239,227,0.12)", placeholder: "#9C8C7A",
}

/** The always-dark screens: list item sheet, cooking view, toast, Shop done banner. */
export const focus = {
  bg: "#3D2B1F", ink: "#F2EFE3", gold: "#C2A86A", onGold: "#1F1712", place: "#DCC79D", label: "#C0BCAE", field: "#2A1D15",
  danger: "#E59A86", toast: "#2A1D15", line: "rgba(242,239,227,0.18)", press: "rgba(242,239,227,0.14)", placeholder: "#B5A88E",
}

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

export function useColours(): Colours & { isDark: boolean } {
  const { state } = useStore()
  const system = useColorScheme()
  const isDark = state.theme === "dark" || (state.theme === "system" && system === "dark")
  return { ...(isDark ? dark : light), isDark }
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
