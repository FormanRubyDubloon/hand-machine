import * as React from "react"
import { ArrowLeftIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CountBox } from "@/components/ui/count-box"
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Keypad, type KeypadKey } from "@/components/ui/keypad"
import { Label } from "@/components/ui/label"
import { ListRow, ListRowText } from "@/components/ui/list-row"
import type { Store } from "../model"
import { goBack, Redirect } from "../router"
import { useApp } from "../state"
import { Eyebrow, HeaderButton, Note, Screen } from "../layout"

export function EditStore({ id }: { id: string | null }) {
  const { state } = useApp()
  const existing = id ? state.stores.find((s) => s.id === id) : null
  if (id && !existing) return <Redirect to={{ name: "stores" }} />
  // Key on the id so the form resets when you switch stores.
  return <EditStoreForm key={id ?? "new"} existing={existing ?? null} />
}

function EditStoreForm({ existing }: { existing: Store | null }) {
  const { state, actions } = useApp()
  const [name, setName] = React.useState(existing?.name ?? "")
  const [aisles, setAisles] = React.useState<Record<string, number | null>>(
    () => existing?.aisles ?? Object.fromEntries(state.categories.map((c) => [c.id, null]))
  )
  const [editing, setEditingState] = React.useState<string | null>(null)
  // The first key after opening replaces the number, like a selected field.
  const fresh = React.useRef(true)
  const setEditing = (id: string | null) => {
    fresh.current = true
    setEditingState(id)
  }
  // Keep the row you're editing above the keypad.
  const rows = React.useRef(new Map<string, HTMLElement>())
  React.useEffect(() => {
    if (editing) rows.current.get(editing)?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [editing])
  const [confirmRemove, setConfirmRemove] = React.useState(false)
  const editingCategory = state.categories.find((c) => c.id === editing)

  const press = (key: KeypadKey) => {
    if (!editing) return
    const replace = fresh.current
    fresh.current = false
    setAisles((a) => {
      const current = a[editing]
      const isDigit = key !== "clear" && key !== "backspace"
      const digits = (replace && isDigit) || current === null || current === undefined ? "" : String(current)
      let next: string
      if (key === "clear") next = ""
      else if (key === "backspace") next = digits.slice(0, -1)
      else next = (digits + key).replace(/^0+/, "").slice(0, 3)
      return { ...a, [editing]: next === "" ? null : Number(next) }
    })
  }

  const save = () => {
    const id = existing?.id ?? `store-${Date.now().toString(36)}`
    actions.saveStore({ id, name: name.trim(), aisles })
    goBack({ name: "stores" })
  }

  return (
    <Screen
      leading={<HeaderButton icon={ArrowLeftIcon} label="Back to stores" onClick={() => goBack({ name: "stores" })} />}
      eyebrow="Settings · Stores"
      title={existing ? "Edit store" : "Add store"}
      footer={
        <>
          <Button size="lg" disabled={!name.trim()} onClick={save}>
            Save store
          </Button>
          {existing && state.stores.length > 1 && (
            <Button variant="destructive" size="lg" onClick={() => setConfirmRemove(true)}>
              Remove this store
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-2 border-b border-border px-5 pt-5 pb-4">
        <Label htmlFor="store-name" className="text-[10px] tracking-widest text-muted-foreground">
          Store name
        </Label>
        <Input
          id="store-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="For example, Market"
          autoComplete="off"
          className="h-11 text-[22px] font-medium md:text-[22px]"
        />
      </div>
      <div className="flex flex-col gap-1.5 border-b border-border">
        <h2 className="px-5 pt-5">
          <Eyebrow>Aisle numbers</Eyebrow>
        </h2>
        <Note className="pt-0">
          The list follows these numbers, lowest first. Tap a row to set its number. Leave one blank if this store
          doesn't sell it.
        </Note>
      </div>
      {state.categories.map((c) => {
        const value = aisles[c.id]
        const active = editing === c.id
        return (
          <ListRow key={c.id} asChild tone={active ? "muted" : "default"} className="min-h-15">
            <button
              type="button"
              ref={(el) => {
                if (el) rows.current.set(c.id, el)
              }}
              aria-expanded={active} onClick={() => setEditing(c.id)} aria-label={`${c.name}, aisle ${value ?? "none"}`}>
              <ListRowText title={c.name} titleSize="sm" />
              <CountBox size="wide" variant={active ? "filled" : "default"} className={value == null && !active ? "border-ring text-muted-foreground" : undefined}>
                {value ?? "–"}
              </CountBox>
            </button>
          </ListRow>
        )
      })}

      {editing && <div aria-hidden="true" className="h-[440px] shrink-0" />}

      {/* Not modal, so the list stays visible and you can tap another row to switch. */}
      <Drawer open={!!editing} onOpenChange={(open) => !open && setEditing(null)} modal={false}>
        <DrawerContent className="border-primary">
          <div className="flex flex-col gap-3 px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex min-h-14 items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <DrawerDescription asChild>
                  <Eyebrow>Aisle number</Eyebrow>
                </DrawerDescription>
                <DrawerTitle className="text-xl font-medium tracking-normal normal-case">{editingCategory?.name}</DrawerTitle>
              </div>
              <Button size="lg" onClick={() => setEditing(null)}>
                Done
              </Button>
            </div>
            <Keypad onKey={press} clearLabel="No aisle" />
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {existing?.name}?</DialogTitle>
            <DialogDescription>Its aisle numbers go too. Your list and your pantry aren't changed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Keep it</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                actions.removeStore(existing!.id)
                setConfirmRemove(false)
                goBack({ name: "stores" })
              }}
            >
              Remove store
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Screen>
  )
}
