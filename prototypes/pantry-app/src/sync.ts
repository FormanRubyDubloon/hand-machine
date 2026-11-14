// Sync the pantry items with Supabase. Items only: stores, aisles and recipes stay on this computer.
//
// Three copies are compared per item: the one here, the one at the last sync (`base`) and the one
// in Supabase. Changed only here: pushed. Changed only in Supabase: pulled. Changed in both and
// different: the later edit wins, and the sync says how many that was.
import { fetchRemote, fingerprint, writeRemote } from "../../shared/src/pantry-remote"
import { normalise, type Item, type Items } from "./model"

export { fingerprint }

/** The items that differ from the last sync (or, before the first sync, from nothing). */
export function pendingIds(items: Items, base: Items | undefined): string[] {
  if (!base) return []
  const ids = new Set([...Object.keys(items), ...Object.keys(base)])
  return [...ids].filter((id) => fingerprint(items[id]) !== fingerprint(base[id]))
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
  const fetched = await fetchRemote()
  const remote: Items = Object.fromEntries(Object.entries(fetched.items).map(([id, i]) => [id, normalise(i)]))
  const known = fetched.categories
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
  // Keep what Supabase will hand back next time, so the next sync doesn't see a phantom change.
  const back = await writeRemote(push, remove, known)
  for (const [id, item] of Object.entries(back)) merged[id] = normalise({ ...item, where: merged[id].where })
  return { items: merged, pushed: push.length + remove.length, pulled, clashes, uncategorised }
}
