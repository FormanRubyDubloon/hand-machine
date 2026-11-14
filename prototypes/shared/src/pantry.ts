// The one seed both prototypes start from, and the localStorage keys they share.
// The pantry app (desktop) and the shopping app (phone) run on the same site, so a change in one
// shows in the other: pantry edits reach the phone at its next sync, and a phone sync lands here.
//
// Shapes match prototypes/shopping-list/src/model.ts. The pantry-only fields (location, use-by
// dates, price, brand, other names, pack size) are optional, so the phone carries them through
// a sync without knowing about them.

/** Pantry items, shared. The phone reads and writes this at sync. */
export const ITEMS_KEY = "hm-pantry:items:v1"
/** Stores, aisles (categories), recipes and history. Owned by the pantry app; the phone pulls at sync. */
export const DB_KEY = "hm-pantry:db:v1"
/** The phone's own state. The pantry app reads its last sync time from here. */
export const PHONE_KEY = "hm-shopping-list:v3"

export type Location = "fridge" | "freezer" | "cupboard"
export type Category = { id: string; name: string }
export type ListSource = { kind: "hand" } | { kind: "claude" } | { kind: "recipe"; recipe: string }
export type ListEntry = { source: ListSource; qty: number; at?: string }

export type SharedItem = {
  id: string
  name: string
  type: "counted" | "bulk"
  /** Minimum to keep. Above 0 makes it a Staple. */
  target: number
  /** Counted: how many. Bulk: whole packs, including open ones. */
  inStock: number
  /** Bulk: how many of the packs are open. */
  open?: number
  unit?: [string, string]
  notes?: string
  /** Shop or aisle. */
  categoryId: string
  /** Store ids that sell it. Empty means any store with the aisle. */
  where: string[]
  entries?: ListEntry[]
  editedAt?: string

  // ----- pantry app only -----
  location?: Location
  otherNames?: string[]
  /** Bulk: what one pack holds, e.g. 1000 g. */
  packSize?: { amount: number; measure: "g" | "ml" }
  /** Pence. */
  price?: number
  /** Blank means any brand. */
  brand?: string
  /** One ISO date per unit or pack in stock, soonest first. One date only when the minimum is 1 or less. */
  useBy?: (string | null)[]
  /** Bulk: when each open pack was opened, matching the first `open` entries of useBy. */
  openedAt?: (string | null)[]
  /** A one-off on the list: not a pantry item, stock isn't tracked. */
  oneOff?: boolean
  /** How often it's recorded as used. Orders the Home tiles. */
  uses?: number
}

export type SharedIngredient = {
  /** The recipe's own wording, at the recipe's own servings. */
  text: string
  /** Pantry item. "" when the item was deleted: the wording stays, the link goes. */
  itemId: string
  /** Counted items: how many it needs. */
  need: number
  /** How many to put on the list when it's short. */
  buy: number
  /** Uses part of a unit or pack (a clove of garlic, some milk): Cooked it shows "Finished it" instead of a count. */
  partial?: boolean
  /** Bulk with a pack size: how much it uses, in the pack's measure. Drives the pack-size warning. */
  uses?: number
}

export type SharedRecipe = {
  id: string
  name: string
  minutes: number
  serves: number
  wantToCook: boolean
  soon?: string
  ingredients: SharedIngredient[]
  method: string[]
  // ----- pantry app only -----
  prep?: number
  cook?: number
  tags?: string[]
  meal?: "Breakfast" | "Lunch" | "Dinner" | "Baking"
  source?: string
  notes?: string
  lastCooked?: string | null
  addedBy?: "claude" | "you"
  addedAt?: string
}

export type SharedStore = {
  id: string
  name: string
  /** Aisle number per category. null = not sold here. */
  aisles: Record<string, number | null>
  kind?: string
  place?: string
}

// ---------- dates ----------

const DAY = 86_400_000
/** Midnight today plus n days, as an ISO date. Keeps the seed fresh whatever day the demo runs. */
export function day(n: number) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  return new Date(d.getTime() + n * DAY).toISOString().slice(0, 10)
}
/** Today (or n days ago) at a time, as an ISO timestamp. */
export function at(h: number, m: number, daysAgo = 0) {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return new Date(d.getTime() - daysAgo * DAY).toISOString()
}

