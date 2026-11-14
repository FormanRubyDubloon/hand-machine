// The one seed both prototypes start from, and the localStorage keys they share.
// The pantry app (desktop) and the shopping app (phone) run on the same site, so a change in one
// shows in the other: pantry edits reach the phone at its next sync, and a phone sync lands here.
//
// Shapes match prototypes/shopping-list/src/model.ts. The pantry-only fields (location, use-by
// dates, price, brand, other names, pack size) are optional, so the phone carries them through
// a sync without knowing about them.

/** Pantry items, shared. The phone reads and writes this at sync. */
export const ITEMS_KEY = "hm-pantry:items:v2"
/** Stores, aisles (categories), recipes and history. Owned by the pantry app; the phone pulls at sync. */
export const DB_KEY = "hm-pantry:db:v2"
/** The phone's own state. The pantry app reads its last sync time from here. */
export const PHONE_KEY = "hm-shopping-list:v4"

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
  { id: "fruit-and-veg", name: "Fruit & veg" },
  { id: "meat-and-fish", name: "Meat & fish" },
  { id: "deli-and-cured-meats", name: "Deli & cured meats" },
  { id: "dairy-and-chilled", name: "Dairy & chilled" },
  { id: "frozen", name: "Frozen" },
  { id: "tins-and-jars", name: "Tins & jars" },
  { id: "grains-and-pulses", name: "Grains & pulses" },
  { id: "bread-and-crackers", name: "Bread & crackers" },
  { id: "baking", name: "Baking" },
  { id: "herbs-and-spices", name: "Herbs & spices" },
  { id: "stock-and-seasonings", name: "Stock & seasonings" },
  { id: "sauces-and-condiments", name: "Sauces & condiments" },
  { id: "oils-and-vinegar", name: "Oils & vinegar" },
  { id: "nuts-and-dried-fruit", name: "Nuts & dried fruit" },
  { id: "tea-and-coffee", name: "Tea & coffee" },
  { id: "long-life-milk", name: "Long-life milk" },
  { id: "snacks-and-treats", name: "Snacks & treats" },
  { id: "bathroom-and-kitchen", name: "Bathroom & kitchen" },
]

export const seedStores: SharedStore[] = [
  {
    id: "sainsburys", name: "Sainsbury's, Stoke Newington", kind: "Supermarket", place: "Stoke Newington",
    aisles: { "fruit-and-veg": 1, "meat-and-fish": 5, "deli-and-cured-meats": 4, "dairy-and-chilled": 3, frozen: 14, "tins-and-jars": 9, "grains-and-pulses": 8, "bread-and-crackers": 2, baking: 7, "herbs-and-spices": 11, "stock-and-seasonings": 11, "sauces-and-condiments": 10, "oils-and-vinegar": 12, "nuts-and-dried-fruit": 7, "tea-and-coffee": 10, "long-life-milk": 3, "snacks-and-treats": 2, "bathroom-and-kitchen": null },
  },
  {
    id: "tesco", name: "Tesco Express", kind: "Supermarket", place: "Church Street",
    aisles: { "fruit-and-veg": 1, "meat-and-fish": 4, "deli-and-cured-meats": 3, "dairy-and-chilled": 3, frozen: 7, "tins-and-jars": 6, "grains-and-pulses": 5, "bread-and-crackers": 2, baking: 5, "herbs-and-spices": 6, "stock-and-seasonings": 6, "sauces-and-condiments": 6, "oils-and-vinegar": 6, "nuts-and-dried-fruit": 5, "tea-and-coffee": 6, "long-life-milk": 3, "snacks-and-treats": 2, "bathroom-and-kitchen": 8 },
  },
  {
    id: "greengrocer", name: "Greengrocer", kind: "Greengrocer", place: "Church Street",
    aisles: { "fruit-and-veg": 1, "meat-and-fish": null, "deli-and-cured-meats": null, "dairy-and-chilled": null, frozen: null, "tins-and-jars": null, "grains-and-pulses": null, "bread-and-crackers": null, baking: null, "herbs-and-spices": null, "stock-and-seasonings": null, "sauces-and-condiments": null, "oils-and-vinegar": null, "nuts-and-dried-fruit": null, "tea-and-coffee": null, "long-life-milk": null, "snacks-and-treats": null, "bathroom-and-kitchen": null },
  },
  {
    id: "butcher", name: "Butcher", kind: "Butcher", place: "Church Street",
    aisles: { "fruit-and-veg": null, "meat-and-fish": 1, "deli-and-cured-meats": 2, "dairy-and-chilled": null, frozen: null, "tins-and-jars": null, "grains-and-pulses": null, "bread-and-crackers": null, baking: null, "herbs-and-spices": null, "stock-and-seasonings": null, "sauces-and-condiments": null, "oils-and-vinegar": null, "nuts-and-dried-fruit": null, "tea-and-coffee": null, "long-life-milk": null, "snacks-and-treats": null, "bathroom-and-kitchen": null },
  },
  {
    id: "fishmonger", name: "Fishmonger", kind: "Fishmonger", place: "Stoke Newington High St",
    aisles: { "fruit-and-veg": null, "meat-and-fish": 1, "deli-and-cured-meats": null, "dairy-and-chilled": null, frozen: null, "tins-and-jars": null, "grains-and-pulses": null, "bread-and-crackers": null, baking: null, "herbs-and-spices": null, "stock-and-seasonings": null, "sauces-and-condiments": null, "oils-and-vinegar": null, "nuts-and-dried-fruit": null, "tea-and-coffee": null, "long-life-milk": null, "snacks-and-treats": null, "bathroom-and-kitchen": null },
  },
]

/**
 * The pantry's items. Empty until `loadSeedFromSupabase` (supabase-seed.ts) fills it, which both
 * prototypes await before they render. The demo items that used to live here are gone.
 */
export const seedItems: SharedItem[] = []

/** The pantry now: the items loaded from Supabase, by id. */
export function seedPantryItems(): Record<string, SharedItem> {
  return Object.fromEntries(structuredClone(seedItems).map((i) => [i.id, i]))
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
