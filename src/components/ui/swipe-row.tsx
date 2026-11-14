import * as React from "react"
import { CheckCheckIcon, SkipForwardIcon, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type SwipeAction = {
  label: string
  onAction: () => void
  /** Defaults to a double tick on the right action and a skip arrow on the left. */
  icon?: LucideIcon
  /** Background revealed behind the row. Defaults to primary on the right, muted on the left. */
  tone?: "primary" | "muted"
}

const toneClass = {
  primary: "bg-primary text-primary-foreground",
  muted: "bg-muted text-foreground",
}

const THRESHOLD = 96
const LOCK_DISTANCE = 8

/**
 * Wraps a row so it can be swiped. Swipe right runs `right` (e.g. Got all),
 * swipe left runs `left` (e.g. Skip). A tap still reaches the row underneath.
 * Each action is also a visually hidden button for keyboard and screen readers.
 */
function SwipeRow({
  className,
  children,
  right,
  left,
  ...props
}: React.ComponentProps<"div"> & { right?: SwipeAction; left?: SwipeAction }) {
  const [dx, setDx] = React.useState(0)
  const [dragging, setDragging] = React.useState(false)
  const start = React.useRef<{ x: number; y: number; id: number } | null>(null)
  const axis = React.useRef<"x" | "y" | null>(null)
  const swiped = React.useRef(false)

  const clamp = (value: number) => {
    if (value > 0 && !right) return 0
    if (value < 0 && !left) return 0
    // Resist past the threshold so it feels like it's snapping.
    const sign = Math.sign(value)
    const abs = Math.abs(value)
    return sign * (abs < THRESHOLD ? abs : THRESHOLD + (abs - THRESHOLD) * 0.35)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    axis.current = null
    swiped.current = false
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!start.current || start.current.id !== e.pointerId) return
    const mx = e.clientX - start.current.x
    const my = e.clientY - start.current.y
    if (!axis.current) {
      if (Math.abs(mx) < LOCK_DISTANCE && Math.abs(my) < LOCK_DISTANCE) return
      axis.current = Math.abs(mx) > Math.abs(my) ? "x" : "y"
      if (axis.current === "x") {
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragging(true)
      }
    }
    if (axis.current === "x") setDx(clamp(mx))
  }

  const end = () => {
    if (axis.current === "x") {
      swiped.current = true
      if (dx >= THRESHOLD) right?.onAction()
      else if (dx <= -THRESHOLD) left?.onAction()
    }
    start.current = null
    axis.current = null
    setDragging(false)
    setDx(0)
  }

  const armed = Math.abs(dx) >= THRESHOLD

  return (
    <div
      data-slot="swipe-row"
      className={cn("relative shrink-0 touch-pan-y overflow-hidden select-none", className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onClickCapture={(e) => {
        // A swipe shouldn't also count as a tap.
        if (swiped.current) {
          e.preventDefault()
          e.stopPropagation()
          swiped.current = false
        }
      }}
      {...props}
    >
      {dx > 0 && right && (
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0 flex items-center gap-2.5 px-5 text-xs font-semibold tracking-widest uppercase",
            toneClass[right.tone ?? "primary"]
          )}
        >
          {React.createElement(right.icon ?? CheckCheckIcon, {
            className: cn("size-5 transition-transform", armed && "scale-125"),
            strokeWidth: 2.5,
          })}
          {right.label}
        </div>
      )}
      {dx < 0 && left && (
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0 flex items-center justify-end gap-2.5 px-5 text-xs font-semibold tracking-widest uppercase",
            toneClass[left.tone ?? "muted"]
          )}
        >
          {left.label}
          {React.createElement(left.icon ?? SkipForwardIcon, {
            className: cn("size-5 transition-transform", armed && "scale-125"),
          })}
        </div>
      )}
      <div
        className={cn(
          "relative",
          !dragging && "transition-transform duration-200 ease-out",
          dx !== 0 && "shadow"
        )}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
      >
        {children}
      </div>
      {right && (
        <button type="button" className="sr-only" onClick={right.onAction}>
          {right.label}
        </button>
      )}
      {left && (
        <button type="button" className="sr-only" onClick={left.onAction}>
          {left.label}
        </button>
      )}
    </div>
  )
}

export { SwipeRow, type SwipeAction }
