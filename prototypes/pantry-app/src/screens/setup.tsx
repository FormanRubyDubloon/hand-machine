// First run for a new account, after it's confirmed: which shops you use, then how to start the pantry.
// Shown once per account (the flag is on the account, so it isn't asked again on another computer). An
// account that already has a pantry skips it.
import * as React from "react"
import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { markSetupDone } from "../../../shared/src/auth"
import { todayIso, type Item, type Recipe } from "../model"
import { navigate } from "../router"
import { usePantry } from "../state"
import { Eyebrow } from "../components"

/** The seed's shops, named for anyone (the seed is one person's shops). Aisle numbers come from the seed. */
const shopChoices: { id: string; name: string; kind: string }[] = [
  { id: "sainsburys", name: "Supermarket", kind: "Supermarket" },
  { id: "tesco", name: "Local shop", kind: "Supermarket" },
  { id: "greengrocer", name: "Greengrocer", kind: "Greengrocer" },
  { id: "butcher", name: "Butcher", kind: "Butcher" },
  { id: "fishmonger", name: "Fishmonger", kind: "Fishmonger" },
]

/** dueToday: its use-by is the day the account is set up, so Home's Use today (and the tour's step for it) has something to show. */
type Staple = { name: string; categoryId: string; location: NonNullable<Item["location"]>; type?: Item["type"]; unit?: [string, string]; noExpiry?: boolean; dueToday?: boolean }

/** What most kitchens keep. Each starts at 1 in stock with a minimum of 1, so it's a Staple. */
const staples: Staple[] = [
  { name: "Onions", categoryId: "fruit-and-veg", location: "cupboard" },
  { name: "Garlic", categoryId: "fruit-and-veg", location: "cupboard", unit: ["bulb", "bulbs"] },
  { name: "Lemons", categoryId: "fruit-and-veg", location: "fridge" },
  { name: "Eggs", categoryId: "dairy-and-chilled", location: "fridge" },
  { name: "Butter", categoryId: "dairy-and-chilled", location: "fridge", unit: ["pack", "packs"] },
  { name: "Milk", categoryId: "dairy-and-chilled", location: "fridge", unit: ["bottle", "bottles"], dueToday: true },
  { name: "Bread", categoryId: "bread-and-crackers", location: "cupboard", unit: ["loaf", "loaves"] },
  { name: "Rice", categoryId: "grains-and-pulses", location: "cupboard", type: "bulk", unit: ["bag", "bags"] },
  { name: "Pasta", categoryId: "grains-and-pulses", location: "cupboard", type: "bulk", unit: ["bag", "bags"] },
  { name: "Chopped tomatoes", categoryId: "tins-and-jars", location: "cupboard", unit: ["tin", "tins"], noExpiry: true },
  { name: "Plain flour", categoryId: "baking", location: "cupboard", type: "bulk", unit: ["bag", "bags"] },
  { name: "Sugar", categoryId: "baking", location: "cupboard", type: "bulk", unit: ["bag", "bags"] },
  { name: "Salt", categoryId: "stock-and-seasonings", location: "cupboard", type: "bulk", noExpiry: true },
  { name: "Black pepper", categoryId: "herbs-and-spices", location: "cupboard", type: "bulk", noExpiry: true },
  { name: "Stock cubes", categoryId: "stock-and-seasonings", location: "cupboard", unit: ["pack", "packs"], noExpiry: true },
  { name: "Olive oil", categoryId: "oils-and-vinegar", location: "cupboard", type: "bulk", unit: ["bottle", "bottles"] },
  { name: "Tea", categoryId: "tea-and-coffee", location: "cupboard", type: "bulk", unit: ["box", "boxes"] },
  { name: "Coffee", categoryId: "tea-and-coffee", location: "cupboard", type: "bulk", unit: ["bag", "bags"] },
  { name: "Washing-up liquid", categoryId: "bathroom-and-kitchen", location: "household", unit: ["bottle", "bottles"], noExpiry: true },
  { name: "Toilet roll", categoryId: "bathroom-and-kitchen", location: "household", unit: ["roll", "rolls"], noExpiry: true },
]

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

function stapleItem(s: Staple): Item {
  return {
    id: slug(s.name), name: s.name, type: s.type ?? "counted", target: 1, inStock: 1, categoryId: s.categoryId, where: [],
    location: s.location, ...(s.unit && { unit: s.unit }), ...(s.noExpiry ? { noExpiry: true, useBy: [] } : { useBy: [s.dueToday ? todayIso() : null] }),
  } as Item
}

