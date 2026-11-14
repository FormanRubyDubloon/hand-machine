// Fills the shared seed with the pantry items in Supabase (the Notion pantry, loaded there). Both
// prototypes await this before they render, so the rest of the code can keep treating the seed
// as plain data. Read only: the publishable key can read `items`, nothing writes back yet.
import { supabase } from "@/lib/supabase"
import { seedItems, seedRecipes, type SharedItem } from "./pantry"

type Row = {
  id: string
  name: string
  category_id: string | null
  type: "counted" | "bulk"
  target: number | null
  in_stock: number | null
  unit: string | null
  notes: string | null
  location: SharedItem["location"] | null
  other_names: string[]
  open: number | null
  pack_size_amount: number | null
  pack_size_measure: "g" | "ml" | null
  price: number | null
  brand: string | null
  use_by: string[]
  one_off: boolean
  uses: number
}

/** Notion's unit is free text ("bag", "350 g", "kg"); the app wants [one, many]. A guess, for display. */
function unitPair(u: string | null): [string, string] | undefined {
  if (!u) return undefined
  if (/\d|^(kg|g|ml|litres?|pound)$/i.test(u) || u.includes(" ")) return [u, u]
  const one = /[^s]s$/i.test(u) ? u.slice(0, -1) : u
  return [one, /(ch|sh|x)$/i.test(one) ? `${one}es` : `${one}s`]
}

/** Demo recipe links that point at an item under a different name in the Notion pantry. */
const renamed: Record<string, string> = { sourdough: "sourdough-bread", oats: "rolled-oats", peppers: "red-pepper", oranges: "oranges-citrus-fruit", "black-olives": "olives" }

export function toItem(r: Row): SharedItem {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    target: r.target ?? 0,
    inStock: r.in_stock ?? 0,
    unit: unitPair(r.unit),
    notes: r.notes ?? undefined,
    categoryId: r.category_id ?? "",
    where: [],
    location: r.location ?? undefined,
    otherNames: r.other_names.length ? r.other_names : undefined,
    open: r.open ?? undefined,
    packSize: r.pack_size_amount && r.pack_size_measure ? { amount: r.pack_size_amount, measure: r.pack_size_measure } : undefined,
    price: r.price ?? undefined,
    brand: r.brand ?? undefined,
    useBy: r.use_by.length ? r.use_by : undefined,
    oneOff: r.one_off || undefined,
    uses: r.uses || undefined,
  }
}

let loaded: Promise<void> | null = null

/** Fetches the items once and fills `seedItems`. Failing leaves the pantry empty rather than blocking the app. */
export function loadSeedFromSupabase(): Promise<void> {
  loaded ??= (async () => {
    const { data, error } = await supabase.from("items").select("*").order("name")
    if (error || !data) {
      console.error("Couldn't load the pantry from Supabase:", error?.message)
      return
    }
    seedItems.splice(0, seedItems.length, ...(data as Row[]).map(toItem))
    // Recipes written for the old demo items: keep the wording, drop links to items that aren't there.
    const have = new Set(seedItems.map((i) => i.id))
    for (const rec of seedRecipes)
      for (const ing of rec.ingredients) {
        const id = renamed[ing.itemId] ?? ing.itemId
        ing.itemId = have.has(id) ? id : ""
      }
  })()
  return loaded
}
