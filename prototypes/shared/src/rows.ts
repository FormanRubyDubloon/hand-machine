// Turning Supabase rows into the shapes the apps use (and back). Pure, with no Supabase client, so
// the Claude connection's server (prototypes/claude-connection) can use the same mapping as the apps.
import type { ListEntry, ListSource, SharedItem, SharedRecipe } from "./pantry"

/** One row of `list_entries`: an entry on the shopping list for an item. */
export type ListEntryRow = { position: number; kind: ListSource["kind"]; recipe: string | null; qty: number; at: string | null }

/** The columns to select from `items`, with each item's list entries. */
export const ITEM_SELECT = "*, list_entries(position, kind, recipe, qty, at)"

export const toEntry = (r: ListEntryRow): ListEntry => ({
  source: r.kind === "recipe" ? { kind: "recipe", recipe: r.recipe ?? "" } : { kind: r.kind },
  qty: Number(r.qty),
  // Supabase hands a time back in its own format; keep one format so a round trip isn't a change.
  ...(r.at ? { at: new Date(r.at).toISOString() } : {}),
})

export const toEntryRow = (e: ListEntry, position: number): ListEntryRow => ({
  position,
  kind: e.source.kind,
  recipe: e.source.kind === "recipe" ? e.source.recipe : null,
  qty: e.qty,
  at: e.at ? new Date(e.at).toISOString() : null,
})

export type Row = {
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
  no_expiry?: boolean
  open_counts?: boolean
  one_off: boolean
  needs_review?: boolean
  uses: number
  list_entries: ListEntryRow[] | null
  opened_at: string[]
  edited_at: string
  created_at?: string
}

/** Notion's unit is free text ("bag", "350 g", "kg"); the app wants [one, many]. A guess, for display. */
export function unitPair(u: string | null): [string, string] | undefined {
  if (!u) return undefined
  if (/\d|^(kg|g|ml|litres?|pound)$/i.test(u) || u.includes(" ")) return [u, u]
  const one = /[^s]s$/i.test(u) ? u.slice(0, -1) : u
  return [one, /(ch|sh|x)$/i.test(one) ? `${one}es` : `${one}s`]
}

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
    noExpiry: r.no_expiry || undefined,
    openCounts: r.open_counts || undefined,
    oneOff: r.one_off || undefined,
    review: r.needs_review || undefined,
    uses: r.uses || undefined,
    entries: r.list_entries?.length ? [...r.list_entries].sort((a, b) => a.position - b.position).map(toEntry) : undefined,
    openedAt: r.opened_at?.length ? r.opened_at : undefined,
    editedAt: r.edited_at,
    addedAt: r.created_at,
  }
}

export type RecipeRow = {
  id: string
  name: string
  intro: string | null
  serves: number | null
  minutes: number | null
  prep: number | null
  cook: number | null
  source: string | null
  notes: string | null
  method: string[]
  tags: string[]
  meal: SharedRecipe["meal"] | null
  want_to_cook: boolean
  soon: string | null
  last_cooked: string | null
  added_by: "claude" | "you"
  added_at: string
  edited_at?: string
  recipe_ingredients: { position: number; text: string; group_name?: string | null; item_id: string | null; need: number; buy: number; partial: boolean; optional?: boolean; uses: number | null }[]
}

/**
 * Unknown serves falls back to 2 (the app's default), unknown time to 0 ("No time"). Linked
 * ingredients from Notion are stored as partial (any stock will do; migration
 * 20261114180000_recipe_writes), so `partial` is read as it is.
 */
export function toRecipe(r: RecipeRow): SharedRecipe {
  return {
    id: r.id,
    name: r.name,
    minutes: r.minutes ?? 0,
    serves: r.serves ?? 2,
    wantToCook: r.want_to_cook,
    soon: r.soon ?? undefined,
    ingredients: [...r.recipe_ingredients]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ text: i.text, itemId: i.item_id ?? "", need: i.need, buy: i.buy, partial: i.partial || undefined, optional: i.optional || undefined, uses: i.uses ?? undefined })),
    method: r.method,
    prep: r.prep ?? undefined,
    cook: r.cook ?? undefined,
    tags: r.tags,
    meal: r.meal ?? undefined,
    source: r.source ?? undefined,
    notes: [r.intro, r.notes].filter(Boolean).join("\n\n") || undefined,
    lastCooked: r.last_cooked,
    addedBy: r.added_by,
    addedAt: r.added_at,
    editedAt: r.edited_at,
  }
}

