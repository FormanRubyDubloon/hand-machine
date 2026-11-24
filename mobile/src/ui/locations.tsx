// Pantry locations and their icons. The prototype's were hand-drawn stand-ins (handoff open question 8);
// these are Lucide's. Counter was added and Household relabelled Other on 21 Nov 2026 (the stored value is still "household").
// Cupboard is Collca on the web's own two-door cupboard (Isaac's change, 24 Nov 2026), drawn the same way.
import { Apple, Bath, CircleDashed, Refrigerator, Snowflake, type LucideIcon, type LucideProps } from "lucide-react-native"
import * as React from "react"
import Svg, { Path, Rect } from "react-native-svg"
import type { Location } from "../../../prototypes/pantry-app/src/model"

/** The web app's cupboard (item-panel.tsx, LOCATION_ICONS): a cabinet with two doors and two knobs. */
const Cupboard = (({ size = 24, color = "currentColor", strokeWidth = 2 }: LucideProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="3" width="18" height="18" rx="2" />
    <Path d="M12 3v18" />
    <Path d="M9 12h.01" />
    <Path d="M15 12h.01" />
  </Svg>
)) as unknown as LucideIcon

export const LOCATIONS: { value: Location | "none"; label: string; icon: LucideIcon }[] = [
  { value: "fridge", label: "Fridge", icon: Refrigerator },
  { value: "freezer", label: "Freezer", icon: Snowflake },
  { value: "cupboard", label: "Cupboard", icon: Cupboard },
  { value: "counter", label: "Counter", icon: Apple },
  // A bath: Other is mostly toiletries and cleaning things (Isaac's change, 24 Nov 2026).
  { value: "household", label: "Other", icon: Bath },
  { value: "none", label: "No location", icon: CircleDashed },
]
