// SET-01 (stores and aisles), SET-04 to SET-06 (categories), SET-02 (Claude connection), SET-03 (account).
import * as React from "react"
import { CheckIcon, CopyIcon, GripVerticalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  aisleKey, aisleLabel, aisleTitle, cap, categoriesAtoZ, DEFAULT_AISLES, hasTag, isToday, nameList, needOf, plural, shortDate, storeAisles, timeText, whenText,
  type AisleValue, type Category, type Store,
} from "../model"
import { href, navigate, type SettingsTab } from "../router"
import { usePantry } from "../state"
import { signOutOfSupabase } from "../../../shared/src/auth"
import { getTheme, setTheme, type ThemeChoice } from "../theme"
import { Eyebrow, Field, NavRow, PageTitle, Segmented } from "../components"
import { CategoryLookPicker } from "../category-look"

// ---------- SET-01 ----------
// Batch 4b (24 Nov 2026): aisles belong to stores and sit on each item, learned at tick-offs on the phone. A store
// has a number of aisles (the phone's tiles), named places walked after the numbers, and labels for its aisles.
// Category aisle numbers and "What it sells" are retired.

/** A named place in a store, draggable into walking order. */
function PlaceRow({ name, count, onRemove }: { name: string; count: number; onRemove: () => void }) {
  const sortable = useSortable({ id: name })
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }
  return (
    <div ref={sortable.setNodeRef} style={style} className={cn("flex h-11 items-center gap-3 border-b border-border bg-background pr-2", sortable.isDragging && "relative z-10 shadow-md")}>
      <button
        type="button"
        {...sortable.attributes}
        {...sortable.listeners}
        aria-label={`Drag to reorder ${name}`}
        className="flex h-full w-8 cursor-grab items-center justify-center text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <span className="flex-1 text-sm font-medium">{name}</span>
      <span className="w-16 text-right text-xs text-muted-foreground">{plural(count, "item")}</span>
      <Button variant="outline" size="icon-sm" className="text-destructive hover:text-destructive" aria-label={`Remove ${name}`} title={`Remove ${name}`} onClick={onRemove}>
        <Trash2Icon />
      </Button>
    </div>
  )
}

