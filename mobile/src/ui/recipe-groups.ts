// The Recipes tab's groups, with their names and icons (26 Nov 2026): the landing page's cards and the lists' titles.
import { BookOpen, CookingPot, Heart, Hourglass, ShoppingBasket, Sparkles, type LucideIcon } from "lucide-react-native"
import type { RecipeGroup } from "../logic/recipes"

export const RECIPE_GROUPS: { value: RecipeGroup; label: string; icon: LucideIcon }[] = [
  { value: "all", label: "All recipes", icon: BookOpen },
  { value: "cook", label: "Can cook now", icon: CookingPot },
  { value: "want", label: "Want to cook", icon: Heart },
  { value: "new", label: "Newly added", icon: Sparkles },
  { value: "recommended", label: "Recommended", icon: Hourglass },
  { value: "shop", label: "This shop", icon: ShoppingBasket },
]

