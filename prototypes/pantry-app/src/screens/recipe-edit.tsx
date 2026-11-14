// Edit recipe: not drawn in the handoff. Isaac chose to allow editing here as well as through
// Claude, so this is a first, plain take for him to review: the same side panel, one field per
// recipe property, one row per ingredient, method as one step per line.
import * as React from "react"
import { PlusIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { matchesName, type Ingredient, type Recipe } from "../model"
import { usePantry } from "../state"
import { Eyebrow, Field, Segmented, SidePanel } from "../components"

const meals = ["Breakfast", "Lunch", "Dinner", "Baking"] as const

const blank = (): Recipe => ({
  id: `recipe-${Date.now().toString(36)}`, name: "", minutes: 0, prep: 0, cook: 0, serves: 2, wantToCook: false,
  ingredients: [{ text: "", itemId: "", need: 1, buy: 1 }], method: [], tags: [], addedBy: "you", addedAt: new Date().toISOString(), lastCooked: null,
})

export function RecipeEditor({ recipe, onClose, onCancel }: { recipe?: Recipe; onClose: () => void; onCancel: () => void }) {
  const { items, actions } = usePantry()
  const [draft, setDraft] = React.useState<Recipe>(() => structuredClone(recipe ?? blank()))
  const [method, setMethod] = React.useState((recipe?.method ?? []).join("\n"))
  const [tried, setTried] = React.useState(false)
  const pantry = Object.values(items).filter((i) => !i.oneOff).sort((a, b) => a.name.localeCompare(b.name))

  const set = (patch: Partial<Recipe>) => setDraft((d) => ({ ...d, ...patch }))
  const setIng = (k: number, patch: Partial<Ingredient>) => set({ ingredients: draft.ingredients.map((g, j) => (j === k ? { ...g, ...patch } : g)) })

  const ok = draft.name.trim() && draft.ingredients.some((g) => g.text.trim())
  const save = () => {
    setTried(true)
    if (!ok) return
    const steps = method.split("\n").map((s) => s.trim()).filter(Boolean)
    const out: Recipe = {
      ...draft,
      name: draft.name.trim(),
      minutes: (draft.prep ?? 0) + (draft.cook ?? 0),
      method: steps,
      ingredients: draft.ingredients.filter((g) => g.text.trim()).map((g) => ({ ...g, buy: g.need })),
    }
    actions.saveRecipe(out, !recipe)
    onClose()
  }

  return (
    <SidePanel
      open
      onClose={onCancel}
      width={800}
      eyebrow={recipe ? "Edit recipe" : "New recipe"}
      title={draft.name || "Untitled recipe"}
      description="Changes here reach the phone at its next sync. Claude can still change it too, and asks you first."
      footer={
        <>
          <span className="flex-1" />
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={save}>Save recipe</Button>
        </>
      }
    >
      <div className="flex flex-col gap-7">
        <Field label="Name">
          <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} aria-invalid={tried && !draft.name.trim()} />
        </Field>
        <div className="grid grid-cols-4 gap-5">
          <Field label="Prep (min)">
            <Input type="number" min={0} value={draft.prep ?? 0} onChange={(e) => set({ prep: parseInt(e.target.value || "0", 10) })} />
          </Field>
          <Field label="Cook (min)">
            <Input type="number" min={0} value={draft.cook ?? 0} onChange={(e) => set({ cook: parseInt(e.target.value || "0", 10) })} />
          </Field>
          <Field label="Serves">
            <Input type="number" min={1} value={draft.serves} onChange={(e) => set({ serves: Math.max(1, parseInt(e.target.value || "1", 10)) })} />
          </Field>
          <Field label="Source">
            <Input value={draft.source ?? ""} placeholder="A link or a book" onChange={(e) => set({ source: e.target.value || undefined })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div className="flex flex-col gap-2">
            <Eyebrow>Meal</Eyebrow>
            <Segmented label="Meal" size="sm" value={draft.meal} onChange={(meal) => set({ meal })} options={meals.map((m) => ({ value: m, label: m }))} />
          </div>
          <Field label="Tags" hint="Comma between each, like Italian, Quick.">
            <Input key={`${draft.id}-tags`} defaultValue={(draft.tags ?? []).join(", ")} onBlur={(e) => set({ tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
          </Field>
        </div>

        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <Eyebrow className="text-foreground">Ingredients</Eyebrow>
            <span className="text-xs text-muted-foreground">Keep the recipe's own wording. The pantry item is what stock is checked against.</span>
          </div>
          <div className="grid grid-cols-[1.4fr_1fr_64px_88px_28px] items-center gap-3 border-b border-primary pb-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            <span>Wording</span>
            <span>Pantry item</span>
            <span>Needs</span>
            <span>Part-used</span>
            <span />
          </div>
          {draft.ingredients.map((g, k) => (
            <div key={k} className="grid grid-cols-[1.4fr_1fr_64px_88px_28px] items-center gap-3 border-b border-border pb-2">
              <Input
                value={g.text}
                placeholder="200 g linguine"
                aria-label={`Ingredient ${k + 1} wording`}
                onChange={(e) => setIng(k, { text: e.target.value })}
                onBlur={() => {
                  // Link a clear match by itself, the way Claude does.
                  if (g.itemId || !g.text.trim()) return
                  const words = g.text.toLowerCase().replace(/[\d½¼¾×,]/g, " ").split(/\s+/).filter((w) => w.length > 2)
                  const hit = pantry.find((i) => words.some((w) => matchesName(i, w)))
                  if (hit) setIng(k, { itemId: hit.id })
                }}
              />
              <Select value={g.itemId || "none"} onValueChange={(v) => setIng(k, { itemId: v === "none" ? "" : v })}>
                <SelectTrigger className="w-full" aria-label={`Ingredient ${k + 1} pantry item`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not linked</SelectItem>
                  {pantry.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" min={1} value={g.need} aria-label={`Ingredient ${k + 1} count`} onChange={(e) => setIng(k, { need: Math.max(1, parseInt(e.target.value || "1", 10)) })} />
              <span className="flex justify-center"><Checkbox checked={!!g.partial} onCheckedChange={(c) => setIng(k, { partial: !!c })} aria-label={`Ingredient ${k + 1} uses part of a unit`} /></span>
              <Button variant="ghost" size="icon-xs" aria-label={`Remove ingredient ${k + 1}`} onClick={() => set({ ingredients: draft.ingredients.filter((_, j) => j !== k) })}>
                <XIcon />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="self-start" onClick={() => set({ ingredients: [...draft.ingredients, { text: "", itemId: "", need: 1, buy: 1 }] })}>
            <PlusIcon />
            Add ingredient
          </Button>
          <span className="text-xs text-muted-foreground">"Needs" is how many whole units it uses. Tick part-used for a clove of garlic or some milk: Cooked it then asks if you finished it.</span>
        </section>

        <Field label="Method" hint="One step per line.">
          <Textarea value={method} onChange={(e) => setMethod(e.target.value)} className="min-h-40 border border-border p-3" />
        </Field>
        <Field label="My notes">
          <Textarea value={draft.notes ?? ""} onChange={(e) => set({ notes: e.target.value || undefined })} className="min-h-16" />
        </Field>
        {tried && !ok && <p className="text-sm text-destructive">Add a name and at least one ingredient first.</p>}
      </div>
    </SidePanel>
  )
}
