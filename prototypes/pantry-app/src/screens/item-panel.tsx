// PAN-11 (counted), PAN-16 (bulk) and PAN-12 (add item): one side panel. Everything is a draft
// until Save. PAN-17 (merge) and PAN-18 (delete) open over it.
import * as React from "react"
import { ArrowLeftRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  cap, dateText, entryTotal, haveText, inDaysText, isBulk, isStaple, locationLabel, locations, money, nameList, needOf, normalise,
  perUnitDates, plural, recipesUsing, shortDate, shortfall, stockOf, stockSentence, todayIso, unitText, type Item,
} from "../model"
import { navigate } from "../router"
import { usePantry } from "../state"
import { Eyebrow, Field, HistoryRow, NewPill, Segmented, SidePanel, Stepper, StockPill, TagPill, UnitRow } from "../components"

/** "bag" → "bags", "loaf" → "loaves", "box" → "boxes". */
export function pluralise(word: string) {
  if (!word) return word
  if (/(s|x|ch|sh)$/.test(word)) return `${word}es`
  if (/f$/.test(word)) return word.replace(/f$/, "ves")
  if (/[^aeiou]y$/.test(word)) return word.replace(/y$/, "ies")
  return `${word}s`
}

export function blankItem(name = ""): Item {
  return { id: `item-${Date.now().toString(36)}`, name, type: "counted", target: 0, inStock: 1, categoryId: "", where: [], useBy: [null] }
}

const penceText = (p?: number) => (p ? (p / 100).toFixed(2) : "")

function DateInput({ value, onChange, label }: { value: string | null; onChange: (v: string | null) => void; label: string }) {
  return (
    <input
      type="date"
      aria-label={label}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="h-7 border-b border-transparent bg-transparent text-sm font-semibold outline-none hover:border-ring focus:border-foreground"
    />
  )
}

