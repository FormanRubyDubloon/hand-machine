import * as React from "react"
import { MinusIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Category } from "../model"

// Not drawn in the handoff yet. A minimal form so the row does something.
export function AddItemDrawer({
  open,
  onOpenChange,
  categories,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  onAdd: (item: { name: string; target: number; categoryId: string }) => void
}) {
  const [name, setName] = React.useState("")
  const [count, setCount] = React.useState(1)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({ name: name.trim(), target: count, categoryId: categories[0].id })
    setName("")
    setCount(1)
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <DrawerContent>
        <form onSubmit={submit} className="flex flex-col gap-5 px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <DrawerHeader className="p-0 text-left">
            <DrawerTitle className="text-xl">Add item</DrawerTitle>
            <DrawerDescription>Goes on this list now and into your pantry at the next sync.</DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-item-name">Name</Label>
            <Input id="new-item-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          </div>
          <div className="flex items-center justify-between">
            <Label>How many</Label>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="icon-lg" aria-label="One fewer" disabled={count <= 1} onClick={() => setCount((c) => c - 1)}>
                <MinusIcon />
              </Button>
              <span className="w-8 text-center text-2xl font-semibold tabular-nums" aria-live="polite">{count}</span>
              <Button type="button" variant="outline" size="icon-lg" aria-label="One more" onClick={() => setCount((c) => c + 1)}>
                <PlusIcon />
              </Button>
            </div>
          </div>
          <Button type="submit" size="lg" disabled={!name.trim()}>
            Add to list
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