// ---------- seed ----------

export const seedCategories: Category[] = [
  { id: "fruit", name: "Fruit & veg" },
  { id: "bread", name: "Bread & crackers" },
  { id: "dairy", name: "Dairy & chilled" },
  { id: "deli", name: "Deli" },
  { id: "meat", name: "Meat & fish" },
  { id: "baking", name: "Baking" },
  { id: "pasta", name: "Pasta, rice & pulses" },
  { id: "tins", name: "Tins & jars" },
  { id: "world", name: "World foods" },
  { id: "spices", name: "Herbs & spices" },
  { id: "oils", name: "Oils & vinegar" },
  { id: "frozen", name: "Frozen" },
  { id: "household", name: "Household" },
]

export const seedStores: SharedStore[] = [
  {
    id: "sainsburys", name: "Sainsbury's, Stoke Newington", kind: "Supermarket", place: "Stoke Newington",
    aisles: { fruit: 1, bread: 2, dairy: 3, deli: 4, meat: 5, baking: 7, pasta: 8, tins: 9, world: 10, spices: 11, oils: 12, frozen: 14, household: null },
  },
  {
    id: "tesco", name: "Tesco Express", kind: "Supermarket", place: "Church Street",
    aisles: { fruit: 1, bread: 2, dairy: 3, deli: 3, meat: 4, baking: 5, pasta: 5, tins: 6, world: 6, spices: 6, oils: 6, frozen: 7, household: 8 },
  },
  {
    id: "greengrocer", name: "Greengrocer", kind: "Greengrocer", place: "Church Street",
    aisles: { fruit: 1, bread: null, dairy: null, deli: null, meat: null, baking: null, pasta: null, tins: null, world: null, spices: null, oils: null, frozen: null, household: null },
  },
  {
    id: "butcher", name: "Butcher", kind: "Butcher", place: "Church Street",
    aisles: { fruit: null, bread: null, dairy: null, deli: 2, meat: 1, baking: null, pasta: null, tins: null, world: null, spices: null, oils: null, frozen: null, household: null },
  },
  {
    id: "fishmonger", name: "Fishmonger", kind: "Fishmonger", place: "Stoke Newington High St",
    aisles: { fruit: null, bread: null, dairy: null, deli: null, meat: 1, baking: null, pasta: null, tins: null, world: null, spices: null, oils: null, frozen: null, household: null },
  },
]

const bag: [string, string] = ["bag", "bags"]
const jar: [string, string] = ["jar", "jars"]
const bottle: [string, string] = ["bottle", "bottles"]
const bunch: [string, string] = ["bunch", "bunches"]
const tin: [string, string] = ["tin", "tins"]
const pack: [string, string] = ["pack", "packs"]

type Seed = Omit<SharedItem, "where"> & { where?: string[] }
const item = (i: Seed): SharedItem => ({ where: [], ...i })

