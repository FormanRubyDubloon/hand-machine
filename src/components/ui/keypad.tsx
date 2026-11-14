import * as React from "react"
import { DeleteIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type KeypadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "clear" | "backspace"

const keyClass =
  "flex h-15 items-center justify-center border border-primary bg-background text-2xl font-semibold text-foreground transition-colors outline-none select-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-px active:bg-muted [&_svg]:size-6"

/** A 3 × 4 number pad. Replaces the phone keyboard for short numbers. */
function Keypad({
  className,
  onKey,
  clearLabel = "Clear",
  ...props
}: Omit<React.ComponentProps<"div">, "onKeyDown"> & {
  onKey: (key: KeypadKey) => void
  clearLabel?: string
}) {
  const digits: KeypadKey[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9"]
  return (
    <div
      data-slot="keypad"
      role="group"
      aria-label="Number pad"
      className={cn("grid grid-cols-3 gap-2", className)}
      {...props}
    >
      {digits.map((d) => (
        <button key={d} type="button" className={keyClass} onClick={() => onKey(d)}>
          {d}
        </button>
      ))}
      <button
        type="button"
        className={cn(keyClass, "text-xs tracking-widest uppercase")}
        onClick={() => onKey("clear")}
      >
        {clearLabel}
      </button>
      <button type="button" className={keyClass} onClick={() => onKey("0")}>
        0
      </button>
      <button
        type="button"
        aria-label="Delete"
        className={keyClass}
        onClick={() => onKey("backspace")}
      >
        <DeleteIcon />
      </button>
    </div>
  )
}

export { Keypad, type KeypadKey }