// ---------- the example recipe ----------

const VINDALOO = "Lamb Vindaloo"

/** The lamb for the example recipe: not a Staple (minimum 0), none in stock, on the list for the recipe. */
function lambItem(): Item {
  return {
    id: "lamb-shoulder", name: "Lamb shoulder", type: "counted", target: 0, inStock: 0, categoryId: "meat-and-fish", where: [],
    location: "fridge", unit: ["pack", "packs"], useBy: [],
    entries: [{ source: { kind: "recipe", recipe: VINDALOO }, qty: 1, at: new Date().toISOString() }],
  } as Item
}

/**
 * An example recipe, so Recipes isn't empty on day one and there's something to cook. Added by Collca, today.
 * Lines link to the starter staples only when they'll exist (not after Import a list); the rest stay as
 * wording, like any recipe with ingredients the pantry doesn't have.
 */
function vindaloo(have: Set<string>): Recipe {
  const line = (text: string, itemId = "", more: Partial<Recipe["ingredients"][number]> = {}) => ({
    text, itemId: have.has(itemId) ? itemId : "", need: 1, buy: 1, ...more,
  })
  const now = new Date().toISOString()
  return {
    id: "lamb-vindaloo", name: VINDALOO, minutes: 120, prep: 20, cook: 100, serves: 4, wantToCook: true,
    meal: "Dinner", tags: ["curry", "indian", "lamb"], addedBy: "collca", addedAt: now, lastCooked: null,
    notes: "An example to show how recipes work: the lamb is on your shopping list for it. Change it or delete it whenever you like.",
    ingredients: [
      line("800 g lamb shoulder, diced", "lamb-shoulder"),
      line("2 onions, finely sliced", "onions", { need: 2, buy: 2 }),
      line("6 cloves of garlic, crushed", "garlic", { partial: true }),
      line("A thumb of ginger, grated"),
      line("2 tsp Kashmiri chilli powder"),
      line("1 tsp ground cumin"),
      line("1 tsp ground coriander"),
      line("½ tsp ground cinnamon"),
      line("3 tbsp red wine vinegar"),
      line("1 tin of chopped tomatoes", "chopped-tomatoes"),
      line("2 tbsp oil", "olive-oil", { partial: true }),
      line("1 tsp sugar", "sugar", { partial: true }),
      line("Salt", "salt", { partial: true }),
      line("Rice, to serve", "rice", { partial: true }),
    ],
    method: [
      "Mix the chilli powder, cumin, coriander, cinnamon, vinegar, ginger and half the garlic into a paste. Rub it into the lamb with a good pinch of salt and leave for at least 30 minutes, or overnight in the fridge.",
      "Heat the oil in a heavy pan and cook the onions over a medium heat for about 15 minutes, until deep golden.",
      "Add the rest of the garlic and cook for a minute, then add the lamb and its marinade and fry for 5 minutes.",
      "Stir in the tomatoes, sugar and 200 ml water. Cover and simmer gently for about 1½ hours, until the lamb is tender. Add a splash of water if it catches.",
      "Taste, adjust the salt and vinegar, and serve with rice.",
    ],
  }
}

type Start = "empty" | "staples" | "import"