/** The database keeps one free-text unit ("bag"); the app guesses the plural back (see unitPair). */
const unitText = (u: SharedItem["unit"]) => u?.[0] ?? null

/** An item as an `items` row. A category Supabase doesn't have is left blank. List entries are their own table. */
export function toRow(i: SharedItem, knownCategories: Set<string>) {
  return {
    id: i.id,
    name: i.name,
    category_id: i.categoryId && knownCategories.has(i.categoryId) ? i.categoryId : null,
    type: i.type,
    target: i.target,
    in_stock: i.inStock,
    unit: unitText(i.unit),
    notes: i.notes ?? null,
    location: i.location ?? null,
    other_names: i.otherNames ?? [],
    open: i.open ?? null,
    pack_size_amount: i.packSize?.amount ?? null,
    pack_size_measure: i.packSize?.measure ?? null,
    price: i.price ?? null,
    brand: i.brand ?? null,
    use_by: i.noExpiry ? [] : (i.useBy ?? []).filter((d): d is string => !!d),
    no_expiry: !!i.noExpiry,
    open_counts: !!i.openCounts,
    opened_at: (i.openedAt ?? []).filter((d): d is string => !!d),
    one_off: !!i.oneOff,
    needs_review: !!i.review,
    uses: i.uses ?? 0,
    edited_at: i.editedAt ?? new Date().toISOString(),
  }
}

/**
 * The app keeps one Notes field; Supabase keeps Notion's opening paragraph (intro) apart. If the
 * notes still start with the intro, it stays the intro; otherwise it's all notes.
 */
function splitNotes(notes: string | undefined, before: RecipeRow | undefined) {
  const intro = before?.intro
  if (!notes) return { intro: null, notes: null }
  if (intro && notes.startsWith(intro)) return { intro, notes: notes.slice(intro.length).replace(/^\s+/, "") || null }
  return { intro: null, notes }
}

/**
 * Each line keeps the group it had ("For the pasta"), found by its wording. A new line takes the
 * group of the line above it.
 */
function groupsFor(r: SharedRecipe, before: RecipeRow | undefined): (string | null)[] {
  const old = [...(before?.recipe_ingredients ?? [])].sort((a, b) => a.position - b.position)
  const used = new Set<number>()
  let last: string | null = null
  return r.ingredients.map((g) => {
    const k = old.findIndex((o, n) => !used.has(n) && o.text === g.text)
    if (k >= 0) {
      used.add(k)
      last = old[k].group_name ?? null
    }
    return last
  })
}

/**
 * Recipes as `recipes` rows and their ingredients as `recipe_ingredients` rows. Columns the app
 * doesn't have (emoji, source link, Notion id) aren't in the rows, so an upsert leaves them as they
 * are. A link to an item not in `items` is dropped.
 */
export function recipeRows(recipes: SharedRecipe[], before: Record<string, RecipeRow>, items: Set<string>) {
  const rows = recipes.map((r) => ({
    id: r.id,
    name: r.name,
    ...splitNotes(r.notes, before[r.id]),
    serves: r.serves,
    minutes: r.minutes || null,
    prep: r.prep ?? null,
    cook: r.cook ?? null,
    source: r.source ?? null,
    method: r.method,
    tags: r.tags ?? [],
    meal: r.meal ?? null,
    want_to_cook: r.wantToCook,
    soon: r.soon ?? null,
    last_cooked: r.lastCooked ?? null,
    added_by: r.addedBy ?? "you",
    added_at: r.addedAt ?? new Date().toISOString(),
    edited_at: r.editedAt ?? r.addedAt ?? new Date().toISOString(),
  }))
  const lines = recipes.flatMap((r) => {
    const groups = groupsFor(r, before[r.id])
    return r.ingredients.map((g, position) => ({
      recipe_id: r.id,
      position,
      text: g.text,
      group_name: groups[position],
      item_id: g.itemId && items.has(g.itemId) ? g.itemId : null,
      need: g.need,
      buy: g.buy,
      partial: !!g.partial,
      optional: !!g.optional,
      uses: g.uses ?? null,
    }))
  })
  return { rows, lines }
}