/** Units (counted) or packs (bulk), each with a use-by date when you keep more than one. */
function Slots({ draft, setDraft }: { draft: Item; setDraft: (i: Item) => void }) {
  const bulk = isBulk(draft)
  const word = cap(draft.unit?.[0] ?? (bulk ? "Pack" : "Unit"))
  const perUnit = perUnitDates(draft)
  const slots = Math.max(draft.inStock, draft.target, bulk || perUnit ? 0 : 1)
  const dates = draft.useBy ?? []
  const setDate = (index: number, v: string | null) => {
    const next = [...dates]
    next[index] = v
    setDraft({ ...draft, useBy: next })
  }
  const remove = (index: number) => {
    const next = [...dates]
    next.splice(index, 1)
    const open = bulk && index < (draft.open ?? 0) ? (draft.open ?? 0) - 1 : draft.open
    const opened = bulk && index < (draft.open ?? 0) ? (draft.openedAt ?? []).filter((_, k) => k !== index) : draft.openedAt
    setDraft(normalise({ ...draft, inStock: draft.inStock - 1, useBy: next, open, openedAt: opened }))
  }
  const add = () => setDraft(normalise({ ...draft, inStock: draft.inStock + 1, useBy: [...dates, null] }))
  const openIt = (index: number) => {
    // Open packs come first. Move this one to the front of the full ones.
    const o = draft.open ?? 0
    const next = [...dates]
    const [d] = next.splice(index, 1)
    next.splice(o, 0, d)
    setDraft(normalise({ ...draft, useBy: next, open: o + 1, openedAt: [...(draft.openedAt ?? []), todayIso()] }))
  }

  if (draft.noExpiry && !bulk) {
    return <p className="text-sm text-muted-foreground">Doesn't expire, so no use-by dates are kept.</p>
  }
  if (!bulk && !perUnit) {
    return (
      <div className="flex flex-col">
        <UnitRow
          label="All"
          title={draft.inStock ? <span className="flex items-center gap-2">Use by <DateInput label="Use by" value={dates[0] ?? null} onChange={(v) => setDate(0, v)} /></span> : "None in stock"}
          aside={inDaysText(dates[0])}
          empty={!draft.inStock}
        />
        <p className="pt-2 text-xs text-muted-foreground">You keep 1 or fewer, so the item has one use-by date.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col">
      {Array.from({ length: slots }, (_, k) => {
        if (k >= draft.inStock)
          return (
            <UnitRow
              key={k}
              empty
              label={`${word} ${k + 1}`}
              title="Empty slot"
              sub="Not bought yet"
              action={<Button size="xs" variant="outline" className="h-8 border-primary" onClick={add}>Bought one</Button>}
            />
          )
        const isOpen = bulk && k < (draft.open ?? 0)
        const dateEl = draft.noExpiry ? <span className="font-normal text-muted-foreground">No expiry</span> : perUnit || k === 0 ? <DateInput label={`Use by, ${word.toLowerCase()} ${k + 1}`} value={dates[k] ?? null} onChange={(v) => setDate(k, v)} /> : <span className="font-normal text-muted-foreground">{dateText(dates[0])}</span>
        return (
          <UnitRow
            key={k}
            label={`${word} ${k + 1}`}
            title={<span className="flex items-center gap-2">{bulk ? (isOpen ? "Open · use by" : "Full · use by") : "Use by"} {dateEl}</span>}
            sub={isOpen && draft.openedAt?.[k] ? `Opened ${shortDate(draft.openedAt[k]!)}` : undefined}
            aside={!bulk ? inDaysText(dates[k]) : undefined}
            action={
              bulk && !isOpen ? (
                <Button size="xs" variant="outline" className="h-8 border-primary" onClick={() => openIt(k)}>Open it</Button>
              ) : (
                <Button size="xs" variant="outline" className="h-8 border-primary" onClick={() => remove(k)}>{bulk ? "Finished it" : "Used it"}</Button>
              )
            }
          />
        )
      })}
      {slots === 0 && <p className="text-sm text-muted-foreground">None in stock.</p>}
      <p className="pt-2 text-xs text-muted-foreground">
        {bulk ? "The app tracks whole packs. It doesn't measure what's left in an open one." : "You keep more than one, so each unit has its own date."}
      </p>
    </div>
  )
}

/** The line at the bottom of Add item: whether it's a Staple and whether it goes on the list. */
function Summary({ draft }: { draft: Item }) {
  const s = stockOf(draft)
  const need = shortfall(draft)
  return (
    <div className="flex items-center gap-3 border border-border bg-muted px-4 py-3 text-sm">
      {s && <StockPill item={draft} />}
      <span>
        {isStaple(draft)
          ? <>A Staple. You have {haveText(draft)} and keep {draft.target}, so {need ? <strong>{need} {need === 1 ? "goes" : "go"} on the shopping list</strong> : "nothing goes on the shopping list"}.</>
          : <>Not a Staple: a minimum of 0. It only goes on the list when you or a recipe adds it.</>}
      </span>
    </div>
  )
}

export function ItemPanel({ id, prefill, onClose }: { id?: string; prefill?: string; onClose: () => void }) {
  const { items, db, actions } = usePantry()
  const isNew = id === "new"
  const saved = id && !isNew ? items[id] : undefined
  const open = isNew || !!saved
  const [draft, setDraft] = React.useState<Item>(() => saved ?? blankItem(prefill))
  const [merge, setMerge] = React.useState(false)
  const [remove, setRemove] = React.useState(false)
  const [tried, setTried] = React.useState(false)

  // A different item (or a fresh Add) resets the draft.
  const key = `${id}:${prefill ?? ""}`
  const [lastKey, setLastKey] = React.useState(key)
  if (key !== lastKey) {
    setLastKey(key)
    setDraft(saved ?? blankItem(prefill))
    setTried(false)
  }

  const set = (patch: Partial<Item>) => setDraft((d) => normalise({ ...d, ...patch }))
  const problems = [!draft.name.trim() && "a name", !draft.location && "a location", !draft.categoryId && "a shop or aisle"].filter(Boolean) as string[]
  const save = (again = false) => {
    setTried(true)
    if (problems.length) return
    actions.saveItem(normalise({ ...draft, name: draft.name.trim() }), isNew)
    if (again) {
      setDraft(blankItem())
      setTried(false)
    } else onClose()
  }

  const usedIn = saved ? recipesUsing(db.recipes, saved.id) : []
  const history = saved ? db.history.filter((h) => h.itemIds?.includes(saved.id)).slice(0, 5) : []
  const bulk = isBulk(draft)
  const category = db.categories.find((c) => c.id === draft.categoryId)?.name

  return (
    <>
      <SidePanel
        open={open}
        onClose={onClose}
        width={560}
        eyebrow={isNew ? "New item" : [locationLabel(draft.location), category].filter(Boolean).join(" · ")}
        title={isNew ? "Add item" : saved?.name}
        badges={!isNew && saved && <>{<StockPill item={saved} />}{isStaple(saved) && <TagPill>Staple</TagPill>}{saved.review && <NewPill tip="Added from a recipe and not bought yet." />}</>}
        description={!isNew && saved ? stockSentence(draft) : undefined}
        footer={
          isNew ? (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <span className="flex-1" />
              <Button variant="outline" className="border-primary" onClick={() => save(true)}>Add and start another</Button>
              <Button onClick={() => save()}>Add item</Button>
            </>
          ) : (
            <>
              <Button variant="destructive" onClick={() => setRemove(true)}>Delete</Button>
              <Button variant="outline" onClick={() => setMerge(true)}>Merge</Button>
              <span className="flex-1" />
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => save()}>Save</Button>
            </>
          )
        }
      >
        <div className="flex flex-col gap-7">
          <Field label="Name">
            <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Oat milk" aria-invalid={tried && !draft.name.trim()} autoFocus={isNew} />
          </Field>

          <div className="flex flex-col gap-2">
            <Eyebrow>Type</Eyebrow>
            <Segmented
              label="Type"
              value={draft.type}
              onChange={(type) => set({ type, open: type === "bulk" ? draft.open ?? 0 : undefined, unit: draft.unit ?? (type === "bulk" ? ["bag", "bags"] : undefined) })}
              options={[{ value: "counted", label: "Counted" }, { value: "bulk", label: "Bulk" }]}
            />
            {isNew && <span className="text-xs text-muted-foreground">Counted: tracked by number, like eggs or tins. Bulk: tracked as whole packs, like flour or oil.</span>}
          </div>

          <div className="grid grid-cols-3 gap-5">
            <div className="flex flex-col gap-1">
              <Eyebrow>{bulk ? "Packs" : isNew ? "How many you have" : "How many"}</Eyebrow>
              <Stepper
                size="md"
                label="How many"
                value={draft.inStock}
                onChange={(n) => set({ inStock: n, useBy: n > draft.inStock ? [...(draft.useBy ?? []), null] : (draft.useBy ?? []).slice(0, n) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Eyebrow>Minimum to keep</Eyebrow>
              <Stepper size="md" label="Minimum to keep" value={draft.target} onChange={(n) => set({ target: n })} />
            </div>
            <Field label="Unit">
              <Input
                value={draft.unit?.[0] ?? ""}
                placeholder={bulk ? "bag" : "carton"}
                onChange={(e) => set({ unit: e.target.value ? [e.target.value, pluralise(e.target.value)] : undefined })}
              />
            </Field>
          </div>
          {isNew && <p className="-mt-4 text-xs text-muted-foreground">A minimum above 0 makes this a Staple. Leave it at 0 for things you only buy for a recipe.</p>}

          {bulk && (
            <div className="grid grid-cols-3 gap-5">
              <Field label="Pack size">
                <Input
                  type="number"
                  min={0}
                  value={draft.packSize?.amount ?? ""}
                  placeholder="1000"
                  onChange={(e) => set({ packSize: e.target.value ? { amount: parseInt(e.target.value, 10), measure: draft.packSize?.measure ?? "g" } : undefined })}
                />
              </Field>
              <div className="col-span-2 flex flex-col gap-1">
                <Eyebrow>Measured in</Eyebrow>
                <Segmented
                  label="Measured in"
                  size="sm"
                  value={draft.packSize?.measure ?? "g"}
                  onChange={(measure) => set({ packSize: { amount: draft.packSize?.amount ?? 0, measure } })}
                  options={[{ value: "g", label: "Grams" }, { value: "ml", label: "Millilitres" }]}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Eyebrow className={cn(tried && !draft.location && "text-destructive")}>Location</Eyebrow>
            <Segmented label="Location" value={draft.location} onChange={(location) => set(location === "household" && draft.noExpiry === undefined ? { location, noExpiry: true } : { location })} options={locations} />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Field label="Shop or aisle">
              <Select value={draft.categoryId || undefined} onValueChange={(categoryId) => set({ categoryId })}>
                <SelectTrigger className="w-full" aria-invalid={tried && !draft.categoryId}>
                  <SelectValue placeholder="Choose an aisle" />
                </SelectTrigger>
                <SelectContent>
                  {db.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Price each">
              <Input
                inputMode="decimal"
                placeholder="£0.00"
                defaultValue={penceText(draft.price)}
                key={`${draft.id}-price`}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value.replace(/[£,]/g, ""))
                  set({ price: Number.isFinite(v) ? Math.round(v * 100) : undefined })
                }}
              />
            </Field>
            <Field label="Preferred brand" hint="Shows here and nowhere in the shopping app.">
              <Input value={draft.brand ?? ""} placeholder="Any" onChange={(e) => set({ brand: e.target.value || undefined })} />
            </Field>
            <Field label="Other names" hint="Used to match recipes and in search.">
              <Input
                key={`${draft.id}-names`}
                defaultValue={(draft.otherNames ?? []).join(", ")}
                placeholder="Used to match recipes"
                onBlur={(e) => set({ otherNames: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              />
            </Field>
          </div>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <Eyebrow>{draft.noExpiry ? (bulk ? "Packs" : "Units") : bulk ? "Packs and use-by dates" : "Units and use-by dates"}</Eyebrow>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Doesn't expire
                <Switch size="sm" checked={!!draft.noExpiry} onCheckedChange={(on) => set({ noExpiry: on || undefined })} aria-label="Doesn't expire" />
              </label>
            </div>
            <Slots draft={draft} setDraft={setDraft} />
          </section>

          {!isNew && (
            <section className="flex flex-col gap-1.5">
              <Eyebrow>{usedIn.length ? `Used in ${plural(usedIn.length, "recipe")}` : "Recipes"}</Eyebrow>
              <p className="text-sm">
                {usedIn.length
                  ? usedIn.map((r, k) => (
                      <React.Fragment key={r.id}>
                        {k > 0 && " · "}
                        <a className="underline underline-offset-4" href={`#/recipes/cook/${r.id}`}>{r.name}</a>
                      </React.Fragment>
                    ))
                  : "Not in any recipe yet."}
              </p>
            </section>
          )}

          <Field label="Notes">
            <Textarea value={draft.notes ?? ""} placeholder="Optional" onChange={(e) => set({ notes: e.target.value || undefined })} className="min-h-16" />
          </Field>

          {history.length > 0 && (
            <section className="flex flex-col">
              <Eyebrow className="pb-1">History</Eyebrow>
              {history.map((h) => <HistoryRow key={h.id} entry={h} compact />)}
            </section>
          )}

          {isNew && <Summary draft={draft} />}
          {tried && problems.length > 0 && <p className="text-sm text-destructive">Add {nameList(problems)} first.</p>}
        </div>
      </SidePanel>
      {saved && (
        <>
          <MergeDialog open={merge} onOpenChange={setMerge} keepId={saved.id} onDone={onClose} />
          <DeleteDialog open={remove} onOpenChange={setRemove} item={saved} onMerge={() => { setRemove(false); setMerge(true) }} onDone={onClose} />
        </>
      )}
    </>
  )
}

// ---------- PAN-17 merge ----------

export function MergeDialog({ open, onOpenChange, keepId, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; keepId: string; onDone: () => void }) {
  const { items, db, actions, state } = usePantry()
  const others = Object.values(items).filter((i) => !i.oneOff && i.id !== keepId).sort((a, b) => a.name.localeCompare(b.name))
  // Suggest an item with a similar name: "Milk" for "Whole milk".
  const suggested = others.find((o) => items[keepId] && (items[keepId].name.toLowerCase().includes(o.name.toLowerCase()) || o.name.toLowerCase().includes(items[keepId].name.toLowerCase())))
  const [pair, setPair] = React.useState<{ keep: string; gone: string | undefined }>({ keep: keepId, gone: suggested?.id })
  const [lastKeep, setLastKeep] = React.useState(keepId)
  if (keepId !== lastKeep) {
    setLastKeep(keepId)
    setPair({ keep: keepId, gone: suggested?.id })
  }
  const keep = items[pair.keep]
  const gone = pair.gone ? items[pair.gone] : undefined
  if (!keep) return null

  const recipesOf = (i: Item) => recipesUsing(db.recipes, i.id)
  const created = gone && state.db.history.find((h) => h.itemIds?.includes(gone.id) && h.who === "claude")
  const row = (label: string, a: React.ReactNode, b: React.ReactNode, after: React.ReactNode, note?: string) => (
    <div className="grid grid-cols-[140px_1fr_1fr_1.2fr] gap-4 border-b border-border py-3 text-sm">
      <Eyebrow className="pt-0.5">{label}</Eyebrow>
      <span>{a}</span>
      <span className="text-muted-foreground">{b}</span>
      <span className="flex flex-col"><strong className="font-semibold">{after}</strong>{note && <span className="text-xs text-muted-foreground">{note}</span>}</span>
    </div>
  )
  const stock = (i?: Item) => (i ? (i.inStock ? haveText(i) : "0") : "–")
  const dates = (i?: Item) => (i?.useBy ?? []).filter(Boolean).map((d) => dateText(d)).join(", ") || "–"
  const merged = gone && normalise({ ...keep, inStock: keep.inStock + gone.inStock, open: isBulk(keep) ? (keep.open ?? 0) + (gone.open ?? 0) : undefined, useBy: [...(keep.useBy ?? []), ...(gone.useBy ?? [])].sort((x, y) => (x ?? "9").localeCompare(y ?? "9")) })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-6 p-8 sm:max-w-[920px]">
        <DialogHeader>
          <Eyebrow>Merge two items</Eyebrow>
          <DialogTitle className="text-[22px] tracking-[0.04em] uppercase">{gone ? `Merge ${gone.name} into ${keep.name}` : `Merge into ${keep.name}`}</DialogTitle>
          <DialogDescription className="sr-only">Pick the item to keep and the one to merge in.</DialogDescription>
        </DialogHeader>
        <div className="flex items-end gap-4">
          <Field label="Keep" className="flex-1">
            <Input value={keep.name} readOnly />
          </Field>
          <Button variant="outline" size="icon" aria-label="Swap sides" title="Swap sides" disabled={!gone} onClick={() => gone && setPair({ keep: gone.id, gone: keep.id })}>
            <ArrowLeftRightIcon />
          </Button>
          <Field label="Merge in" className="flex-1">
            <Select value={pair.gone} onValueChange={(v) => setPair({ ...pair, gone: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Choose an item" /></SelectTrigger>
              <SelectContent>
                {others.filter((o) => o.id !== pair.keep).map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        {gone && created && <p className="-mt-2 text-[13px] text-muted-foreground">{gone.name}: {created.title.toLowerCase().startsWith("saved") ? `created by Claude (${created.title.replace(/^Saved /, "")})` : created.title}. Swap the sides to keep {gone.name} instead.</p>}
        {gone && merged && (
          <div className="flex flex-col">
            <div className="grid grid-cols-[140px_1fr_1fr_1.2fr] gap-4 border-b border-primary pb-2 text-[10px] font-semibold tracking-widest uppercase">
              <span />
              <span>{keep.name}</span>
              <span className="text-muted-foreground">{gone.name}</span>
              <span>After merging</span>
            </div>
            {row("Stock", stock(keep), stock(gone), stock(merged), "Stock is added together")}
            {row("Minimum", `${keep.target}${isStaple(keep) ? " · Staple" : ""}`, gone.target, `${Math.max(keep.target, gone.target)}${Math.max(keep.target, gone.target) > 0 ? " · Staple" : ""}`, "The higher minimum is kept")}
            {row("Use-by dates", dates(keep), dates(gone), dates(merged))}
            {row("Other names", (keep.otherNames ?? []).join(", ") || "–", (gone.otherNames ?? []).join(", ") || "–", [...new Set([...(keep.otherNames ?? []), gone.name, ...(gone.otherNames ?? [])])].join(", "), `So recipes that say ${gone.name.toLowerCase()} match it`)}
            {row("Recipes", recipesOf(keep).length, recipesOf(gone).length ? `${recipesOf(gone).length} · ${recipesOf(gone).map((r) => r.name).join(", ")}` : 0, plural(new Set([...recipesOf(keep), ...recipesOf(gone)].map((r) => r.id)).size, "recipe"), recipesOf(gone).length ? `${nameList(recipesOf(gone).map((r) => r.name))} now ${recipesOf(gone).length === 1 ? "links" : "link"} to ${keep.name}` : undefined)}
            {row("Shop, price, brand", [db.categories.find((c) => c.id === keep.categoryId)?.name, keep.price && money(keep.price), keep.brand].filter(Boolean).join(" · ") || "–", [db.categories.find((c) => c.id === gone.categoryId)?.name, gone.price && money(gone.price), gone.brand].filter(Boolean).join(" · ") || "–", `Kept from ${keep.name}`)}
            {(entryTotal(keep) > 0 || entryTotal(gone) > 0) && row("Shopping list", needOf(keep) || "–", needOf(gone) || "–", "Both list entries are kept")}
          </div>
        )}
        <p className="text-[13px] text-muted-foreground">{gone ? `${gone.name} is removed. ` : ""}You can undo this from History today.</p>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!gone}
            onClick={() => {
              if (!gone) return
              actions.mergeItems(keep.id, gone.id)
              onOpenChange(false)
              onDone()
              navigate({ name: "pantry", item: keep.id })
            }}
          >
            Merge into {keep.name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- PAN-18 delete ----------

export function DeleteDialog({ open, onOpenChange, item, onMerge, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; item: Item; onMerge: () => void; onDone: () => void }) {
  const { db, actions } = usePantry()
  const used = recipesUsing(db.recipes, item.id)
  const example = used[0]?.ingredients.find((g) => g.itemId === item.id)?.text
  const onList = needOf(item)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 p-8 sm:max-w-[560px]">
        <DialogHeader>
          <Eyebrow>Delete item</Eyebrow>
          <DialogTitle className="text-[22px] tracking-[0.04em] uppercase">Delete {item.name}?</DialogTitle>
          <DialogDescription className="sr-only">What happens if you delete it.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-sm leading-relaxed">
          {used.length > 0 ? (
            <p>
              {item.name} is used in {plural(used.length, "recipe")}:{" "}
              {used.map((r, k) => (
                <React.Fragment key={r.id}>
                  {k > 0 && (k === used.length - 1 ? " and " : ", ")}
                  <a className="underline underline-offset-4" href={`#/recipes/cook/${r.id}`}>{r.name}</a>
                </React.Fragment>
              ))}
              . If you delete it, those recipes keep their wording{example ? `, such as "${example}",` : ""} but lose the link. They won't be able to check your stock for it, and Want to cook won't add it to the list.
            </p>
          ) : (
            <p>{item.name} isn't used in any recipe.</p>
          )}
          {onList > 0 && <p>It's also on your shopping list ({unitText(item, onList)} to buy). It comes off the list.</p>}
        </div>
        <div className="flex items-center justify-between gap-4 border border-border bg-muted p-4">
          <span className="text-sm">Is it a duplicate of another item? Merge it instead, and the recipe links move across.</span>
          <Button variant="outline" className="shrink-0 border-primary bg-background" onClick={onMerge}>Merge instead</Button>
        </div>
        <p className="text-[13px] text-muted-foreground">You can undo this from History today.</p>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
            onClick={() => {
              actions.deleteItem(item.id)
              onOpenChange(false)
              onDone()
            }}
          >
            Delete item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
