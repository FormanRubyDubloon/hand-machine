// SET-01 (stores and aisles), SET-02 (Claude connection), SET-03 (account).
import * as React from "react"
import { CheckIcon, CopyIcon, GripVerticalIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { aisleOrder, isToday, numberedAisles, plural, shortDate, timeText, whenText, type Category, type Store } from "../model"
import { navigate, type SettingsTab } from "../router"
import { usePantry } from "../state"
import { Eyebrow, Field, NavRow, PageTitle, Segmented } from "../components"

// ---------- SET-01 ----------

function AisleRow({ category, store, count, onNumber, onRename }: { category: Category; store: Store; count: number; onNumber: (n: number | null) => void; onRename: (name: string) => void }) {
  const number = store.aisles[category.id]
  const sortable = useSortable({ id: category.id, disabled: number === null })
  const [renaming, setRenaming] = React.useState(false)
  const [name, setName] = React.useState(category.name)
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }
  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn("flex h-13 items-center gap-3 border-b border-border bg-background pr-2", sortable.isDragging && "relative z-10 shadow-md")}
    >
      <button
        type="button"
        {...sortable.attributes}
        {...sortable.listeners}
        disabled={number === null}
        aria-label={`Drag to reorder ${category.name}`}
        className="flex h-full w-8 cursor-grab items-center justify-center text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-30"
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <input
        type="number"
        min={1}
        value={number ?? ""}
        placeholder="–"
        aria-label={`Aisle number for ${category.name}`}
        onChange={(e) => onNumber(e.target.value ? Math.max(1, parseInt(e.target.value, 10)) : null)}
        className={cn(
          "h-9 w-11 border text-center text-sm font-semibold tabular-nums outline-none [appearance:textfield] focus:border-foreground [&::-webkit-inner-spin-button]:appearance-none",
          number === null ? "border-dashed border-ring" : "border-primary",
        )}
      />
      {renaming ? (
        <form className="flex flex-1 items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onRename(name.trim()); setRenaming(false) }}>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="h-8" aria-label="Aisle name" />
          <Button type="submit" size="icon-xs" variant="outline" aria-label="Save name"><CheckIcon /></Button>
        </form>
      ) : (
        <span className="flex-1 text-sm">{category.name}</span>
      )}
      <span className="w-16 text-right text-xs text-muted-foreground">{plural(count, "item")}</span>
      {!renaming && (
        <Button variant="link" size="xs" className="text-xs" onClick={() => { setName(category.name); setRenaming(true) }}>Rename</Button>
      )}
    </div>
  )
}

