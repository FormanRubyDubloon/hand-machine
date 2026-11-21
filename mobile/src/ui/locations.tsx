// Pantry locations and their icons. The prototype's were hand-drawn stand-ins (handoff open question 8);
// these are Lucide's. Counter was added and Household relabelled Other on 21 Nov 2026 (the stored value is still "household").
import { Apple, Archive, CircleDashed, Package, Refrigerator, Snowflake, type LucideIcon } from "lucide-react-native"
import type { Location } from "../../../prototypes/pantry-app/src/model"

export const LOCATIONS: { value: Location | "none"; label: string; icon: LucideIcon }[] = [
  { value: "fridge", label: "Fridge", icon: Refrigerator },
  { value: "freezer", label: "Freezer", icon: Snowflake },
  { value: "cupboard", label: "Cupboard", icon: Archive },
  { value: "counter", label: "Counter", icon: Apple },
  { value: "household", label: "Other", icon: Package },
  { value: "none", label: "No location", icon: CircleDashed },
]
