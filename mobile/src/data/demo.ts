// Demo mode's made-up pantry: the PROTO-1 prototype's seed, in the pantry's real shapes. Used by `npm run demo`
// (EXPO_PUBLIC_DEMO=1) so the app can be tried, and screenshotted, without signing in or touching Supabase.
// Dates are relative to today, so "use by tomorrow" stays true whenever the demo runs.
import { day } from "../../../prototypes/shared/src/pantry"
import { normalise, type Category, type Item, type Location, type Recipe, type Store } from "../../../prototypes/pantry-app/src/model"
import { emptyState, type PhoneState } from "./state"

const categories: Category[] = [
  { id: "fruit-and-veg", name: "Fruit & veg", colour: "sage", icon: "Carrot" }, { id: "bakery", name: "Bakery", colour: "apricot", icon: "Croissant" },
  { id: "dairy-and-eggs", name: "Dairy & eggs", colour: "sky", icon: "Milk" }, { id: "meat-and-fish", name: "Meat & fish", colour: "rose", icon: "Beef" },
  { id: "tins-and-jars", name: "Tins & jars", colour: "periwinkle", icon: "Can" }, { id: "pasta-rice-and-grains", name: "Pasta, rice & grains", colour: "butter", icon: "Wheat" },
  { id: "oils-and-sauces", name: "Oils & sauces", colour: "mauve", icon: "BottleWine" }, { id: "baking-and-spices", name: "Baking & spices", colour: "lime", icon: "Star" },
  { id: "frozen", name: "Frozen", colour: "teal", icon: "Snowflake" }, { id: "household", name: "Household", colour: "mint", icon: "SprayCan" },
]
const C: Record<string, string> = {
  fruit: "fruit-and-veg", bakery: "bakery", dairy: "dairy-and-eggs", meat: "meat-and-fish", tins: "tins-and-jars",
  pasta: "pasta-rice-and-grains", oils: "oils-and-sauces", baking: "baking-and-spices", frozen: "frozen", household: "household",
}

const stores: Store[] = [
  { id: "sainsburys", name: "Sainsbury's Stoke Newington", places: ["Freezer", "Tills"], aisles: { "fruit-and-veg": 1, bakery: 2, "dairy-and-eggs": 4, "meat-and-fish": 5, "tins-and-jars": 9, "pasta-rice-and-grains": 9, "oils-and-sauces": 10, "baking-and-spices": 11, frozen: 14, household: 17 } },
  { id: "tesco", name: "Tesco Express Church Street", aisles: { "fruit-and-veg": 1, bakery: 1, "dairy-and-eggs": 2, "meat-and-fish": 2, "tins-and-jars": 3, "pasta-rice-and-grains": 3, "oils-and-sauces": 3, "baking-and-spices": 4, frozen: 5, household: 6 } },
]

/** Days from the prototype's pinned "today" (20 Nov 2026) to a date, so it can be moved to the real today. */
const rel = (iso: string) => (iso ? day(Math.round((Date.parse(iso) - Date.parse("2026-11-20")) / 86_400_000)) : null)

