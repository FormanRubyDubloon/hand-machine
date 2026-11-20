// Saying things the way a person would: "2 bags, 1 open", "Use by tomorrow", "Short of 2". Pure, so it's tested.
import { daysUntil, fullOf, isBulk, isStaple, soonest, type Item } from "../../../prototypes/pantry-app/src/model"

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** The unit word for n: "bag" or "bags". Empty when the item has no unit. */
export const word = (i: Item, n: number) => (i.unit ? (n === 1 ? i.unit[0] : i.unit[1]) : "")

/** "4 eggs"-style count with the item's unit, or just the number when it has none. */
export const count = (i: Item, n: number) => (i.unit ? `${n} ${word(i, n)}` : String(n))

/**
 * What you have: "2 bags, 1 open", "1 bag, open", "3 bags, all open", "4", "None left".
 * Never a fraction: an open pack is a pack.
 */
export function phrase(i: Item) {
  if (i.inStock <= 0) return "None left"
  const base = count(i, i.inStock)
  const open = isBulk(i) ? Math.min(i.open ?? 0, i.inStock) : 0
  if (!open) return base
  if (open === i.inStock) return i.inStock === 1 ? `${base}, open` : `${base}, all open`
  return `${base}, ${open} open`
}

/** The minimum, said plainly: "2 bottles" or "None, not a Staple". */
export const minText = (i: Item) => (isStaple(i) ? count(i, i.target) : "None, not a Staple")

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "23 Nov", with the year when it's more than six months away. */
export function dayText(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  const far = Math.abs(daysUntil(iso)) > 180
  return `${d} ${MONTHS[m - 1]}${far ? ` ${y}` : ""}`
}

/** "Use by today", "Use by tomorrow", "Use by 23 Nov", "Past its use-by". Empty when there's no date. */
export function expiryText(iso: string | null | undefined) {
  if (!iso) return ""
  const n = daysUntil(iso)
  if (n < 0) return "Past its use-by"
  if (n === 0) return "Use by today"
  if (n === 1) return "Use by tomorrow"
  return `Use by ${dayText(iso)}`
}

/** Use-by within two days (or past it). */
export const goingOffSoon = (i: Item) => {
  const d = soonest(i)
  return !!d && daysUntil(d) <= 2
}

/** The sentence under the stock on an item's page. */
export function stockStatus(i: Item) {
  if (!isStaple(i)) return i.inStock > 0 ? "Not a Staple, so it only goes on the list when you add it." : "None left. Not a Staple, so it isn't on the list unless you add it."
  const counts = fullOf(i)
  const short = Math.max(0, i.target - counts)
  const unit = i.unit?.[1] ?? "packs"
  if (isBulk(i) && (i.open ?? 0) > 0 && !i.openCounts) {
    const note = `Only full ${unit} count towards the minimum, so you have ${counts} that ${counts === 1 ? "counts" : "count"}.`
    return short ? `${note} ${short} on the list.` : note
  }
  if (short) return `${short} below your minimum, so ${short} ${short === 1 ? "is" : "are"} on the list.`
  return "At or above your minimum."
}

/** Initials for the account badge, from an email: "isaac.forman@…" → "IF". */
export function initials(email: string) {
  const name = email.split("@")[0]
  const parts = name.split(/[._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase()
}

/** "14:02", or "Yesterday, 14:02", or "18 Nov, 14:02". */
export function whenText(iso: string) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  const days = -daysUntil(iso)
  if (days === 0) return time
  if (days === 1) return `Yesterday, ${time}`
  return `${dayText(iso)}, ${time}`
}
