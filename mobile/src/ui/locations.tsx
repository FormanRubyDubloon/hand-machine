// Pantry locations and their icons. The prototype's were hand-drawn stand-ins (handoff open question 8);
// these are Lucide's. "Counter" from the prototype isn't a location the database allows, so it isn't here.
import { Archive, Package, Refrigerator, Snowflake, SprayCan, type LucideIcon } from "lucide-react-native"
import type { Location } from "../../../prototypes/pantry-app/src/model"

export const LOCATIONS: { value: Location | "none"; label: string; icon: LucideIcon }[] = [
  { value: "fridge", label: "Fridge", icon: Refrigerator },
  { value: "freezer", label: "Freezer", icon: Snowflake },
  { value: "cupboard", label: "Cupboard", icon: Archive },
  { value: "household", label: "Household", icon: SprayCan },
  { value: "none", label: "No location", icon: Package },
]
