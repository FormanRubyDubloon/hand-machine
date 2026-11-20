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
import type { Item } from "../model"
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

type Staple = { name: string; categoryId: string; location: NonNullable<Item["location"]>; type?: Item["type"]; unit?: [string, string]; noExpiry?: boolean }

/** What most kitchens keep. Each starts at 1 in stock with a minimum of 1, so it's a Staple. */
const staples: Staple[] = [
  { name: "Onions", categoryId: "fruit-and-veg", location: "cupboard" },
  { name: "Garlic", categoryId: "fruit-and-veg", location: "cupboard", unit: ["bulb", "bulbs"] },
  { name: "Lemons", categoryId: "fruit-and-veg", location: "fridge" },
  { name: "Eggs", categoryId: "dairy-and-chilled", location: "fridge" },
  { name: "Butter", categoryId: "dairy-and-chilled", location: "fridge", unit: ["pack", "packs"] },
  { name: "Milk", categoryId: "dairy-and-chilled", location: "fridge", unit: ["bottle", "bottles"] },
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
    location: s.location, ...(s.unit && { unit: s.unit }), ...(s.noExpiry ? { noExpiry: true, useBy: [] } : { useBy: [null] }),
  } as Item
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
    if (start === "staples") actions.importItems(staples.map((s) => ({ item: stapleItem(s) })))
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
                <p className="text-sm text-muted-foreground">Recipes come later, from Claude or by hand.</p>
              </div>
              <div role="radiogroup" aria-label="How to start" className="flex flex-col gap-2">
                {([
                  ["staples", "Add common staples", `${staples.length} things most kitchens keep, like eggs, onions, rice and olive oil. Each starts at 1 in stock with a minimum of 1. Remove or recount them in the Pantry.`],
                  ["import", "Import a list", "Paste a list or upload a spreadsheet of what you have."],
                  ["empty", "Start empty", "Add things as you go."],
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
