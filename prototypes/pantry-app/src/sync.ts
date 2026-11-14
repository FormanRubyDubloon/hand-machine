// Sync the pantry items with Supabase. Items only: stores, aisles and recipes stay on this computer.
//
// Three copies are compared per item: the one here, the one at the last sync (`base`) and the one
// in Supabase. Changed only here: pushed. Changed only in Supabase: pulled. Changed in both and
// different: the later edit wins, and the sync says how many that was.
import { supabase } from "@/lib/supabase"
import { toItem, type Row } from "../../shared/src/supabase-seed"
import { normalise, type Item, type Items } from "./model"

/** What counts as a change: everything that is saved, nothing derived (editedAt, store ids). */
export function fingerprint(i: Item | undefined): string {
  if (!i) return ""
  const { editedAt: _e, where: _w, ...rest } = i
  const sorted = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)))
  return JSON.stringify(sorted)
}

/** The items that differ from the last sync (or, before the first sync, from nothing). */
export function pendingIds(items: Items, base: Items | undefined): string[] {
  if (!base) return []
  const ids = new Set([...Object.keys(items), ...Object.keys(base)])
  return [...ids].filter((id) => fingerprint(items[id]) !== fingerprint(base[id]))
}

/** The database keeps one free-text unit ("bag"); the app guesses the plural back (see unitPair). */
const unitText = (u: Item["unit"]) => u?.[0] ?? null

export function toRow(i: Item, knownCategories: Set<string>) {
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

export type SyncResult = {
  items: Items
  pushed: number
  pulled: number
  /** Changed in both places; the later edit won. */
  clashes: number
  /** Items whose aisle only exists on this computer, saved without one. */
  uncategorised: number
}

/**
 * Runs one sync. `base` is the items as they were at the last sync; without one (the first sync)
 * nothing is deleted anywhere, because a missing item can't be told from one never seen.
 * Throws with Supabase's message if a read or write fails; nothing here is half-applied locally.
 */
export async function syncItems(local: Items, base: Items | undefined): Promise<SyncResult> {
  const [itemsRes, catsRes] = await Promise.all([supabase.from("items").select("*"), supabase.from("categories").select("id")])
  if (itemsRes.error) throw new Error(itemsRes.error.message)
  if (catsRes.error) throw new Error(catsRes.error.message)
  const remote: Items = Object.fromEntries((itemsRes.data as Row[]).map((r) => [r.id, normalise(toItem(r))]))
  const known = new Set((catsRes.data as { id: string }[]).map((c) => c.id))
  const first = !base
  const was = base ?? remote

  const merged: Items = {}
  const push: Item[] = []
  const remove: string[] = []
  let pulled = 0
  let clashes = 0

  for (const id of new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(was)])) {
    const l = local[id]
    const r = remote[id]
    const b = was[id]
    const localChanged = fingerprint(l) !== fingerprint(b)
    const remoteChanged = fingerprint(r) !== fingerprint(b)
    if (fingerprint(l) === fingerprint(r)) {
      if (l) merged[id] = l
      continue
    }
    if (!localChanged) {
      // Only Supabase moved (or deleted it).
      if (r) merged[id] = r
      pulled++
    } else if (!remoteChanged) {
      // Only this computer moved.
      if (l) {
        merged[id] = l
        push.push(l)
      } else if (!first) remove.push(id)
      else if (r) merged[id] = r
    } else {
      clashes++
      const localWins = !r || (l && (l.editedAt ?? "") >= (r.editedAt ?? ""))
      if (localWins && l) {
        merged[id] = l
        push.push(l)
      } else if (!localWins && r) merged[id] = r
      else if (!l) remove.push(id)
    }
  }

  const uncategorised = push.filter((i) => i.categoryId && !known.has(i.categoryId)).length
  if (push.length) {
    const rows = push.map((i) => toRow(i, known))
    const { error } = await supabase.from("items").upsert(rows, { onConflict: "id" })
    if (error) throw new Error(error.message)
    // Keep what Supabase will hand back next time, so the next sync doesn't see a phantom change.
    for (const row of rows) merged[row.id] = normalise({ ...toItem(row as Row), where: merged[row.id].where })
  }
  if (remove.length) {
    const { error } = await supabase.from("items").delete().in("id", remove)
    if (error) throw new Error(error.message)
  }
  return { items: merged, pushed: push.length + remove.length, pulled, clashes, uncategorised }
}
