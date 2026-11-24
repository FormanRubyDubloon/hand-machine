// A tag's mark on the phone: its icon in a square tinted with its colour, as on the web (CategoryMark in
// prototypes/pantry-app/src/category-look.tsx). The icon names and colour names come from the shared list in
// prototypes/shared/src/category-look.ts. React Native can't read the web's oklch tokens, so the twelve hues are
// here as hex: oklch(0.7 0.13 hue) converted to sRGB. Like the web, they're never solid: laid over the page at
// 34% (26% in dark mode), so they stay muted pastels of the background.
import {
  Amphora, Apple, Baby, Banana, Bath, Bean, Beef, Beer, Blend, Blender, BottleWine, Bubbles, Cake, Can, Candy, Carrot, Cherry, Citrus, Clover, Coffee, Cookie, CookingPot, Croissant, Cuboid, CupSoda, Cylinder, Donut, Droplet, Drumstick, Egg, Fish, FishSymbol, Flame, Gem, Grape, Ham, Hamburger, IceCreamCone, Leaf, LeafyGreen, Milk, Nut, Package, PawPrint, Pill, PillBottle, Pizza, Popcorn, Salad, Sandwich, Scroll, Shell, ShoppingBasket, Shrimp, Snowflake, SoapDispenserDroplet, Soup, Sparkles, SprayCan, Sprout, Star, Wheat, Wine,
  type LucideIcon,
} from "lucide-react-native"
import * as React from "react"
import { Text, View, type StyleProp, type ViewStyle } from "react-native"
import type { CategoryColour, CategoryIcon } from "../../../prototypes/shared/src/category-look"
import type { Category } from "../../../prototypes/shared/src/pantry"
import { font, radius, useColours } from "./theme"

/** Every tag icon, by the name stored on the tag. */
export const TAG_ICONS: Record<CategoryIcon, LucideIcon> = {
  Carrot, Apple, Citrus, Cherry, Grape, Banana, LeafyGreen, Salad,
  Sprout, Leaf, Clover, Beef, Drumstick, Ham, Fish, FishSymbol,
  Shrimp, Shell, Egg, Milk, Snowflake, IceCreamCone, Wheat, Bean,
  Can, Nut, Croissant, Sandwich, Hamburger, Pizza, Cake, Cookie,
  Donut, Candy, Popcorn, Soup, CookingPot, Cylinder, Amphora, Bubbles,
  Blender, Blend, Cuboid, Droplet, Flame, Star, Sparkles, Gem,
  Coffee, CupSoda, Wine, BottleWine, Beer, Package, ShoppingBasket, SprayCan,
  SoapDispenserDroplet, Scroll, Bath, Pill, PillBottle, Baby, PawPrint,
}

/** The twelve tag hues: oklch(0.7 0.13 hue) in sRGB. */
export const TAG_HUES: Record<CategoryColour, string> = {
  rose: "#E37A84", coral: "#E2805E", apricot: "#D58C3B", butter: "#B89D2B", lime: "#8CAC4B", sage: "#5CB572",
  mint: "#0FB89A", teal: "#00B6BE", sky: "#37AAE3", periwinkle: "#7F99EF", lavender: "#AB8BE3", mauve: "#D37DB8",
}

/** A hue at the tint opacity: 34% on light, 26% on dark (the web's --category-tint). */
export const tagTint = (colour: CategoryColour, dark: boolean) => `${TAG_HUES[colour]}${dark ? "42" : "57"}`

const SIZES = { sm: { box: 22, icon: 14 }, md: { box: 32, icon: 18 }, lg: { box: 44, icon: 22 } }

/**
 * A tag's icon in its tinted square. A tag with an icon but no colour gets a plain panel square; one with a
 * colour and no icon, the tint alone. Nothing when it has neither, unless `fallback` (a letter or dash) is given.
 */
export function TagMark({ tag, size = "md", fallback, style }: { tag: Pick<Category, "colour" | "icon"> | undefined; size?: keyof typeof SIZES; fallback?: string; style?: StyleProp<ViewStyle> }) {
  const c = useColours()
  const Icon = tag?.icon ? TAG_ICONS[tag.icon] : null
  if (!tag?.colour && !Icon && fallback === undefined) return null
  const s = SIZES[size]
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[{ width: s.box, height: s.box, borderRadius: radius.base, alignItems: "center", justifyContent: "center", backgroundColor: tag?.colour ? tagTint(tag.colour, c.isDark) : c.panel }, !tag?.colour && !Icon ? { borderWidth: 1, borderColor: c.stone } : null, style]}
    >
      {Icon ? <Icon size={s.icon} color={c.ink} strokeWidth={1.75} /> : fallback ? <Text style={{ fontFamily: font.bold, fontSize: s.icon, color: c.ink }}>{fallback}</Text> : null}
    </View>
  )
}