function StoresAndAisles({ initialStore }: { initialStore?: string }) {
  const { db, items, actions } = usePantry()
  const [selectedId, setSelectedId] = React.useState(initialStore ?? db.defaultStoreId)
  const [confirm, setConfirm] = React.useState(false)
  const [newPlace, setNewPlace] = React.useState("")
  const store = db.stores.find((s) => s.id === selectedId) ?? db.stores[0]
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const pantry = Object.values(items).filter((i) => !i.oneOff)

  if (!store) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">No stores yet. Add the shops you use. Their aisles fill in as you shop with the phone.</p>
        <Button onClick={() => setSelectedId(actions.addStore())}><PlusIcon />Add store</Button>
      </div>
    )
  }

  const save = (patch: Partial<Store>) => actions.saveStore({ ...store, ...patch })
  const aisles = storeAisles(store, pantry)
  const places = store.places ?? []
  const inPlace = (p: string) => pantry.filter((i) => typeof i.aisleAt?.[store.id] === "string" && (i.aisleAt[store.id] as string).toLowerCase() === p.toLowerCase()).length
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const from = places.indexOf(String(e.active.id))
    const to = places.indexOf(String(e.over.id))
    if (from >= 0 && to >= 0) save({ places: arrayMove(places, from, to) })
  }
  const addPlace = () => {
    const name = cap(newPlace.trim())
    if (!name) return
    if (places.some((p) => p.toLowerCase() === name.toLowerCase())) toast(`${store.name} already has ${name}`)
    else save({ places: [...places, name] })
    setNewPlace("")
  }
  const setLabel = (a: AisleValue, label: string) => {
    const key = aisleKey(a)
    if ((store.aisleLabels?.[key] ?? "") === label.trim()) return
    const labels = { ...(store.aisleLabels ?? {}) }
    if (label.trim()) labels[key] = label.trim()
    else delete labels[key]
    save({ aisleLabels: Object.keys(labels).length ? labels : undefined })
  }

  return (
    <div className="grid grid-cols-[320px_1fr] gap-10">
      <div className="flex flex-col gap-2">
        <Eyebrow>Stores · {db.stores.length}</Eyebrow>
        {db.stores.map((s) => {
          const on = s.id === store.id
          const n = storeAisles(s, pantry).length
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              onClick={() => setSelectedId(s.id)}
              className={cn("flex items-center justify-between gap-3 border px-4 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50", on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}
            >
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{s.name}</span>
                <span className={cn("text-xs", on ? "text-primary-foreground/70" : "text-muted-foreground")}>{[s.place, s.id === db.defaultStoreId ? "default" : null].filter(Boolean).join(" · ")}</span>
              </span>
              <span className={cn("shrink-0 text-xs", on ? "text-primary-foreground/70" : "text-muted-foreground")}>{s.noAisleNumbers ? "A to Z" : n ? `${plural(n, "aisle")} known` : "No aisles yet"}</span>
            </button>
          )
        })}
        <Button variant="outline" className="mt-2 border-primary" onClick={() => setSelectedId(actions.addStore())}>
          <PlusIcon />
          Add store
        </Button>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <div className="grid grid-cols-[1fr_1fr_200px] gap-5">
          <Field label="Store name">
            <Input key={`${store.id}-name`} defaultValue={store.name} onBlur={(e) => e.target.value.trim() && save({ name: e.target.value.trim() })} />
          </Field>
          <Field label="Where">
            <Input key={`${store.id}-place`} defaultValue={store.place ?? ""} placeholder="e.g. Church Street" onBlur={(e) => save({ place: e.target.value.trim() || undefined })} />
          </Field>
          <div className="flex flex-col gap-1">
            <Eyebrow>Default store</Eyebrow>
            <Segmented
              label="Default store"
              size="sm"
              value={store.id === db.defaultStoreId ? "yes" : "no"}
              onChange={(v) => v === "yes" && actions.setDefaultStore(store.id)}
              options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
            />
          </div>
        </div>

        <label className="-mt-1 flex items-center justify-between gap-6 border-y border-border py-3">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">This store has no aisle numbers</span>
            <span className="text-xs text-muted-foreground">
              {store.noAisleNumbers
                ? "Its shopping list goes A to Z, and the phone never asks which aisle something is in. Aisles already known are kept for if you turn this off."
                : "For a shop you don't walk in aisles, like a greengrocer or butcher."}
            </span>
          </span>
          <Switch checked={!!store.noAisleNumbers} aria-label="This store has no aisle numbers" onCheckedChange={(on) => save({ noAisleNumbers: on || undefined })} />
        </label>

        {!store.noAisleNumbers && (
          <>
            <div className="grid grid-cols-[200px_1fr] items-end gap-5">
              <Field label="Number of aisles">
                <Input
                  key={`${store.id}-count`}
                  type="number"
                  min={1}
                  max={200}
                  defaultValue={store.aisleCount ?? DEFAULT_AISLES}
                  onBlur={(e) => {
                    const n = Math.max(1, Math.min(200, parseInt(e.target.value, 10) || DEFAULT_AISLES))
                    save({ aisleCount: n === DEFAULT_AISLES ? undefined : n })
                  }}
                />
              </Field>
              <span className="pb-2 text-xs text-muted-foreground">The numbers the phone offers when it asks which aisle something is in. Higher ones can still be typed.</span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b border-primary pb-2">
                <Eyebrow className="text-foreground">Aisles · {aisles.length}</Eyebrow>
              </div>
              {aisles.length ? (
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={cn(head, "w-28 pl-2")}>Aisle</TableHead>
                      <TableHead className={cn(head, "w-64")}>Label</TableHead>
                      <TableHead className={head}>Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aisles.map((a) => (
                      <TableRow key={`${store.id}-${aisleKey(a.aisle)}`} className="align-top">
                        <TableCell className="pt-3 pl-2 font-semibold">{aisleTitle(a.aisle)}</TableCell>
                        <TableCell className="py-1.5">
                          <Input
                            key={`${store.id}-${aisleKey(a.aisle)}-${aisleLabel(store, a.aisle) ?? ""}`}
                            defaultValue={aisleLabel(store, a.aisle) ?? ""}
                            placeholder="e.g. Dairy and eggs"
                            aria-label={`Label for ${aisleTitle(a.aisle)}`}
                            className="h-8"
                            onBlur={(e) => setLabel(a.aisle, e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                          />
                        </TableCell>
                        <TableCell className="pt-3 whitespace-normal">
                          {a.items.map((i, k) => (
                            <React.Fragment key={i.id}>
                              {k > 0 && ", "}
                              <a href={href({ name: "pantry", item: i.id })} className="underline-offset-2 hover:underline">{i.name}</a>
                            </React.Fragment>
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-3 text-sm text-muted-foreground">None yet. When you tick something off on the phone here, it asks which aisle it was in, and the aisles fill in.</p>
              )}
              <span className="pt-2 text-xs text-muted-foreground">
                Labels show with the aisle on the shopping list. To move an item to another aisle, open it and change its aisle for {shortStore(store)}.
              </span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b border-primary pb-2">
                <Eyebrow className="text-foreground">Places · {places.length}</Eyebrow>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={places} strategy={verticalListSortingStrategy}>
                  {places.map((p) => (
                    <PlaceRow
                      key={`${store.id}-${p}`}
                      name={p}
                      count={inPlace(p)}
                      onRemove={() => {
                        actions.removePlace(store.id, p)
                      }}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <form className="flex items-center gap-3 pt-3" onSubmit={(e) => { e.preventDefault(); addPlace() }}>
                <Input value={newPlace} onChange={(e) => setNewPlace(e.target.value)} placeholder="A place, like Freezer or Tills" className="h-8 max-w-xs" aria-label="New place" />
                <Button type="submit" size="sm" variant="outline" disabled={!newPlace.trim()}><PlusIcon />Add place</Button>
              </form>
              <span className="pt-2 text-xs text-muted-foreground">
                Aisles with a name. They're walked after the numbered aisles, in this order. Drag to reorder. Removing one puts its items back under No aisle here.
              </span>
            </div>
          </>
        )}

        <div className="flex items-center justify-between border-t border-border pt-5">
          <span className="text-xs text-muted-foreground">The same stores the phone edits. Changes reach it by themselves.</span>
          <Button variant="destructive" disabled={db.stores.length <= 1} onClick={() => setConfirm(true)}>Delete store</Button>
        </div>
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="gap-5 p-8 sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[22px] tracking-[0.04em] uppercase">Delete {store.name}?</DialogTitle>
            <DialogDescription>Its aisles, places and labels go, and items lose their aisle there. Items and the shopping list stay as they are.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/80" onClick={() => { actions.deleteStore(store.id); setConfirm(false); setSelectedId(db.defaultStoreId) }}>Delete store</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- SET-04 to SET-06 ----------

/** A store's short name: "Sainsbury's" from "Sainsbury's, Stoke Newington". */
const shortStore = (s: Store) => s.name.split(",")[0].trim()

const head = "h-10 text-[10px] font-semibold tracking-widest"


function NameForm({ initial, placeholder, submit, onSubmit, onCancel }: { initial: string; placeholder?: string; submit: string; onSubmit: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = React.useState(initial)
  return (
    <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSubmit(name.trim()) }}>
      <Input
        autoFocus
        value={name}
        placeholder={placeholder}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        className="h-8 max-w-64 bg-background px-2"
        aria-label="Tag name"
      />
      <Button type="submit" size="sm" disabled={!name.trim()}>{submit}</Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
    </form>
  )
}

function RemoveCategory({ category, onClose }: { category: Category; onClose: () => void }) {
  const { items, actions } = usePantry()
  const tagged = Object.values(items).filter((i) => hasTag(i, category.id))
  const names = tagged.map((i) => i.name)
  const shown = names.length > 6 ? [...names.slice(0, 5), `${names.length - 5} more`] : names
  return (
    <DialogContent className="gap-5 p-8 sm:max-w-[520px]">
      <DialogHeader>
        <Eyebrow>Remove tag</Eyebrow>
        <DialogTitle className="text-[22px] tracking-[0.04em] uppercase">Remove {category.name}?</DialogTitle>
        <DialogDescription>
          {tagged.length ? (
            <>
              It comes off <strong className="font-semibold text-foreground">{plural(tagged.length, "item")}</strong>: {nameList(shown)}. They keep any other tags they have.
            </>
          ) : (
            <>No items have it.</>
          )}
        </DialogDescription>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">Aisles and recipes aren't changed. You can undo this from History today.</p>
      <DialogFooter className="sm:justify-between">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/80" onClick={() => { actions.removeCategory(category.id); onClose() }}>
          Remove tag
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

function Categories({ intro }: { intro: string }) {
  const { db, items, actions } = usePantry()
  const [adding, setAdding] = React.useState(false)
  const [renaming, setRenaming] = React.useState<string | null>(null)
  const [removing, setRemoving] = React.useState<Category | null>(null)
  const pantry = Object.values(items).filter((i) => !i.oneOff)
  const counts = (id: string) => {
    const mine = pantry.filter((i) => hasTag(i, id))
    // On the shopping list now, one-offs included.
    const onList = Object.values(items).filter((i) => hasTag(i, id) && needOf(i) > 0).length
    return { items: mine.length, onList }
  }

  return (
    <>
      <PageTitle title="Tags" subtitle={intro}>
        <Button variant="outline" className="border-primary" disabled={adding} onClick={() => { setAdding(true); setRenaming(null) }}>
          <PlusIcon />
          Add tag
        </Button>
      </PageTitle>

      <div className="flex max-w-5xl flex-col gap-3">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(head, "pl-3")}>Tag</TableHead>
              <TableHead className={cn(head, "text-right")}>In pantry</TableHead>
              <TableHead className={cn(head, "text-right")}>On list</TableHead>
              <TableHead className={cn(head, "text-right")}><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adding && (
              <TableRow className="h-13 bg-muted hover:bg-muted">
                <TableCell className="pl-3" colSpan={4}>
                  <NameForm
                    initial=""
                    placeholder="Tag name, like Snacks"
                    submit="Add"
                    onSubmit={(name) => { actions.addCategory(name); setAdding(false); toast(`Added ${name}`, { description: "Give it to items from their panel." }) }}
                    onCancel={() => setAdding(false)}
                  />
                </TableCell>
              </TableRow>
            )}
            {categoriesAtoZ(db.categories).map((c) => {
              const n = counts(c.id)
              const editing = renaming === c.id
              return (
                <TableRow key={c.id} className={cn("h-12", editing && "bg-muted hover:bg-muted")}>
                  <TableCell className="pl-3">
                    {editing ? (
                      <NameForm
                        initial={c.name}
                        submit="Save"
                        onSubmit={(name) => { if (name !== c.name) { actions.renameCategory(c.id, name); toast(`Renamed ${c.name} to ${name}`) } setRenaming(null) }}
                        onCancel={() => setRenaming(null)}
                      />
                    ) : (
                      <span className="flex items-center gap-3">
                        <CategoryLookPicker category={c} onChange={(look) => actions.setCategoryLook(c.id, look)} />
                        <span className="text-[15px] font-medium">{c.name}</span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{n.items}</TableCell>
                  <TableCell className="text-right tabular-nums">{n.onList}</TableCell>
                  <TableCell className="pr-3 text-right">
                    {!editing && (
                      <span className="inline-flex gap-1.5">
                        <Button variant="outline" size="icon-sm" aria-label={`Rename ${c.name}`} title={`Rename ${c.name}`} onClick={() => { setRenaming(c.id); setAdding(false) }}>
                          <PencilIcon />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          aria-label={`Remove ${c.name}`}
                          title={`Remove ${c.name}`}
                          onClick={() => setRemoving(c)}
                        >
                          <Trash2Icon />
                        </Button>
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <span className="text-xs text-muted-foreground">
          {plural(db.categories.length, "tag")}, {plural(pantry.length, "item")}.{" "}
          {renaming ? "Renaming changes the name everywhere: items and the shopping list. " : ""}
          Tags are labels for finding and filtering. An item can have several, or none. They don't set aisles: each store learns those. Changes reach the phone by themselves.
        </span>
      </div>

      <Dialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)}>
        {removing && <RemoveCategory category={removing} onClose={() => setRemoving(null)} />}
      </Dialog>
    </>
  )
}

// ---------- SET-02 ----------

/** The MCP server: a Supabase Edge Function (prototypes/claude-connection). */
const ADDRESS = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp`

type Grant = { clientId: string; name: string; grantedAt: string }

/**
 * Whether Claude is connected: the OAuth grants you've given in Supabase Auth (on the consent
 * page). Disconnecting revokes the grant, which signs Claude out straight away.
 */
function useClaudeGrants() {
  const [grants, setGrants] = React.useState<Grant[] | null | "error">(null)
  const load = React.useCallback(async () => {
    const { data, error } = await supabase.auth.oauth.listGrants()
    setGrants(error || !data ? "error" : data.map((g) => ({ clientId: g.client.id, name: g.client.name, grantedAt: g.granted_at })))
  }, [])
  React.useEffect(() => { void load() }, [load])
  const disconnect = async () => {
    if (!Array.isArray(grants)) return
    for (const g of grants) {
      const { error } = await supabase.auth.oauth.revokeGrant({ clientId: g.clientId })
      if (error) toast("Couldn't disconnect Claude", { description: error.message })
    }
    await load()
  }
  return { grants, disconnect }
}

function Permission({ title, sub, label }: { title: string; sub: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3">
      <span className="flex flex-col">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </span>
      <Eyebrow className="text-foreground">{label}</Eyebrow>
    </div>
  )
}

function ClaudeConnection() {
  const { db, actions } = usePantry()
  const { grants, disconnect } = useClaudeGrants()
  const [busy, setBusy] = React.useState(false)
  const recent = db.history.filter((h) => h.who === "claude").slice(0, 4)
  const lastUsed = recent[0]?.at
  const connected = Array.isArray(grants) ? grants.length > 0 : db.claudeConnected
  // Keep the saved flag in step, so "Add with Claude" knows too.
  React.useEffect(() => {
    if (Array.isArray(grants) && grants.length > 0 !== db.claudeConnected) actions.setClaudeConnected(grants.length > 0)
  }, [grants, db.claudeConnected, actions])
  const status = grants === null ? "Checking…"
    : grants === "error" ? "Couldn't check with Supabase. Sync, or sign in again, and come back."
      : connected ? (lastUsed ? `Last used ${whenText(lastUsed).toLowerCase()}` : `Connected ${shortDate(grants[0].grantedAt)} · not used yet`)
        : "Add the address below as a connector in Claude to connect."
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div className={cn("flex items-center justify-between gap-4 border p-5", connected ? "border-primary" : "border-dashed border-ring")}>
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2 text-sm font-semibold">{connected && <CheckIcon className="size-4" />}{connected ? "Connected" : "Not connected"}</span>
          <span className="text-xs text-muted-foreground">{status}</span>
        </span>
        {connected && Array.isArray(grants) && (
          <Button variant="outline" disabled={busy} onClick={async () => { setBusy(true); await disconnect(); setBusy(false) }}>Disconnect</Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Eyebrow>Connector address</Eyebrow>
        <div className="flex items-center gap-3">
          <code className="flex h-10 flex-1 items-center border border-border bg-muted px-3 text-sm">{ADDRESS}</code>
          <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(ADDRESS).catch(() => {}); toast("Copied the connector address") }}>
            <CopyIcon />
            Copy
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">Add this address as a connector in Claude, then sign in with your pantry account. Works from the Claude phone app, desktop and web.</span>
      </div>

      <div className="grid grid-cols-2 gap-10">
        <section className="flex flex-col">
          <Eyebrow className="pb-1 text-foreground">Claude can, without asking</Eyebrow>
          <Permission title="Read" sub="Pantry stock, the shopping list and your saved recipes, and search them" label="No need to ask" />
          <Permission title="Add" sub="Items, stock, shopping list entries and recipes" label="No need to ask" />
          <Permission title="Take off stock" sub={`When you tell it what you've used, like "I used the last of the rice"`} label="No need to ask" />
        </section>
        <section className="flex flex-col">
          <Eyebrow className="pb-1 text-foreground">Claude asks you first</Eyebrow>
          <Permission title="Edit" sub="Change an item, a minimum, a recipe or a list entry" label="Asks first" />
          <Permission title="Delete" sub="Remove anything" label="Asks first" />
          <span className="pt-2 text-xs text-muted-foreground">These are fixed rules, not settings. Claude asks in the chat, so nothing waits for approval here.</span>
        </section>
      </div>

      <section className="flex flex-col">
        <Eyebrow className="pb-1 text-foreground">Recent changes by Claude</Eyebrow>
        {recent.map((h) => (
          <div key={h.id} className="flex items-baseline justify-between gap-4 border-b border-border py-3 text-sm">
            <span className="flex flex-col">
              <span className="font-semibold">{h.title}</span>
              {h.detail && <span className="text-xs text-muted-foreground">{h.detail}</span>}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{whenText(h.at)}</span>
          </div>
        ))}
        <Button variant="link" className="h-auto self-start px-0 pt-3 text-xs" onClick={() => navigate({ name: "home" })}>See all in History</Button>
      </section>
    </div>
  )
}

// ---------- SET-03 ----------

// ---------- General ----------

function General() {
  const [theme, setThemeState] = React.useState<ThemeChoice>(getTheme)
  const chooseTheme = (t: ThemeChoice) => {
    setTheme(t)
    setThemeState(t)
  }
  const row = (title: string, sub: string, action: React.ReactNode) => (
    <div className="flex items-center justify-between gap-6 border-b border-border py-4">
      <span className="flex flex-col">
        <span className="text-sm font-semibold">{title}</span>
        <span className="max-w-md text-xs text-muted-foreground">{sub}</span>
      </span>
      {action}
    </div>
  )
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <section className="flex flex-col">
        <Eyebrow className="pb-1 text-foreground">Appearance</Eyebrow>
        {row(
          "Theme",
          "Auto follows this computer's light or dark setting. Only Collca on this computer changes; the shopping app follows its own device.",
          <Segmented
            label="Theme"
            className="w-60"
            value={theme}
            onChange={chooseTheme}
            options={[{ value: "auto", label: "Auto" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
          />,
        )}
      </section>
    </div>
  )
}

function Account() {
  const { db, items, actions, phoneSyncedAt } = usePantry()
  const [confirm, setConfirm] = React.useState(false)
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ items, recipes: db.recipes, stores: db.stores, aisles: db.categories, history: db.history }, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "pantry-export.json"
    a.click()
    URL.revokeObjectURL(url)
  }
  const row = (title: string, sub: string, action?: React.ReactNode) => (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3">
      <span className="flex flex-col">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </span>
      {action}
    </div>
  )
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <section className="flex flex-col">
        <Eyebrow className="pb-1 text-foreground">Sign-in</Eyebrow>
        {row("Email", db.email, <Button variant="link" size="xs" className="text-xs" onClick={() => toast("Not in the prototype")}>Change</Button>)}
        {row("Passkey", `This computer · added ${shortDate(new Date().toISOString())}`, <Button variant="link" size="xs" className="text-xs" onClick={() => toast("Not in the prototype")}>Remove</Button>)}
        {row("Sign-in link", "Sent to your email when you choose Continue")}
      </section>
      <section className="flex flex-col">
        <Eyebrow className="pb-1 text-foreground">Where you're signed in</Eyebrow>
        {row("This computer", `Collca on the web · syncs by itself${db.syncedAt ? ` · last synced ${isToday(db.syncedAt) ? "today" : shortDate(db.syncedAt)}, ${timeText(db.syncedAt)}` : ""}`)}
        {row("iPhone", `Shopping app · last synced ${isToday(phoneSyncedAt) ? "today" : shortDate(phoneSyncedAt)}, ${timeText(phoneSyncedAt)}`, <Button variant="link" size="xs" className="text-xs" onClick={() => toast("Not in the prototype")}>Sign out</Button>)}
        <Button variant="outline" className="mt-3 self-start" onClick={() => toast("Not in the prototype")}>Sign out everywhere</Button>
      </section>
      <section className="flex flex-col">
        <Eyebrow className="pb-1 text-foreground">Sharing</Eyebrow>
        {row("Share the pantry with someone", "Coming later. The pantry is private to you for now.", <Eyebrow>Later</Eyebrow>)}
      </section>
      <section className="flex flex-col">
        <Eyebrow className="pb-1 text-foreground">Your data</Eyebrow>
        {row("Export", "Pantry, shopping list and recipes as a file", <Button variant="outline" size="sm" onClick={exportData}>Export</Button>)}
        {row("Delete account", "Deletes everything. This can't be undone.", <Button variant="destructive" size="sm" onClick={() => setConfirm(true)}>Delete</Button>)}
      </section>
      <Button variant="outline" className="self-start" onClick={() => void signOutOfSupabase()}>Sign out</Button>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="gap-5 p-8 sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[22px] tracking-[0.04em] uppercase">Delete your account?</DialogTitle>
            <DialogDescription>Deletes the pantry, recipes, shopping list and history, on every device. This can't be undone. In the prototype it resets the demo data and signs you out.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/80" onClick={() => { actions.resetDemo(false); setConfirm(false) }}>Delete account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- shell ----------

const tabs: { tab: SettingsTab; title: string; sub: string; intro: string }[] = [
  { tab: "general", title: "General", sub: "Theme", intro: "Settings for this computer." },
  { tab: "stores", title: "Stores and aisles", sub: "Your shops, their aisles and places", intro: "Your shops and where they are. Each item has its own aisle in each shop, learned when you tick it off on your phone, so the shopping list follows your walk round the shop." },
  { tab: "tags", title: "Tags", sub: "Labels for finding and filtering", intro: "Labels such as Dairy or Breakfast. An item can have several, or none. Give items their tags from their panel." },
  { tab: "claude", title: "Claude connection", sub: "What Claude can read and change", intro: "Lets Claude use your pantry from the Claude phone app, desktop or web." },
  { tab: "account", title: "Account", sub: "Sign-in, devices and your data", intro: "One account for the pantry, your phone and Claude." },
]

export function Settings({ tab, store }: { tab: SettingsTab; store?: string }) {
  const current = tabs.find((t) => t.tab === tab)!
  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex w-64 shrink-0 flex-col gap-4 border-r border-border px-5 py-7">
        <h1 className="px-1 text-xl font-semibold tracking-[0.04em] uppercase">Settings</h1>
        <nav className="flex flex-col" aria-label="Settings">
          {tabs.map((t) => <NavRow key={t.tab} title={t.title} sub={t.sub} current={t.tab === tab} onClick={() => navigate({ name: "settings", tab: t.tab })} />)}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-7">
        {tab === "tags" ? (
          <Categories intro={current.intro} />
        ) : (
          <>
            <PageTitle title={current.title} subtitle={current.intro} />
            {tab === "general" ? <General /> : tab === "stores" ? <StoresAndAisles key={store} initialStore={store} /> : tab === "claude" ? <ClaudeConnection /> : <Account />}
          </>
        )}
      </div>
    </div>
  )
}
