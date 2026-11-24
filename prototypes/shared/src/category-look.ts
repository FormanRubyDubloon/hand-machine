// A category's colour and icon. Plain data (no React, no browser), so the pantry app, the phone and
// the Claude connection can all read it. The colours themselves are CSS tokens in category-look.css.

/**
 * Twelve hues round the colour wheel, in order. Each one is a mid-tone token that's laid over the
 * background at low opacity, so it reads as a muted pastel of whatever the background is.
 */
export const categoryColours = [
  "rose", "coral", "apricot", "butter", "lime", "sage", "mint", "teal", "sky", "periwinkle", "lavender", "mauve",
] as const
export type CategoryColour = (typeof categoryColours)[number]

export const isCategoryColour = (v: unknown): v is CategoryColour => categoryColours.includes(v as CategoryColour)

/** Lucide icon names (PascalCase, without "Icon") a category can use. The pantry app maps them to components. */
export const categoryIcons = [
  "Carrot", "Apple", "Citrus", "Cherry", "Grape", "Banana", "LeafyGreen", "Salad", "Sprout", "Leaf",
  "Clover", "Beef", "Drumstick", "Ham", "Fish", "FishSymbol", "Shrimp", "Shell", "Egg", "Milk",
  "Snowflake", "IceCreamCone", "Wheat", "Bean", "Can", "Nut", "Croissant", "Sandwich", "Hamburger", "Pizza",
  "Cake", "Cookie", "Donut", "Candy", "Popcorn", "Soup", "CookingPot", "Cylinder", "Amphora", "Bubbles",
  "Blender", "Blend", "Cuboid", "Droplet", "Flame", "Star", "Sparkles", "Gem", "Coffee", "CupSoda",
  "Wine", "BottleWine", "Beer", "Package", "ShoppingBasket", "SprayCan", "SoapDispenserDroplet", "Scroll", "Bath", "Pill",
  "PillBottle", "Baby", "PawPrint",
] as const
export type CategoryIcon = (typeof categoryIcons)[number]

export const isCategoryIcon = (v: unknown): v is CategoryIcon => categoryIcons.includes(v as CategoryIcon)
