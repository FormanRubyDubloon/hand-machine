// How the pantry reads to Claude: one line per item, recipe or list row, in plain words. Claude
// rephrases for the chat, so these favour being unambiguous (ids, ISO dates) over being pretty.
import {
  daysUntil, haveText, isBulk, isStaple, locationLabel, needOf, normalise, recipeInfo, shortNames, soonest, stockOf, type IngredientRow, type Items,
} from "../../pantry-app/src/model"
import { minutesText, type Category, type SharedItem, type SharedRecipe } from "../../shared/src/pantry"

export const categoryName = (categories: Category[], id: string) => categories.find((c) => c.id === id)?.name ?? "No category"

/** "2026-11-17 (in 2 days)", "2026-11-14 (1 day ago)". */
export function dateWithDays(iso: string) {
  const n = daysUntil(iso)
  const rel = n === 0 ? "today" : n === 1 ? "tomorrow" : n === -1 ? "yesterday" : n > 0 ? `in ${n} days` : `${-n} days ago`
  return `${iso.slice(0, 10)} (${rel})`
}

export function itemLine(i: SharedItem, categories: Category[]) {
  const parts = [`${i.name} [id: ${i.id}]`, `have ${haveText(i)}`]
  if (isBulk(i)) parts.push("bulk (counted in whole packs)")
  parts.push(isStaple(i) ? `Staple, keep ${i.target}` : "not a Staple")
  const stock = stockOf(i)
  if (stock) parts.push(stock === "out" ? "OUT" : "LOW")
  const need = needOf(i)
  if (need > 0) parts.push(`${need} on the shopping list`)
  // Every unit's date, numbered as update_item's use_by_one counts them, when there's more than one.
  const dates = i.inStock > 0 ? (normalise(i).useBy ?? []) : []
  if (i.noExpiry) {
    parts.push("doesn't expire")
  } else if (dates.length > 1 && dates.some(Boolean)) {
    parts.push(`use-by dates: ${dates.map((x, n) => `${n + 1}) ${x ? dateWithDays(x) : "undated"}`).join(", ")}`)
  } else {
    const d = soonest(i)
    if (d) parts.push(`use by ${dateWithDays(d)}`)
  }
  if (i.packSize) parts.push(`pack size ${i.packSize.amount} ${i.packSize.measure}`)
  const opened = (i.openedAt ?? []).filter((x): x is string => !!x)
  if (opened.length) parts.push(`opened ${opened.join(", ")}`)
  if (i.location) parts.push(locationLabel(i.location).toLowerCase())
  parts.push(categoryName(categories, i.categoryId))
  if (i.otherNames?.length) parts.push(`also called ${i.otherNames.join(", ")}`)
  if (i.brand) parts.push(`brand: ${i.brand}`)
  if (i.notes) parts.push(`notes: ${i.notes}`)
  return parts.join(" · ")
}

export function recipeLine(r: SharedRecipe, items: Items) {
  const info = recipeInfo(r, items)
  const parts = [`${r.name} [id: ${r.id}]`, minutesText(r.minutes), `serves ${r.serves}`]
  parts.push(info.canCook ? "can cook now" : `short of ${info.short.length}: ${shortNames(info, 6)}`)
  if (info.usesUp) parts.push(`uses up ${info.usesUp.item.name.toLowerCase()} (use by ${dateWithDays(info.usesUp.date)})`)
  if (r.wantToCook) parts.push("want to cook")
  if (r.meal) parts.push(r.meal)
  if (r.tags?.length) parts.push(`tags: ${r.tags.join(", ")}`)
  return parts.join(" · ")
}

const statusText: Record<IngredientRow["status"], string> = {
  have: "have it",
  some: "have an open pack (may not be enough)",
  listed: "short, already on the shopping list",
  short: "short, not on the list",
  little: "short: the packs you have hold less than it needs",
  unlinked: "not linked to a pantry item",
}

export function ingredientLine(row: IngredientRow) {
  const linked = row.item ? ` → ${row.item.name} [id: ${row.item.id}], have ${haveText(row.item)}` : ""
  const missing = row.missing > 1 ? ` (${row.missing} short)` : ""
  return `${row.text}${linked} · ${statusText[row.status]}${missing}`
}
