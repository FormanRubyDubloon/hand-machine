// Reading and writing the pantry items in Supabase, shared by the pantry app and the phone app so
// both turn an item into a row (and back) the same way. Writing needs a Supabase Auth session and
// the item policies from supabase/migrations/20261114140000_auth_and_item_writes.sql.
import { supabase } from "@/lib/supabase"
import { toItem, type Row } from "./supabase-seed"
import type { SharedItem } from "./pantry"

type Items = Record<string, SharedItem>

/** What counts as a change: everything that is saved, nothing derived (editedAt, store ids). */
export function fingerprint(i: SharedItem | undefined): string {
  if (!i) return ""
  const { editedAt: _e, where: _w, ...rest } = i
  const sorted = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)))
  return JSON.stringify(sorted)
}

/** The database keeps one free-text unit ("bag"); the app guesses the plural back (see unitPair). */
const unitText = (u: SharedItem["unit"]) => u?.[0] ?? null

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
    use_by: (i.useBy ?? []).filter((d): d is string => !!d),
    opened_at: (i.openedAt ?? []).filter((d): d is string => !!d),
    one_off: !!i.oneOff,
    uses: i.uses ?? 0,
    entries: i.entries ?? [],
    edited_at: i.editedAt ?? new Date().toISOString(),
  }
}

/** Every item and category id in Supabase. Throws with Supabase's message if the read fails. */
export async function fetchRemote(): Promise<{ items: Items; categories: Set<string> }> {
  const [itemsRes, catsRes] = await Promise.all([supabase.from("items").select("*"), supabase.from("categories").select("id")])
  if (itemsRes.error) throw new Error(itemsRes.error.message)
  if (catsRes.error) throw new Error(catsRes.error.message)
  return {
    items: Object.fromEntries((itemsRes.data as Row[]).map((r) => [r.id, toItem(r)])),
    categories: new Set((catsRes.data as { id: string }[]).map((c) => c.id)),
  }
}

/**
 * Upserts the given items and deletes the given ids. Returns each pushed item as Supabase will
 * hand it back, so the next sync doesn't see a phantom change. Throws if Supabase refuses.
 */
export async function writeRemote(push: SharedItem[], remove: string[], categories: Set<string>): Promise<Items> {
  const back: Items = {}
  if (push.length) {
    const rows = push.map((i) => toRow(i, categories))
    const { error } = await supabase.from("items").upsert(rows, { onConflict: "id" })
    if (error) throw new Error(error.message)
    for (const row of rows) back[row.id] = toItem(row as Row)
  }
  if (remove.length) {
    const { error } = await supabase.from("items").delete().in("id", remove)
    if (error) throw new Error(error.message)
  }
  return back
}

/** True for a failure to reach Supabase at all, as opposed to Supabase saying no. */
export const isNetworkError = (e: unknown) => !navigator.onLine || (e instanceof Error && /failed to fetch|network|load failed/i.test(e.message))