type Row = [string, string, "counted" | "bulk", string, string, number, number, number, string, string, string?, string[]?, number?, ("g" | "ml")?]
const rows: Row[] = [
  ["eggs", "Eggs", "counted", "egg", "eggs", 4, 0, 6, "dairy", "Fridge", "2026-11-24"],
  ["mince", "Beef mince", "counted", "pack", "packs", 0, 0, 1, "meat", "Fridge", "", ["minced beef"]],
  ["thighs", "Chicken thighs", "counted", "pack", "packs", 0, 0, 1, "meat", "Fridge"],
  ["salmon", "Salmon fillets", "counted", "fillet", "fillets", 2, 0, 2, "meat", "Fridge", "2026-11-21", ["salmon"]],
  ["sweetpot", "Sweet potatoes", "counted", "sweet potato", "sweet potatoes", 4, 0, 0, "fruit", "Cupboard", "2026-11-30", ["sweet potato"]],
  ["onions", "Onions", "counted", "onion", "onions", 6, 0, 3, "fruit", "Cupboard", "", ["onion", "brown onion"]],
  ["carrots", "Carrots", "counted", "carrot", "carrots", 5, 0, 0, "fruit", "Fridge", "2026-11-27", ["carrot"]],
  ["spinach", "Spinach", "counted", "bag", "bags", 2, 0, 0, "fruit", "Fridge", "2026-11-22"],
  ["pepper", "Red pepper", "counted", "pepper", "peppers", 0, 0, 1, "fruit", "Fridge", "", ["red pepper"]],
  ["lemons", "Lemons", "counted", "lemon", "lemons", 1, 0, 2, "fruit", "Fridge", "2026-11-29", ["lemon"]],
  ["tomatoes", "Chopped tomatoes", "counted", "tin", "tins", 4, 0, 6, "tins", "Cupboard", "2027-03-12", ["tinned tomatoes"]],
  ["sardines", "Sardines", "counted", "tin", "tins", 0, 0, 2, "tins", "Cupboard"],
  ["chickpeas", "Chickpeas", "counted", "tin", "tins", 3, 0, 2, "tins", "Cupboard", "2027-06-01"],
  ["yoghurt", "Greek yoghurt", "counted", "tub", "tubs", 1, 0, 1, "dairy", "Fridge", "2026-11-23", ["yoghurt"]],
  ["cheddar", "Cheddar", "counted", "block", "blocks", 1, 0, 1, "dairy", "Fridge", "2026-12-10"],
  ["sourdough", "Sourdough", "counted", "loaf", "loaves", 0, 0, 1, "bakery", "Cupboard"],
  ["binbags", "Bin bags", "counted", "roll", "rolls", 0, 0, 1, "household", "Household"],
  ["butter", "Butter", "bulk", "block", "blocks", 1, 1, 1, "dairy", "Fridge", "2026-12-18"],
  ["flour", "Plain flour", "bulk", "bag", "bags", 1, 0, 1, "baking", "Cupboard", "2027-03-03", ["flour"], 1000, "g"],
  ["oats", "Oats", "bulk", "bag", "bags", 1, 1, 1, "pasta", "Cupboard", "2027-05-01", ["porridge oats"], 1000, "g"],
  ["linguine", "Linguine", "bulk", "packet", "packets", 0, 0, 1, "pasta", "Cupboard", "", [], 500, "g"],
  ["rice", "Brown rice", "bulk", "bag", "bags", 0, 1, 2, "pasta", "Cupboard", "2027-02-01", ["rice"], 1000, "g"],
  ["milk", "Whole milk", "bulk", "bottle", "bottles", 1, 1, 2, "dairy", "Fridge", "2026-11-23", ["milk"], 2000, "ml"],
  ["oil", "Olive oil", "bulk", "bottle", "bottles", 0, 1, 1, "oils", "Cupboard", "2027-10-01", [], 500, "ml"],
  ["paprika", "Smoked paprika", "bulk", "jar", "jars", 0, 1, 0, "baking", "Cupboard", "2028-01-01"],
  ["garam", "Garam masala", "bulk", "jar", "jars", 0, 1, 0, "baking", "Cupboard", "2027-08-01"],
  ["chilli", "Chilli flakes", "bulk", "jar", "jars", 0, 1, 0, "baking", "Cupboard", "2027-09-01"],
  ["berries", "Frozen berries", "bulk", "bag", "bags", 0, 1, 1, "frozen", "Freezer", "2027-06-01", [], 500, "g"],
  ["peas", "Peas", "bulk", "bag", "bags", 1, 0, 1, "frozen", "Freezer", "2027-03-01"],
  ["washup", "Washing-up liquid", "bulk", "bottle", "bottles", 0, 1, 1, "household", "Household"],
]

function items(): Record<string, Item> {
  const out: Record<string, Item> = {}
  for (const [id, name, type, one, many, a, b, min, cat, loc, useBy, other, pack, measure] of rows) {
    const inStock = type === "bulk" ? a + b : a
    out[id] = normalise({
      id, name, type, unit: [one, many], inStock, open: type === "bulk" ? b : undefined, target: min, categoryId: C[cat], where: [],
      location: loc.toLowerCase() as Location, useBy: useBy ? Array(Math.max(1, inStock)).fill(rel(useBy)) : undefined,
      otherNames: other?.length ? other : undefined, packSize: pack && measure ? { amount: pack, measure } : undefined,
    })
  }
  // Aisles on items (Batch 4): most are known at Sainsbury's, frozen things are in the Freezer, and a few are left
  // blank so ticking them asks. Tesco has none yet, so everything there starts under No aisle.
  const blank = new Set(["sardines", "pepper", "binbags", "sourdough"])
  for (const i of Object.values(out)) {
    if (blank.has(i.id)) continue
    const n = stores[0].aisles[i.categoryId]
    out[i.id] = { ...i, aisleAt: { sainsburys: i.categoryId === "frozen" ? "Freezer" : n! } }
  }
  // Two things that aren't in the pantry yet: one from a recipe, one added by hand.
  out.parsley = normalise({ id: "parsley", name: "Parsley", type: "counted", inStock: 0, target: 0, categoryId: "fruit-and-veg", where: [], location: "fridge", review: true, entries: [{ source: { kind: "recipe", recipe: "Sardine linguine" }, qty: 1 }] })
  out.candles = normalise({ id: "candles", name: "Birthday candles", type: "counted", inStock: 0, target: 0, categoryId: "", where: [], oneOff: true, entries: [{ source: { kind: "hand" }, qty: 1 }] })
  return out
}

