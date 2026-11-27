// First-run welcome: one screen saying what Collca does, then an optional tour of coach marks that points
// at the few things that matter. Shown once, to a new account, when Setup finishes (app.tsx). The tour
// finds its targets by data-tour attributes on the page.
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { navigate } from "./router"
import { IntroIllustration } from "./splash-emblem"

const points: [string, string][] = [
  ["What you have", "Record what you use in a couple of clicks and Collca keeps count, with use-by dates."],
  ["What to cook", "See the recipes you can make now, and the ones that use up food going off first."],
  ["What to buy", "The shopping list fills itself from your Staples and recipes, in aisle order on your phone."],
]

export function IntroDialog({ open, onSkip, onTour }: { open: boolean; onSkip: () => void; onTour: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onSkip()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[560px]" showCloseButton={false}>
        <div className="bg-primary px-10 pt-9 pb-7 text-primary-foreground">
          <IntroIllustration className="mx-auto h-auto w-full max-w-[420px]" />
        </div>
        <div className="flex flex-col gap-6 p-10">
          <div className="flex flex-col gap-2">
            <DialogTitle className="font-serif text-[32px] leading-none font-bold tracking-[0.02em] uppercase">Welcome to Collca</DialogTitle>
            <DialogDescription>Your pantry, recipes and shopping list, kept in step with your phone and Claude.</DialogDescription>
          </div>
          <dl className="flex flex-col">
            {points.map(([title, text]) => (
              <div key={title} className="grid grid-cols-[120px_1fr] gap-4 border-b border-border py-3 first:border-t">
                <dt className="text-[10px] font-semibold tracking-widest uppercase">{title}</dt>
                <dd className="text-sm text-muted-foreground">{text}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted-foreground">Ask Claude to add a recipe, update your stock or plan a shop. Its changes show up here by themselves.</p>
          <div className="flex justify-between gap-3">
            <Button variant="outline" size="lg" onClick={onSkip}>Skip for now</Button>
            <Button size="lg" autoFocus onClick={onTour}>Show me around</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------- the tour ----------

type Step = { target: string; title: string; text: string }

/** The tour, in order. A step whose target isn't on the page (Use today with nothing due) is skipped. */
const steps: Step[] = [
  { target: "use-field", title: "Record what you used", text: "Press −1 on an item you used, or search for it at the top. Stock goes down, and Staples go on the shopping list when they run low." },
  { target: "use-today", title: "Use it before it goes off", text: "What goes off in the next week, soonest first. Tonight's recipe uses it up when it can." },
  { target: "nav-pantry", title: "Everything you have", text: "Every item: how many, the minimum to keep, where it lives and when it goes off. Filter by status to see what's low or out." },
  { target: "nav-recipes", title: "What you can cook", text: "Recipes ranked by what you have, with food that needs using first at the top. Open one to cook from it." },
  { target: "nav-list", title: "What to buy", text: "The list builds itself from Staples below their minimum and recipes you want to cook. Mark things as ordered here; tick them off on your phone." },
  { target: "history", title: "Every change, undoable", text: "The clock opens History: what changed and who did it, you, your phone or Claude. Today's changes can be undone." },
  { target: "settings", title: "Connect Claude", text: "In Settings, under Claude connection, let Claude read and update your pantry: save recipes, record what you've used, plan a shop." },
]

const PAD = 6
const GAP = 12
const CARD_W = 340

export function Tour({ onDone }: { onDone: () => void }) {
  const [k, setK] = React.useState(0)
  const [rect, setRect] = React.useState<DOMRect | null>(null)
  const card = React.useRef<HTMLDivElement>(null)
  const present = React.useMemo(() => {
    // Read once the tour starts, after Home has drawn.
    return steps.filter((s) => document.querySelector(`[data-tour="${s.target}"]`))
  }, [])
  const step = present[k]

  React.useEffect(() => {
    if (!step) return
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
    if (!el) return
    el.scrollIntoView({ block: "nearest" })
    const measure = () => setRect(el.getBoundingClientRect())
    measure()
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    card.current?.focus()
    return () => {
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [step])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone()
      else if (e.key === "ArrowRight") setK((n) => (n + 1 < present.length ? n + 1 : n))
      else if (e.key === "ArrowLeft") setK((n) => Math.max(0, n - 1))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onDone, present.length])

  if (!step || !rect) return null
  const last = k === present.length - 1
  // Below the target if there's room, otherwise above. A target too tall for either (the History panel)
  // gets the card beside it, on whichever side has room. Always kept inside the window.
  const CARD_H = 240
  const clampX = (x: number) => Math.min(Math.max(16, x), window.innerWidth - CARD_W - 16)
  const clampY = (y: number) => Math.min(Math.max(16, y), window.innerHeight - CARD_H - 16)
  let left: number, top: number | undefined, bottom: number | undefined
  if (rect.bottom + PAD + GAP + CARD_H < window.innerHeight) {
    left = clampX(rect.left + rect.width / 2 - CARD_W / 2)
    top = rect.bottom + PAD + GAP
  } else if (rect.top - PAD - GAP - CARD_H > 0) {
    left = clampX(rect.left + rect.width / 2 - CARD_W / 2)
    bottom = window.innerHeight - rect.top + PAD + GAP
  } else {
    const roomLeft = rect.left - PAD - GAP - CARD_W > 16
    left = roomLeft ? rect.left - PAD - GAP - CARD_W : clampX(rect.right + PAD + GAP)
    top = clampY(rect.top)
  }

  return (
    <div className="fixed inset-0 z-[60]" aria-live="polite">
      {/* Blocks the page underneath; clicking outside the card does nothing. */}
      <div className="absolute inset-0" />
      {/* The spotlight: a hole round the target, the rest of the page dimmed. */}
      <div
        className="pointer-events-none absolute rounded-[4px] ring-2 ring-primary-foreground transition-all duration-200"
        style={{
          left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2,
          boxShadow: "0 0 0 9999px oklch(0.2 0.02 60 / 0.55)",
        }}
      />
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        tabIndex={-1}
        className="absolute flex flex-col gap-3 rounded-[4px] bg-popover p-5 text-popover-foreground shadow-lg outline-none ring-1 ring-foreground/10"
        style={{ left, top, bottom, width: CARD_W }}
      >
        <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">{k + 1} of {present.length}</span>
        <h2 id="tour-title" className="font-serif text-[22px] leading-tight font-bold">{step.title}</h2>
        <p className="text-sm text-muted-foreground">{step.text}</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <button type="button" className="text-xs underline underline-offset-4 text-muted-foreground hover:text-foreground" onClick={onDone}>
            {last ? "Close" : "Skip the tour"}
          </button>
          <div className="flex gap-2">
            {k > 0 && <Button variant="outline" size="sm" onClick={() => setK(k - 1)}>Back</Button>}
            <Button size="sm" onClick={() => (last ? onDone() : setK(k + 1))}>{last ? "Done" : "Next"}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Starts the tour on Home, where its targets are. */
export function goHomeForTour() {
  navigate({ name: "home" })
}