function StoresAndAisles() {
  const { db, items, actions } = usePantry()
  const [selectedId, setSelectedId] = React.useState(db.defaultStoreId)
  const [confirm, setConfirm] = React.useState(false)
  const [newAisle, setNewAisle] = React.useState<string | null>(null)
  const store = db.stores.find((s) => s.id === selectedId) ?? db.stores[0]
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const countOf = (id: string) => Object.values(items).filter((i) => !i.oneOff && i.categoryId === id).length

  if (!store) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">No stores yet. Add the shops you use, and the aisles in the order you walk them.</p>
        <Button onClick={() => setSelectedId(actions.addStore())}><PlusIcon />Add store</Button>
      </div>
    )
  }

  const ordered = aisleOrder(store, db.categories)
  const numbered = ordered.filter((c) => store.aisles[c.id] !== null)
  const save = (patch: Partial<Store>) => actions.saveStore({ ...store, ...patch })
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const from = numbered.findIndex((c) => c.id === e.active.id)
    const to = numbered.findIndex((c) => c.id === e.over!.id)
    if (from < 0 || to < 0) return
    // Keep the store's real aisle numbers; just hand them out in the new order.
    const numbers = numbered.map((c) => store.aisles[c.id]!).sort((a, b) => a - b)
    const moved = arrayMove(numbered, from, to)
    save({ aisles: { ...store.aisles, ...Object.fromEntries(moved.map((c, k) => [c.id, numbers[k]])) } })
  }

  return (
    <div className="grid grid-cols-[320px_1fr] gap-10">
      <div className="flex flex-col gap-2">
        <Eyebrow>Stores · {db.stores.length}</Eyebrow>
        {db.stores.map((s) => {
          const on = s.id === store.id
          const n = numberedAisles(s)
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
                <span className={cn("text-xs", on ? "text-primary-foreground/70" : "text-muted-foreground")}>{[s.kind || s.place, s.id === db.defaultStoreId ? "default" : null].filter(Boolean).join(" · ")}</span>
              </span>
              <span className={cn("shrink-0 text-xs", on ? "text-primary-foreground/70" : "text-muted-foreground")}>{n > 1 ? plural(n, "aisle") : "No aisles"}</span>
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
            <Input key={`${store.id}-place`} defaultValue={store.place ?? ""} placeholder="Church Street" onBlur={(e) => save({ place: e.target.value.trim() || undefined })} />
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

        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-primary pb-2">
            <Eyebrow className="text-foreground">Aisles in walking order</Eyebrow>
            <Button variant="outline" size="sm" onClick={() => setNewAisle("")}><PlusIcon />Add aisle</Button>
          </div>
          {newAisle !== null && (
            <form
              className="flex items-center gap-3 border-b border-border bg-muted px-3 py-2"
              onSubmit={(e) => { e.preventDefault(); if (newAisle.trim()) actions.addCategory(store.id, newAisle.trim()); setNewAisle(null) }}
            >
              <Input autoFocus value={newAisle} onChange={(e) => setNewAisle(e.target.value)} placeholder="Aisle name, like Snacks" className="h-8 bg-background px-2" aria-label="New aisle name" />
              <Button type="submit" size="sm">Add</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setNewAisle(null)}>Cancel</Button>
            </form>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={numbered.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {ordered.map((c) => (
                <AisleRow
                  key={`${store.id}-${c.id}`}
                  category={c}
                  store={store}
                  count={countOf(c.id)}
                  onNumber={(n) => save({ aisles: { ...store.aisles, [c.id]: n } })}
                  onRename={(name) => actions.renameCategory(c.id, name)}
                />
              ))}
            </SortableContext>
          </DndContext>
          <span className="pt-2 text-xs text-muted-foreground">
            Drag to reorder. Aisles with no number aren't in this store and go at the end of the list. Two aisles with the same number are walked together. Aisle names are shared by every store.
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-5">
          <span className="text-xs text-muted-foreground">The same stores and aisles the phone edits. Changes here reach it at its next sync.</span>
          <Button variant="destructive" disabled={db.stores.length <= 1} onClick={() => setConfirm(true)}>Delete store</Button>
        </div>
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="gap-5 p-8 sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[22px] tracking-[0.04em] uppercase">Delete {store.name}?</DialogTitle>
            <DialogDescription>Its aisle order goes. Items and the shopping list stay as they are.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button className="bg-destructive text-white hover:bg-destructive/80" onClick={() => { actions.deleteStore(store.id); setConfirm(false); setSelectedId(db.defaultStoreId) }}>Delete store</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- SET-02 ----------

const ADDRESS = "https://pantry.example.com/mcp"

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
  const recent = db.history.filter((h) => h.who === "claude").slice(0, 4)
  const lastUsed = recent[0]?.at
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div className={cn("flex items-center justify-between gap-4 border p-5", db.claudeConnected ? "border-primary" : "border-dashed border-ring")}>
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2 text-sm font-semibold">{db.claudeConnected && <CheckIcon className="size-4" />}{db.claudeConnected ? "Connected" : "Not connected"}</span>
          <span className="text-xs text-muted-foreground">{db.claudeConnected ? (lastUsed ? `Last used ${whenText(lastUsed).toLowerCase()}` : "Not used yet") : "Add the address below in Claude to connect."}</span>
        </span>
        <Button variant="outline" onClick={() => actions.setClaudeConnected(!db.claudeConnected)}>{db.claudeConnected ? "Disconnect" : "Connect"}</Button>
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
        {row("This computer", "Pantry app · now")}
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
      <Button variant="outline" className="self-start" onClick={actions.signOut}>Sign out</Button>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="gap-5 p-8 sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[22px] tracking-[0.04em] uppercase">Delete your account?</DialogTitle>
            <DialogDescription>Deletes the pantry, recipes, shopping list and history, on every device. This can't be undone. In the prototype it resets the demo data and signs you out.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button className="bg-destructive text-white hover:bg-destructive/80" onClick={() => { actions.resetDemo(false); setConfirm(false) }}>Delete account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- shell ----------

const tabs: { tab: SettingsTab; title: string; sub: string; intro: string }[] = [
  { tab: "stores", title: "Stores and aisles", sub: "Aisle order for each shop", intro: "The aisle order sets the order of the shopping list in each shop. You can change it here or in the shopping app." },
  { tab: "claude", title: "Claude connection", sub: "What Claude can read and change", intro: "Lets Claude use your pantry from the Claude phone app, desktop or web." },
  { tab: "account", title: "Account", sub: "Sign-in, devices and your data", intro: "One account for the pantry, kitchen and shopping apps." },
]

export function Settings({ tab }: { tab: SettingsTab }) {
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
        <PageTitle title={current.title} subtitle={current.intro} />
        {tab === "stores" ? <StoresAndAisles /> : tab === "claude" ? <ClaudeConnection /> : <Account />}
      </div>
    </div>
  )
}