/** The pantry as the phone last saw it, at its last sync (today, 10:02). */
export const seedItems: SharedItem[] = [
  // Fridge
  item({ id: "eggs", name: "Eggs", type: "counted", target: 6, inStock: 4, categoryId: "dairy", location: "fridge", price: 30, brand: "Clarence Court", useBy: [day(10), day(10), day(12), day(12)], otherNames: ["Egg"], uses: 40 }),
  item({ id: "whole-milk", name: "Whole milk", type: "counted", target: 2, inStock: 1, unit: bottle, categoryId: "dairy", location: "fridge", price: 165, brand: "Estate Dairy", useBy: [day(3)], otherNames: ["Full-fat milk"], notes: "2 litre", uses: 38 }),
  item({ id: "milk", name: "Milk", type: "counted", target: 0, inStock: 0, categoryId: "dairy", location: "fridge", notes: "Created by Claude for Pancakes" }),
  item({ id: "butter", name: "Butter", type: "counted", target: 1, inStock: 1, unit: pack, categoryId: "dairy", location: "fridge", price: 210, brand: "Président", useBy: [day(28)], uses: 30 }),
  item({ id: "cheddar", name: "Cheddar", type: "counted", target: 1, inStock: 2, unit: ["block", "blocks"], categoryId: "dairy", location: "fridge", price: 350, brand: "Montgomery's", useBy: [day(49)], uses: 22 }),
  item({ id: "salmon", name: "Salmon", type: "counted", target: 0, inStock: 2, unit: ["fillet", "fillets"], categoryId: "meat", location: "fridge", price: 550, useBy: [day(1)], where: ["fishmonger", "sainsburys"], uses: 8 }),
  item({ id: "chicken-thighs", name: "Chicken thighs", type: "counted", target: 1, inStock: 0, unit: pack, categoryId: "meat", location: "fridge", price: 475, where: ["sainsburys", "butcher"], uses: 9 }),
  item({ id: "steak", name: "Steak", type: "counted", target: 2, inStock: 0, categoryId: "meat", location: "freezer", price: 650, where: ["sainsburys", "butcher"] }),
  item({ id: "kimchi", name: "Kimchi", type: "counted", target: 2, inStock: 1, unit: jar, categoryId: "deli", location: "fridge", price: 320, brand: "Mr Kim", useBy: [day(16)], uses: 14 }),
  item({ id: "saucisson", name: "Saucisson", type: "counted", target: 1, inStock: 0, unit: ["piece", "pieces"], categoryId: "deli", location: "fridge", price: 450 }),
  item({ id: "lemon-curd", name: "Lemon curd", type: "counted", target: 0, inStock: 1, unit: jar, categoryId: "tins", location: "fridge", price: 225, useBy: [day(16)] }),
  item({ id: "black-olives", name: "Black olives", type: "counted", target: 0, inStock: 0, unit: jar, categoryId: "deli", location: "fridge", price: 180 }),
  item({
    id: "fennel", name: "Fennel", type: "counted", target: 0, inStock: 0, unit: ["bulb", "bulbs"], categoryId: "fruit", location: "fridge", price: 90,
    entries: [{ source: { kind: "recipe", recipe: "Fennel and orange salad" }, qty: 1 }],
  }),
  item({ id: "chillis", name: "Chillis", type: "counted", target: 3, inStock: 1, notes: "Habanero", categoryId: "fruit", location: "fridge", price: 25, useBy: [day(6)], otherNames: ["Chilli"] }),
  item({ id: "spring-onions", name: "Spring onions", type: "counted", target: 0, inStock: 0, unit: bunch, categoryId: "fruit", location: "fridge", price: 60 }),
  item({
    id: "parsley", name: "Parsley", type: "counted", target: 0, inStock: 0, unit: bunch, categoryId: "fruit", location: "fridge", price: 85,
    entries: [{ source: { kind: "recipe", recipe: "Sardine linguine" }, qty: 1 }],
  }),
  item({
    id: "mint", name: "Mint", type: "counted", target: 0, inStock: 0, unit: bunch, categoryId: "fruit", location: "fridge", price: 85,
    entries: [{ source: { kind: "recipe", recipe: "Fennel and orange salad" }, qty: 1 }],
  }),
  item({ id: "thyme", name: "Thyme", type: "counted", target: 0, inStock: 0, unit: bunch, categoryId: "fruit", location: "fridge", price: 85 }),
  // Cupboard
  item({ id: "lemons", name: "Lemons", type: "counted", target: 6, inStock: 2, categoryId: "fruit", location: "cupboard", price: 35, useBy: [day(7), day(9)], otherNames: ["Lemon"], uses: 26 }),
  item({
    id: "oranges", name: "Oranges", type: "counted", target: 0, inStock: 0, categoryId: "fruit", location: "cupboard", price: 40,
    entries: [{ source: { kind: "recipe", recipe: "Fennel and orange salad" }, qty: 2 }],
  }),
  item({ id: "red-onions", name: "Red onions", type: "counted", target: 2, inStock: 3, categoryId: "fruit", location: "cupboard", price: 20, otherNames: ["Red onion", "Onion"], uses: 18 }),
  item({ id: "garlic", name: "Garlic", type: "counted", target: 1, inStock: 1, unit: ["bulb", "bulbs"], categoryId: "fruit", location: "cupboard", price: 45, useBy: [day(20)], uses: 20 }),
  item({ id: "sweet-potatoes", name: "Sweet potatoes", type: "counted", target: 4, inStock: 0, categoryId: "fruit", location: "cupboard", price: 35 }),
  item({ id: "potatoes", name: "Potatoes", type: "counted", target: 0, inStock: 0, unit: bag, categoryId: "fruit", location: "cupboard", price: 150 }),
  item({ id: "peppers", name: "Peppers", type: "counted", target: 0, inStock: 0, categoryId: "fruit", location: "fridge", price: 55, otherNames: ["Pepper", "Red pepper"] }),
  item({ id: "aubergine", name: "Aubergine", type: "counted", target: 0, inStock: 0, categoryId: "fruit", location: "fridge", price: 90, otherNames: ["Eggplant"] }),
  item({ id: "kiwis", name: "Kiwis", type: "counted", target: 3, inStock: 0, categoryId: "fruit", location: "cupboard", price: 30 }),
  item({ id: "sourdough", name: "Sourdough bread", type: "counted", target: 1, inStock: 0, unit: ["loaf", "loaves"], categoryId: "bread", location: "cupboard", price: 380, brand: "E5 Bakehouse", uses: 16 }),
  item({ id: "oatcakes", name: "Oatcakes", type: "counted", target: 2, inStock: 2, unit: pack, categoryId: "bread", location: "cupboard", price: 150, useBy: [day(60), day(75)] }),
  item({ id: "plain-flour", name: "Plain flour", type: "bulk", target: 2, inStock: 2, open: 1, unit: bag, packSize: { amount: 1500, measure: "g" }, categoryId: "baking", location: "cupboard", price: 180, brand: "Doves Farm", useBy: [day(130), day(220)], openedAt: [day(-12)], otherNames: ["Flour", "All-purpose flour"], uses: 12 }),
  item({ id: "caster-sugar", name: "Caster sugar", type: "bulk", target: 0, inStock: 0, unit: bag, packSize: { amount: 1000, measure: "g" }, categoryId: "baking", location: "cupboard", price: 140 }),
  item({ id: "breadcrumbs", name: "Breadcrumbs", type: "bulk", target: 0, inStock: 1, open: 1, unit: bag, categoryId: "baking", location: "cupboard", price: 95, useBy: [day(90)], openedAt: [day(-20)] }),
  item({ id: "brown-rice", name: "Brown rice", type: "bulk", target: 2, inStock: 1, open: 1, unit: bag, packSize: { amount: 1000, measure: "g" }, categoryId: "pasta", location: "cupboard", price: 240, brand: "Tilda", useBy: [day(270)], openedAt: [day(-6)], otherNames: ["Rice"], uses: 10 }),
  item({ id: "basmati-rice", name: "Basmati rice", type: "bulk", target: 2, inStock: 1, open: 1, unit: bag, packSize: { amount: 1000, measure: "g" }, categoryId: "pasta", location: "cupboard", price: 260, useBy: [day(300)], openedAt: [day(-30)] }),
  item({ id: "red-lentils", name: "Red lentils", type: "bulk", target: 1, inStock: 1, open: 1, unit: bag, categoryId: "pasta", location: "cupboard", price: 150, useBy: [day(240)], openedAt: [day(-40)] }),
  item({ id: "oats", name: "Oats", type: "bulk", target: 0, inStock: 0, unit: bag, packSize: { amount: 1000, measure: "g" }, categoryId: "pasta", location: "cupboard", price: 130, otherNames: ["Porridge oats"] }),
  item({
    id: "linguine", name: "Linguine", type: "counted", target: 0, inStock: 0, unit: pack, categoryId: "pasta", location: "cupboard", price: 110,
    entries: [{ source: { kind: "recipe", recipe: "Sardine linguine" }, qty: 1 }],
  }),
  item({ id: "sardines", name: "Sardines", type: "counted", target: 4, inStock: 7, unit: tin, categoryId: "tins", location: "cupboard", price: 120, useBy: [day(400), day(400), day(420), day(420), day(500), day(500), day(520)], uses: 11 }),
  item({ id: "chopped-tomatoes", name: "Chopped tomatoes", type: "counted", target: 12, inStock: 10, unit: tin, categoryId: "tins", location: "cupboard", price: 55, brand: "Mutti", useBy: Array.from({ length: 10 }, (_, i) => day(480 + i * 10)), otherNames: ["Tinned tomatoes"], uses: 24 }),
  item({ id: "soy-sauce", name: "Soy sauce", type: "bulk", target: 1, inStock: 1, open: 1, unit: bottle, categoryId: "world", location: "cupboard", price: 210, useBy: [day(365)], openedAt: [day(-50)] }),
  item({ id: "sesame-oil", name: "Sesame oil", type: "bulk", target: 0, inStock: 1, open: 1, unit: bottle, categoryId: "world", location: "cupboard", price: 260, useBy: [day(200)], openedAt: [day(-60)] }),
  item({ id: "miso", name: "Miso", type: "counted", target: 0, inStock: 0, unit: jar, categoryId: "world", location: "fridge", price: 300 }),
  item({ id: "chilli-flakes", name: "Chilli flakes", type: "bulk", target: 0, inStock: 1, open: 1, unit: jar, categoryId: "spices", location: "cupboard", price: 150, useBy: [day(400)], openedAt: [day(-90)] }),
  item({ id: "smoked-paprika", name: "Smoked paprika", type: "bulk", target: 0, inStock: 1, open: 1, unit: jar, categoryId: "spices", location: "cupboard", price: 220, useBy: [day(430)], openedAt: [day(-70)], otherNames: ["Paprika"] }),
  item({ id: "turmeric", name: "Turmeric", type: "bulk", target: 0, inStock: 1, open: 1, unit: jar, categoryId: "spices", location: "cupboard", price: 150, useBy: [day(500)], openedAt: [day(-100)] }),
  item({ id: "olive-oil", name: "Olive oil", type: "bulk", target: 1, inStock: 3, open: 1, unit: bottle, categoryId: "oils", location: "cupboard", price: 750, brand: "Belazu", useBy: [day(330), day(400), day(400)], openedAt: [day(-14)], uses: 28 }),
  // Freezer
  item({ id: "peas", name: "Peas", type: "bulk", target: 1, inStock: 1, open: 1, unit: bag, categoryId: "frozen", location: "freezer", price: 150, brand: "Birds Eye", useBy: [day(120)], openedAt: [day(-3)], otherNames: ["Frozen peas"], uses: 9 }),
  item({ id: "frozen-berries", name: "Frozen berries", type: "bulk", target: 0, inStock: 1, open: 1, unit: bag, categoryId: "frozen", location: "freezer", price: 300, useBy: [day(150)], openedAt: [day(-8)], otherNames: ["Berries"] }),
  item({ id: "fish-fingers", name: "Fish fingers", type: "counted", target: 1, inStock: 0, unit: ["box", "boxes"], categoryId: "frozen", location: "freezer", price: 280 }),
  // Household
  item({ id: "steel-wool", name: "Steel wool", type: "counted", target: 1, inStock: 0, categoryId: "household", location: "cupboard", price: 120 }),
  item({ id: "tin-foil", name: "Tin foil", type: "counted", target: 2, inStock: 1, unit: ["roll", "rolls"], categoryId: "household", location: "cupboard", price: 150 }),
]

