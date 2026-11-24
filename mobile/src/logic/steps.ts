// The ingredients a recipe step uses, for the cooking view (Isaac's change, 24 Nov 2026). Steps are plain text and
// ingredients aren't tied to steps, so a step "uses" an ingredient when it names it: by the pantry item's name or
// other names, or by the ingredient's own wording once the amount and unit are taken off. Plurals match
// ("tomatoes" and "tomato"), and describing words ("chopped", "fresh") don't count. Pure, so it's tested
// (test/steps.test.ts).

/** Words that describe an ingredient rather than name it, and amount words: never matched on their own. */
const SKIP = new Set([
  // amounts and containers
  "g", "kg", "ml", "l", "tsp", "tbsp", "teaspoon", "teaspoons", "tablespoon", "tablespoons", "cup", "cups", "pinch",
  "handful", "bag", "bags", "tin", "tins", "can", "cans", "jar", "jars", "tub", "tubs", "pack", "packs", "bunch",
  "bunches", "packet", "box", "bottle", "piece", "pieces", "slice", "slices", "knob", "splash", "drizzle", "dash",
  "clove", "cloves", "sprig", "sprigs", "stick", "sticks", "x", "and", "or", "of", "a", "an", "the", "to", "for", "with",
  // describing words
  "small", "medium", "large", "big", "fresh", "frozen", "dried", "tinned", "chopped", "diced", "sliced", "minced",
  "grated", "crushed", "ground", "whole", "plain", "self", "raising", "smoked", "red", "green", "yellow", "white",
  "brown", "black", "sweet", "hot", "mild", "greek", "natural", "light", "dark", "extra", "virgin", "finely",
  "roughly", "thinly", "peeled", "optional", "boneless", "skinless", "free", "range", "organic", "ripe", "cooked",
  "uncooked", "dry", "soft", "hard", "full", "fat", "low", "semi", "skimmed", "unsalted", "salted", "juice", "zest",
])

/** "Tomatoes" → "tomato", "eggs" → "egg", "leaves" stays close enough. Only for comparing. */
const stem = (w: string) => w.replace(/(?:es|s)$/, "")

const wordsOf = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z\s-]/g, " ").split(/[\s-]+/).filter(Boolean)

/** The naming words of an ingredient: "1 × 400 g tin chopped tomatoes" → ["tomato"]. */
export function namingWords(...names: (string | undefined)[]): string[] {
  const out = new Set<string>()
  for (const name of names) {
    if (!name) continue
    // What comes after a comma or bracket is how to prepare it ("garlic, crushed"), not what it is.
    const core = name.split(/[,(]/)[0]
    for (const w of wordsOf(core)) if (w.length >= 3 && !SKIP.has(w)) out.add(stem(w))
  }
  return [...out]
}

/** True when the step names any of the words. */
export function stepNames(step: string, words: string[]) {
  const said = new Set(wordsOf(step).map(stem))
  return words.some((w) => said.has(w))
}

/**
 * The rows a step uses, in the recipe's order. `rows` are the recipe's ingredients with their wording (already
 * scaled to the servings) and, when linked, the pantry item's name and other names.
 */
export function ingredientsForStep<T extends { text: string; name?: string; otherNames?: string[] }>(step: string, rows: T[]): T[] {
  return rows.filter((r) => stepNames(step, namingWords(r.text, r.name, ...(r.otherNames ?? []))))
}