const ing = (text: string, itemId: string, need = 1, extra: Partial<Recipe["ingredients"][number]> = {}) => ({ text, itemId, need, buy: 1, ...extra })

const recipes: Recipe[] = [
  { id: "salmon", name: "Salmon with greens and rice", serves: 2, minutes: 25, wantToCook: false, tags: ["Dinner"], ingredients: [
    ing("2 salmon fillets", "salmon", 2), ing("1 bag spinach", "spinach"), ing("150 g brown rice", "rice", 1, { partial: true, uses: 150 }), ing("1 lemon", "lemons")],
    method: ["Rinse the rice and simmer it for 25 minutes, then drain.", "Season the salmon and roast it at 200°C for 12 minutes.", "Wilt the spinach in a hot pan with a splash of water.", "Serve the salmon on the rice and greens, with lemon squeezed over."] },
  { id: "porridge", name: "Berry porridge", serves: 1, minutes: 10, wantToCook: false, tags: ["Breakfast"], ingredients: [
    ing("50 g oats", "oats", 1, { partial: true, uses: 50 }), ing("250 ml whole milk", "milk", 1, { partial: true, uses: 250 }), ing("80 g frozen berries", "berries", 1, { partial: true, uses: 80 })],
    method: ["Put the oats and milk in a small pan.", "Simmer for 5 minutes, stirring, until thick.", "Stir in the berries and let them warm through for 20 seconds."] },
  { id: "keema", name: "Beef keema with sweet potato, carrot & spinach", serves: 4, minutes: 45, wantToCook: false, tags: ["Indian", "dinner"], ingredients: [
    ing("500 g minced beef", "mince", 1), ing("2 sweet potatoes", "sweetpot", 2), ing("2 carrots", "carrots", 2), ing("1 bag spinach", "spinach"),
    ing("1 onion", "onions"), ing("2 tsp garam masala", "garam", 1, { partial: true }), ing("1 × 400 g tin chopped tomatoes", "tomatoes")],
    method: ["Peel and dice the sweet potatoes and carrots.", "Fry the onion in a little oil for 5 minutes until soft.", "Add the mince and brown it, breaking it up as it cooks.", "Stir in the garam masala, then the tomatoes, sweet potato and carrot. Simmer for 25 minutes.", "Wilt the spinach through and serve."] },
  { id: "linguine", name: "Sardine linguine", serves: 2, minutes: 20, wantToCook: true, tags: ["Italian", "dinner"], ingredients: [
    ing("200 g linguine", "linguine", 1, { partial: true, uses: 200 }), ing("1 tin sardines", "sardines"), ing("1 lemon", "lemons"), ing("1 small bunch parsley", "parsley"),
    ing("1 pinch chilli flakes", "chilli", 1, { partial: true }), ing("2 tbsp olive oil", "oil", 1, { partial: true })],
    method: ["Cook the linguine in salted water for 10 minutes.", "Warm the oil with the chilli, then add the sardines and break them up.", "Toss the drained pasta through with lemon juice and zest.", "Finish with chopped parsley."] },
  { id: "shakshuka", name: "Shakshuka", serves: 2, minutes: 30, wantToCook: false, tags: ["Brunch"], ingredients: [
    ing("4 eggs", "eggs", 4), ing("2 × 400 g tins chopped tomatoes", "tomatoes", 2), ing("1 red pepper", "pepper"), ing("1 onion", "onions"),
    ing("1 tsp smoked paprika", "paprika", 1, { partial: true }), ing("100 g feta", "")],
    method: ["Soften the onion and pepper in oil for 8 minutes.", "Add the paprika, then the tomatoes. Simmer for 10 minutes.", "Make four wells and crack in the eggs. Cover and cook for 6 minutes.", "Crumble over the feta and serve."] },
  { id: "flatbreads", name: "Big batch flatbreads", serves: 12, minutes: 40, wantToCook: false, tags: ["Baking"], ingredients: [
    ing("1.5 kg plain flour", "flour", 1, { partial: true, uses: 1500 }), ing("1 tub Greek yoghurt", "yoghurt"), ing("3 tbsp olive oil", "oil", 1, { partial: true })],
    method: ["Mix the flour, yoghurt, oil and a pinch of salt into a soft dough.", "Knead for 2 minutes, then rest it for 15 minutes.", "Divide into 12 balls and roll each one thin.", "Cook in a dry, hot pan for a minute on each side."] },
]

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

export function demoState(): PhoneState {
  const all = items()
  const synced = { items: clone(all), categories: clone(categories), stores: clone(stores), recipes: clone(recipes) }
  return {
    ...emptyState(),
    owner: { id: "demo", email: "demo@collca.app" },
    items: all, categories: clone(categories), stores: clone(stores), recipes: clone(recipes),
    synced, storeId: "sainsburys", syncedAt: new Date().toISOString(),
  }
}