export function Setup({ onDone }: { onDone: () => void }) {
  const { db, actions } = usePantry()
  const [step, setStep] = React.useState<1 | 2>(1)
  const [shops, setShops] = React.useState(() => shopChoices.map((s, k) => ({ ...s, on: k === 0 })))
  const [start, setStart] = React.useState<Start>("staples")
  const [busy, setBusy] = React.useState(false)
  const kept = shops.filter((s) => s.on && s.name.trim())

  const finish = async () => {
    setBusy(true)
    // Shops: keep the ticked ones under the names given, drop the rest. The first ticked is the main one.
    for (const s of shopChoices) {
      const choice = shops.find((x) => x.id === s.id)!
      const store = db.stores.find((x) => x.id === s.id)
      if (!store) continue
      if (choice.on && choice.name.trim()) actions.saveStore({ ...store, name: choice.name.trim(), kind: choice.kind, place: "" })
      else actions.deleteStore(s.id)
    }
    if (kept[0]) actions.setDefaultStore(kept[0].id)
    // Every start except Start empty gets the example recipe, with its lamb on the shopping list.
    if (start !== "empty") {
      const items = [...(start === "staples" ? staples.map(stapleItem) : []), lambItem()]
      actions.importItems(items.map((item) => ({ item })))
      actions.saveRecipe(vindaloo(new Set(items.map((i) => i.id))), true)
    }
    await markSetupDone()
    setBusy(false)
    onDone()
    navigate(start === "import" ? { name: "import" } : { name: "home" })
  }

  return (
    <div className="grid min-h-dvh grid-cols-[1.1fr_1fr] bg-background">
      <div className="flex flex-col justify-between bg-primary p-12 text-primary-foreground">
        <span className="text-base font-semibold tracking-[0.12em] uppercase">Collca</span>
        <div className="flex max-w-xl flex-col gap-4">
          <h1 className="font-serif text-[clamp(36px,4.2vw,56px)] leading-none font-bold tracking-[0.02em] text-balance uppercase">Two things before you start</h1>
          <p className="text-primary-foreground/70">Which shops you use sets the order of your shopping list. Then choose how to fill the pantry. You can change both later.</p>
        </div>
        <span className="text-xs tracking-widest text-primary-foreground/70 uppercase">Step {step} of 2</span>
      </div>
      <div className="flex items-center justify-center p-12">
        <div className="flex w-full max-w-md flex-col gap-8">
          {step === 1 ? (
            <>
              <div className="flex flex-col gap-2">
                <h2 className="text-[22px] font-semibold tracking-[0.04em] uppercase">Your shops</h2>
                <p className="text-sm text-muted-foreground">
                  Tick the ones you use and give them your own names. The first one ticked is your main shop. Aisle order is a guess; change it in Settings.
                </p>
              </div>
              <div className="flex flex-col">
                {shops.map((s, k) => (
                  <label key={s.id} className="flex items-center gap-3 border-b border-border py-2.5">
                    <Checkbox checked={s.on} onCheckedChange={(c) => setShops(shops.map((x, j) => (j === k ? { ...x, on: !!c } : x)))} aria-label={`Use ${s.name || s.kind}`} />
                    <Input
                      value={s.name}
                      aria-label={`Name for the ${s.kind.toLowerCase()}`}
                      className={cn("h-9", !s.on && "text-muted-foreground")}
                      onChange={(e) => setShops(shops.map((x, j) => (j === k ? { ...x, name: e.target.value, on: true } : x)))}
                    />
                    <Eyebrow className="w-24 shrink-0 text-right">{s.kind}</Eyebrow>
                  </label>
                ))}
              </div>
              {!kept.length && <p role="alert" className="text-sm text-destructive">Tick at least one shop.</p>}
              <Button size="lg" disabled={!kept.length} onClick={() => setStep(2)}>Next</Button>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <h2 className="text-[22px] font-semibold tracking-[0.04em] uppercase">Start your pantry</h2>
                <p className="text-sm text-muted-foreground">The first two come with an example recipe, Lamb Vindaloo, and put its lamb on your shopping list. Add your own recipes later, through Claude or by hand.</p>
              </div>
              <div role="radiogroup" aria-label="How to start" className="flex flex-col gap-2">
                {([
                  ["staples", "Add common staples", `${staples.length} things most kitchens keep, like eggs, onions, rice and olive oil. Each starts at 1 in stock with a minimum of 1, and the milk is due today, so you can see how use-by dates work. Remove or recount them in the Pantry.`],
                  ["import", "Import a list", "Paste a list or upload a spreadsheet of what you have."],
                  ["empty", "Start empty", "Nothing in the pantry and no example recipe. Add things as you go."],
                ] as [Start, string, string][]).map(([value, title, sub]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={start === value}
                    onClick={() => setStart(value)}
                    className={cn(
                      "flex items-start gap-3 border p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      start === value ? "border-primary bg-muted" : "border-border hover:bg-muted/50",
                    )}
                  >
                    <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center border", start === value ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                      {start === value && <CheckIcon className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="text-sm font-semibold">{title}</span>
                      <span className="text-xs text-muted-foreground">{sub}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex justify-between gap-3">
                <Button variant="outline" size="lg" onClick={() => setStep(1)}>Back</Button>
                <Button size="lg" disabled={busy} onClick={() => void finish()}>{busy ? "Setting up" : "Start"}</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
