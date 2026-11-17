// How a category's colour and icon are drawn. The names live in shared/src/category-look.ts and the
// colour tokens in shared/src/category-look.css.
import * as React from "react"
import {
  AmphoraIcon, AppleIcon, BabyIcon, BananaIcon, BathIcon, BeanIcon, BeefIcon, BeerIcon, CakeIcon, CandyIcon, CarrotIcon,
  CherryIcon, CitrusIcon, CoffeeIcon, CookieIcon, CookingPotIcon, CroissantIcon, CupSodaIcon, CylinderIcon, DonutIcon,
  DropletIcon, DrumstickIcon, EggIcon, FishIcon, FlameIcon, GrapeIcon, HamIcon, IceCreamConeIcon, LeafIcon, LeafyGreenIcon,
  MilkIcon, NutIcon, PackageIcon, PawPrintIcon, PillIcon, PizzaIcon, PopcornIcon, SaladIcon, SandwichIcon, ShellIcon,
  ShoppingBasketIcon, ShrimpIcon, SnowflakeIcon, SoupIcon, SprayCanIcon, SproutIcon, WheatIcon, WineIcon,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Category } from "./model"
import { categoryColours, categoryIcons, type CategoryColour, type CategoryIcon } from "../../shared/src/category-look"

export const categoryIconComponents: Record<CategoryIcon, LucideIcon> = {
  Carrot: CarrotIcon, Apple: AppleIcon, Citrus: CitrusIcon, Cherry: CherryIcon, Grape: GrapeIcon, Banana: BananaIcon,
  LeafyGreen: LeafyGreenIcon, Salad: SaladIcon, Sprout: SproutIcon, Leaf: LeafIcon, Beef: BeefIcon, Drumstick: DrumstickIcon,
  Ham: HamIcon, Fish: FishIcon, Shrimp: ShrimpIcon, Shell: ShellIcon, Egg: EggIcon, Milk: MilkIcon, Snowflake: SnowflakeIcon,
  IceCreamCone: IceCreamConeIcon, Wheat: WheatIcon, Bean: BeanIcon, Nut: NutIcon, Croissant: CroissantIcon,
  Sandwich: SandwichIcon, Pizza: PizzaIcon, Cake: CakeIcon, Cookie: CookieIcon, Donut: DonutIcon, Candy: CandyIcon,
  Popcorn: PopcornIcon, Soup: SoupIcon, CookingPot: CookingPotIcon, Cylinder: CylinderIcon, Amphora: AmphoraIcon,
  Droplet: DropletIcon, Flame: FlameIcon, Coffee: CoffeeIcon, CupSoda: CupSodaIcon, Wine: WineIcon, Beer: BeerIcon,
  Package: PackageIcon, ShoppingBasket: ShoppingBasketIcon, SprayCan: SprayCanIcon, Bath: BathIcon, Pill: PillIcon,
  Baby: BabyIcon, PawPrint: PawPrintIcon,
}

/** The colour laid over the background at the tint opacity: a muted pastel of whatever the background is. */
export const categoryTint = (colour: CategoryColour) => `color-mix(in oklch, var(--category-${colour}) var(--category-tint), transparent)`

/**
 * A category's icon in a tinted square. A category with an icon but no colour gets a plain muted square;
 * one with a colour but no icon gets the tint alone. Nothing at all when it has neither, unless `always`.
 */
export function CategoryMark({ category, size = "md", always, className }: { category: Pick<Category, "colour" | "icon"> | undefined; size?: "sm" | "md" | "lg"; always?: boolean; className?: string }) {
  const Icon = category?.icon ? categoryIconComponents[category.icon] : null
  if (!category?.colour && !Icon && !always) return null
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm text-foreground",
        size === "sm" ? "size-5 [&>svg]:size-3" : size === "lg" ? "size-9 [&>svg]:size-5" : "size-7 [&>svg]:size-4",
        !category?.colour && (Icon ? "bg-muted" : "border border-dashed border-border"),
        className,
      )}
      style={category?.colour ? { backgroundColor: categoryTint(category.colour) } : undefined}
    >
      {Icon && <Icon strokeWidth={1.75} />}
    </span>
  )
}

/** A category's mark and name side by side. */
export function CategoryLabel({ category, size = "sm", className, children }: { category: Category | undefined; size?: "sm" | "md"; className?: string; children?: React.ReactNode }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <CategoryMark category={category} size={size} />
      <span className="truncate">{children ?? category?.name ?? "–"}</span>
    </span>
  )
}

/**
 * Picks a category's colour and icon. The trigger is the category's mark (a dashed square when it has
 * neither); the popover has the twelve colours, then the icons, each with a None.
 */
export function CategoryLookPicker({ category, onChange }: { category: Category; onChange: (look: { colour?: CategoryColour | null; icon?: CategoryIcon | null }) => void }) {
  const swatch = "flex size-8 items-center justify-center rounded-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring/50"
  const on = "ring-2 ring-foreground ring-offset-1 ring-offset-popover"
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-sm outline-none hover:ring-1 hover:ring-border focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label={`Colour and icon for ${category.name}`}
          title="Colour and icon"
        >
          <CategoryMark category={category} always />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-[19rem] flex-col gap-4">
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Colour">
          <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Colour</span>
          <div className="grid grid-cols-7 gap-1.5">
            <button type="button" role="radio" aria-checked={!category.colour} aria-label="No colour" title="None" className={cn(swatch, "border border-dashed border-border", !category.colour && on)} onClick={() => onChange({ colour: null })} />
            {categoryColours.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={category.colour === c}
                aria-label={c}
                title={c[0].toUpperCase() + c.slice(1)}
                className={cn(swatch, category.colour === c && on)}
                style={{ backgroundColor: categoryTint(c) }}
                onClick={() => onChange({ colour: c })}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Icon">
          <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Icon</span>
          <div className="grid grid-cols-7 gap-1.5">
            <button type="button" role="radio" aria-checked={!category.icon} aria-label="No icon" title="None" className={cn(swatch, "border border-dashed border-border", !category.icon && on)} onClick={() => onChange({ icon: null })} />
            {categoryIcons.map((name) => {
              const Icon = categoryIconComponents[name]
              return (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={category.icon === name}
                  aria-label={name}
                  title={name.replace(/([a-z])([A-Z])/g, "$1 $2")}
                  className={cn(swatch, "hover:bg-muted [&>svg]:size-4", category.icon === name && on)}
                  style={category.icon === name && category.colour ? { backgroundColor: categoryTint(category.colour) } : undefined}
                  onClick={() => onChange({ icon: name })}
                >
                  <Icon strokeWidth={1.75} />
                </button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