/** The pantry now: what the phone last saw, plus what changed here or through Claude since. */
export function seedPantryItems(): Record<string, SharedItem> {
  const items = Object.fromEntries(structuredClone(seedItems).map((i) => [i.id, i]))
  items.sourdough = { ...items.sourdough, target: 2, editedAt: at(11, 15) }
  items.lemons = { ...items.lemons, inStock: 1, useBy: [day(9)], editedAt: at(11, 40) }
  items.tissues = {
    id: "tissues", name: "Tissues", type: "counted", target: 0, inStock: 0, categoryId: "household", location: "cupboard", where: [], price: 110,
    unit: ["box", "boxes"], entries: [{ source: { kind: "claude" }, qty: 3, at: at(11, 20) }], editedAt: at(11, 20),
  }
  return items
}

type Ing = SharedIngredient
const ing = (text: string, itemId: string, need = 1, extra: Partial<Ing> = {}): Ing => ({ text, itemId, need, buy: need, ...extra })
const part = (text: string, itemId: string, extra: Partial<Ing> = {}): Ing => ing(text, itemId, 1, { partial: true, ...extra })

export const seedRecipes: SharedRecipe[] = [
  {
    id: "salmon-lemon-peas", name: "Salmon with lemon and peas", prep: 5, cook: 20, minutes: 25, serves: 2, wantToCook: false,
    tags: ["Fish"], meal: "Dinner", soon: "uses salmon, use by tomorrow", source: "BBC Good Food", addedBy: "claude", addedAt: at(9, 0, 30), lastCooked: at(19, 0, 12),
    ingredients: [
      ing("2 salmon fillets", "salmon", 2),
      ing("1 lemon", "lemons", 1),
      part("200 g frozen peas", "peas"),
      part("1 tbsp olive oil", "olive-oil"),
    ],
    method: [
      "Season the salmon. Heat the oil in a frying pan and cook the salmon skin side down for 5 minutes.",
      "Turn the fillets and cook for 2 minutes more. Squeeze over half the lemon.",
      "Meanwhile, simmer the peas for 3 minutes. Drain and toss with the rest of the lemon juice.",
      "Serve the salmon on the peas.",
    ],
  },
  {
    id: "cheddar-omelette", name: "Cheddar omelette", prep: 2, cook: 8, minutes: 10, serves: 1, wantToCook: false,
    tags: [], meal: "Breakfast", source: "My own", addedBy: "you", addedAt: at(9, 0, 60), lastCooked: at(8, 30, 3),
    ingredients: [
      ing("3 eggs", "eggs", 3),
      part("2 tbsp whole milk", "whole-milk"),
      part("30 g cheddar, grated", "cheddar"),
      part("Knob of butter", "butter"),
    ],
    method: ["Beat the eggs with the milk and a pinch of salt.", "Melt the butter in a small pan until it foams.", "Pour in the eggs, stir gently, then leave to set. Add the cheese and fold."],
  },
  {
    id: "kimchi-fried-rice", name: "Kimchi fried rice", prep: 10, cook: 10, minutes: 20, serves: 2, wantToCook: false,
    tags: ["Korean"], meal: "Dinner", source: "Maangchi", addedBy: "claude", addedAt: at(9, 0, 40), lastCooked: null,
    ingredients: [
      part("300 g brown rice, cooked and cooled", "brown-rice", { uses: 300 }),
      ing("1 jar kimchi, chopped", "kimchi", 1),
      ing("2 eggs", "eggs", 2),
      part("1 tbsp soy sauce", "soy-sauce"),
      part("2 tsp sesame oil", "sesame-oil"),
      part("1 clove garlic", "garlic"),
    ],
    method: [
      "Fry the garlic in the sesame oil for a minute.",
      "Add the kimchi and fry until it starts to catch.",
      "Add the rice and soy sauce. Toss over a high heat until hot through.",
      "Push to one side, fry the eggs, then serve on top.",
    ],
  },
  {
    id: "tomato-soup", name: "Tomato soup", prep: 10, cook: 25, minutes: 35, serves: 4, wantToCook: false,
    tags: ["Soup"], meal: "Lunch", source: "My own", addedBy: "you", addedAt: at(9, 0, 90), lastCooked: at(13, 0, 20),
    ingredients: [
      ing("2 × 400 g tins chopped tomatoes", "chopped-tomatoes", 2),
      ing("1 red onion, chopped", "red-onions", 1),
      part("2 cloves garlic", "garlic"),
      part("2 tbsp olive oil", "olive-oil"),
      part("½ tsp smoked paprika", "smoked-paprika"),
    ],
    method: ["Soften the onion and garlic in the oil for 10 minutes.", "Add the paprika, then the tomatoes and a tin of water.", "Simmer for 15 minutes and blend until smooth."],
  },
  {
    id: "flatbreads", name: "Flatbreads", prep: 10, cook: 10, minutes: 20, serves: 4, wantToCook: false,
    tags: ["Side"], meal: "Baking", source: "My own", addedBy: "you", addedAt: at(9, 0, 120), lastCooked: at(18, 0, 9),
    ingredients: [
      part("250 g plain flour", "plain-flour", { uses: 250 }),
      part("150 ml whole milk", "whole-milk"),
      part("1 tbsp olive oil", "olive-oil"),
    ],
    method: ["Mix the flour, milk, oil and a pinch of salt into a soft dough.", "Divide into 4 and roll out thinly.", "Cook in a hot dry pan for a minute or two on each side."],
  },
  {
    id: "sardine-linguine", name: "Sardine linguine", prep: 5, cook: 15, minutes: 20, serves: 2, wantToCook: true,
    tags: ["Italian"], meal: "Dinner", source: "Pasted text", addedBy: "claude", addedAt: at(9, 14), lastCooked: null,
    notes: "Good with extra lemon. Toast the breadcrumbs for longer than seems right.",
    ingredients: [
      part("200 g linguine", "linguine"),
      ing("2 × 120 g tins sardines in olive oil", "sardines", 2),
      part("2 cloves garlic, sliced", "garlic"),
      ing("1 lemon, zest and juice", "lemons", 1),
      part("½ tsp chilli flakes", "chilli-flakes"),
      part("3 tbsp olive oil", "olive-oil"),
      ing("Small bunch parsley, chopped", "parsley", 1),
      part("2 tbsp breadcrumbs", "breadcrumbs"),
    ],
    method: [
      "Boil the linguine in salted water until just tender. Keep a cup of the cooking water.",
      "Warm the olive oil in a wide pan. Fry the breadcrumbs until golden, then tip them out.",
      "Add the garlic and chilli flakes to the pan and cook gently for a minute.",
      "Add the sardines with their oil and break them up. Stir in the lemon zest and juice.",
      "Toss the pasta through with a splash of the cooking water. Top with the parsley and breadcrumbs.",
    ],
  },
  {
    id: "fennel-orange-salad", name: "Fennel and orange salad", prep: 15, cook: 0, minutes: 15, serves: 2, wantToCook: true,
    tags: ["Salad"], meal: "Lunch", source: "Ottolenghi, Simple", addedBy: "claude", addedAt: at(10, 0, 5), lastCooked: null,
    ingredients: [
      ing("1 fennel bulb, thinly sliced", "fennel", 1),
      ing("2 oranges", "oranges", 2),
      ing("1 lemon, juiced", "lemons", 1),
      part("½ red onion", "red-onions"),
      part("3 tbsp olive oil", "olive-oil"),
      ing("Handful of black olives", "black-olives", 1, { partial: true }),
      ing("Small bunch of mint", "mint", 1),
    ],
    method: [
      "Slice the fennel as thinly as you can and put it in a bowl with the lemon juice.",
      "Peel the oranges, cut away the pith and slice into rounds.",
      "Slice the red onion very thinly.",
      "Toss everything with the olive oil, olives and torn mint. Season and serve straight away.",
    ],
  },
  {
    id: "shakshuka", name: "Shakshuka", prep: 10, cook: 20, minutes: 30, serves: 2, wantToCook: false,
    tags: ["Brunch"], meal: "Breakfast", source: "My own", addedBy: "you", addedAt: at(9, 0, 50), lastCooked: at(10, 0, 16),
    ingredients: [
      ing("2 peppers, sliced", "peppers", 2),
      ing("4 eggs", "eggs", 4),
      ing("400 g tin chopped tomatoes", "chopped-tomatoes", 1),
      part("1 red onion", "red-onions"),
      part("1 tsp smoked paprika", "smoked-paprika"),
      part("2 cloves garlic", "garlic"),
    ],
    method: ["Soften the onion, peppers and garlic.", "Add the paprika and tomatoes and simmer for 10 minutes.", "Make 4 wells, crack in the eggs, cover and cook until just set."],
  },
  {
    id: "lemon-drizzle-cake", name: "Lemon drizzle cake", prep: 15, cook: 45, minutes: 60, serves: 8, wantToCook: false,
    tags: [], meal: "Baking", source: "Mary Berry", addedBy: "claude", addedAt: at(9, 0, 70), lastCooked: at(15, 0, 41),
    ingredients: [
      part("225 g caster sugar", "caster-sugar", { uses: 225 }),
      part("225 g plain flour", "plain-flour", { uses: 225 }),
      part("225 g butter, softened", "butter"),
      ing("4 eggs", "eggs", 4),
      ing("2 lemons", "lemons", 2),
    ],
    method: ["Beat the butter and sugar, then the eggs, flour and zest.", "Bake at 180°C for 40 to 45 minutes.", "Pour over lemon juice mixed with sugar while warm."],
  },
  {
    id: "berry-porridge", name: "Berry porridge", prep: 1, cook: 9, minutes: 10, serves: 1, wantToCook: false,
    tags: [], meal: "Breakfast", source: "My own", addedBy: "you", addedAt: at(9, 0, 100), lastCooked: at(8, 0, 25),
    ingredients: [
      part("50 g oats", "oats", { uses: 50 }),
      part("200 ml whole milk", "whole-milk"),
      part("Handful of frozen berries", "frozen-berries"),
    ],
    method: ["Simmer the oats in the milk for 5 minutes, stirring.", "Stir in the berries and cook for a minute more."],
  },
  {
    id: "fish-finger-sandwiches", name: "Fish finger sandwiches", prep: 5, cook: 10, minutes: 15, serves: 2, wantToCook: false,
    tags: [], meal: "Lunch", source: "My own", addedBy: "you", addedAt: at(9, 0, 110), lastCooked: at(12, 30, 30),
    ingredients: [
      part("8 fish fingers", "fish-fingers"),
      part("4 slices sourdough bread", "sourdough"),
      part("Butter, for spreading", "butter"),
    ],
    method: ["Grill the fish fingers for 10 minutes, turning once.", "Butter the bread and make two sandwiches."],
  },
  {
    id: "chicken-traybake", name: "Chicken thigh traybake", prep: 10, cook: 40, minutes: 50, serves: 4, wantToCook: false,
    tags: [], meal: "Dinner", source: "Nigel Slater", addedBy: "claude", addedAt: at(9, 0, 45), lastCooked: at(19, 0, 35),
    ingredients: [
      ing("8 chicken thighs (1 pack)", "chicken-thighs", 1),
      part("750 g potatoes, halved", "potatoes"),
      ing("Few sprigs of thyme", "thyme", 1, { partial: true }),
      ing("2 lemons, quartered", "lemons", 2),
      part("4 cloves garlic", "garlic"),
      part("3 tbsp olive oil", "olive-oil"),
    ],
    method: ["Toss everything in a roasting tin with the oil and seasoning.", "Roast at 200°C for 40 minutes, turning once."],
  },
  {
    id: "miso-aubergine", name: "Miso aubergine", prep: 10, cook: 30, minutes: 40, serves: 2, wantToCook: false,
    tags: ["Japanese"], meal: "Dinner", source: "Pasted text", addedBy: "claude", addedAt: at(9, 0, 20), lastCooked: null,
    ingredients: [
      ing("2 aubergines, halved", "aubergine", 2),
      ing("2 tbsp white miso", "miso", 1, { partial: true }),
      ing("2 spring onions, sliced", "spring-onions", 1, { partial: true }),
      part("1 tbsp sesame oil", "sesame-oil"),
      part("150 g basmati rice", "basmati-rice", { uses: 150 }),
    ],
    method: ["Score the aubergines and roast cut side down for 25 minutes.", "Brush with miso and grill until bubbling.", "Serve on rice with spring onions."],
  },
  {
    id: "pancakes", name: "Pancakes", prep: 5, cook: 15, minutes: 20, serves: 2, wantToCook: false,
    tags: [], meal: "Breakfast", source: "Pasted text", addedBy: "claude", addedAt: at(9, 0, 4), lastCooked: null,
    ingredients: [
      part("100 g plain flour", "plain-flour", { uses: 100 }),
      ing("2 eggs", "eggs", 2),
      part("300 ml milk", "milk"),
      part("Butter, for frying", "butter"),
      ing("1 lemon, to serve", "lemons", 1),
    ],
    method: ["Whisk the flour, eggs and milk into a smooth batter.", "Fry thin pancakes in a little butter.", "Serve with lemon and sugar."],
  },
]

/** Normalise a store's aisles so every category has an entry (null when not sold there). */
export function fillAisles(store: SharedStore, categories: Category[]): SharedStore {
  return { ...store, aisles: Object.fromEntries(categories.map((c) => [c.id, store.aisles[c.id] ?? null])) }
}

// ---------- shared storage ----------

export type SharedDb = {
  categories: Category[]
  stores: SharedStore[]
  recipes: SharedRecipe[]
}

export function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked: ignore in the mock */
  }
}
