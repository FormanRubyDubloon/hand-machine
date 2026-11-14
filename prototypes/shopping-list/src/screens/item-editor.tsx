import * as React from "react"
import { MinusIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ListItem } from "../model"

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max?: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="icon-lg" aria-label={`One fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <MinusIcon />
        </Button>
        <span className="w-8 text-center text-2xl font-semibold tabular-nums" aria-live="polite">{value}</span>
        <Button type="button" variant="outline" size="icon-lg" aria-label={`One more ${label.toLowerCase()}`} disabled={max !== undefined && value >= max} onClick={() => onChange(value + 1)}>
          <PlusIcon />
        </Button>
      </div>
    </div>
  )
}

/** Opens under an item row. Changes apply as you make them. */
export function ItemEditor({
  li,
  onRename,
  onNeed,
  onGot,
  onSkip,
  onClose,
}: {
  li: ListItem
  onRename: (name: string) => void
  /** How many to get in this shop. */
  onNeed: (needed: number) => void
  onGot: (got: number) => void
  onSkip?: () => void
  onClose: () => void
}) {
  const [name, setName] = React.useState(li.item.name)
  const id = `edit-${li.item.id}`

  return (
    <div className="flex flex-col gap-5 border-b border-border bg-muted/40 px-5 py-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>Name</Label>
        <Input
          id={id}
          value={name}
          autoComplete="off"
          onChange={(e) => {
            setName(e.target.value)
            // An empty name isn't saved. The field keeps what you typed.
            if (e.target.value.trim()) onRename(e.target.value.trim())
          }}
          onBlur={() => setName(li.item.name)}
          onKeyDown={(e) => e.key === "Enter" && onClose()}
        />
      </div>
      <Stepper label="To get" value={li.needed} min={Math.max(1, li.got)} onChange={onNeed} />
      <Stepper label="Got" value={li.got} min={0} max={li.needed} onChange={onGot} />
      <div className="flex gap-2.5">
        {onSkip && (
          <Button type="button" variant="outline" size="lg" className="flex-1 border-primary" onClick={onSkip}>
            Skip
          </Button>
        )}
        <Button type="button" size="lg" className="flex-1" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  )
}
