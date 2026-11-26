// SET-07: Settings · Appearance (claude/handoff-themes.md). The colour theme (Walnut or Thyme, on the
// account) and light or dark (on this computer). Both apply straight away; there's no Save.
import * as React from "react"
import { SmartphoneIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { COLOUR_THEMES, colourThemeName, type ColourTheme } from "../../../shared/src/colour-theme"
import { getColourTheme, getTheme, isDark, setColourTheme, setTheme, subscribeTheme, systemIsDark, type ThemeChoice } from "../theme"
import { Eyebrow, PageTitle, Segmented } from "../components"

/** Re-renders when either choice, or the computer's own setting, changes. */
function useThemes() {
  const snap = React.useSyncExternalStore(subscribeTheme, () => `${getColourTheme()}|${getTheme()}|${isDark()}|${systemIsDark()}`)
  const [colour, mode, dark, system] = snap.split("|")
  return { colour: colour as ColourTheme, mode: mode as ThemeChoice, dark: dark === "true", systemDark: system === "true" }
}

/**
 * A small drawing of the pantry in one colour theme: the nav with its current tab, Add item, the
 * All/Low filter, an Out pill, a selected row with a Low pill, and a link. Decoration only: the
 * card's name and description carry the meaning.
 */
function ThemePreview({ theme }: { theme: ColourTheme }) {
  const pill = "inline-flex h-4 items-center rounded-full border px-1.5 text-[8px] font-semibold tracking-[0.08em] uppercase"
  return (
    <div data-colour-theme={theme} aria-hidden="true" className="pointer-events-none flex flex-col bg-background text-foreground select-none">
      <div className="flex h-8 items-stretch gap-3 border-b border-border px-3">
        <span className="flex items-center text-[9px] font-semibold tracking-[0.12em] uppercase">Collca</span>
        <span className="flex items-center border-b-2 border-(--nav-active) pt-0.5 text-[8px] font-semibold tracking-widest uppercase">Pantry</span>
        <span className="flex items-center border-b-2 border-transparent pt-0.5 text-[8px] font-semibold tracking-widest text-muted-foreground uppercase">List</span>
        <span className="flex items-center border-b-2 border-transparent pt-0.5 text-[8px] font-semibold tracking-widest text-muted-foreground uppercase">Recipes</span>
        <span className="ml-auto flex items-center">
          <span className="rounded-[3px] bg-primary px-2 py-1 text-[8px] font-semibold tracking-[0.08em] text-primary-foreground uppercase">+ Add item</span>
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <span className="flex overflow-hidden rounded-[3px] border border-primary text-[8px] font-semibold tracking-[0.08em] uppercase">
          <span className="bg-primary px-2 py-0.5 text-primary-foreground">All</span>
          <span className="px-2 py-0.5">Low</span>
        </span>
        <span className="ml-auto text-[9px] text-(--link) underline underline-offset-2">See all</span>
      </div>
      <div className="flex h-7 items-center gap-2 border-b border-border px-3 text-[10px]">
        <span className="flex-1">Basmati rice</span>
        <span className={cn(pill, "border-(--status-out) bg-(--status-out) text-(--status-out-foreground)")}>Out</span>
      </div>
      <div className="flex h-7 items-center gap-2 border-b border-border bg-secondary px-3 text-[10px]">
        <span className="flex-1">Whole milk</span>
        <span className={cn(pill, "border-(--status-low-border) bg-(--status-low) text-(--status-low-foreground)")}>Low</span>
      </div>
      <div className="flex h-7 items-center gap-2 px-3 text-[10px]">
        <span className="flex-1">Plain flour</span>
        <span className="text-[9px] text-muted-foreground">2 packs</span>
      </div>
    </div>
  )
}

function ThemeCard({ theme, selected, onSelect, cardRef }: { theme: (typeof COLOUR_THEMES)[number]; selected: boolean; onSelect: () => void; cardRef: (el: HTMLButtonElement | null) => void }) {
  const id = React.useId()
  return (
    <button
      ref={cardRef}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-labelledby={`${id}-name`}
      aria-describedby={`${id}-description`}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      className={cn(
        "flex w-[440px] max-w-full flex-col overflow-hidden rounded-[4px] bg-background text-left transition-colors outline-none",
        selected ? "border-2 border-primary" : "border border-border p-px hover:border-input",
      )}
    >
      <ThemePreview theme={theme.value} />
      <span className="flex items-start gap-3 border-t border-border px-4 py-3.5">
        <span
          aria-hidden="true"
          className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2", selected ? "border-primary" : "border-input")}
        >
          {selected && <span className="size-2 rounded-full bg-primary" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span id={`${id}-name`} className="text-sm font-semibold">{theme.name}</span>
          <span id={`${id}-description`} className="text-xs text-muted-foreground">{theme.description}</span>
        </span>
        <span data-colour-theme={theme.value} aria-hidden="true" className="flex shrink-0 gap-1 bg-transparent pt-0.5">
          {["bg-background", "bg-primary", "bg-foreground", "bg-(--nav-active)"].map((c) => (
            <span key={c} className={cn("size-3.5 rounded-full border border-border", c)} />
          ))}
        </span>
      </span>
    </button>
  )
}

const modeNote = (mode: ThemeChoice, systemDark: boolean) =>
  (mode === "light"
    ? "Light is easiest to read in daylight."
    : mode === "dark"
      ? "Dark is easier on the eyes in the evening and in dim shops."
      : `Follows this computer. It's ${systemDark ? "dark" : "light"} right now.`) + " This is set on each device."

export function Appearance() {
  const { colour, mode, dark, systemDark } = useThemes()
  const cards = React.useRef<(HTMLButtonElement | null)[]>([])
  // Arrow keys move the choice, as a native radio group does. Only the chosen card is in the tab order.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0
    if (!step) return
    e.preventDefault()
    const i = COLOUR_THEMES.findIndex((t) => t.value === colour)
    const next = (i + step + COLOUR_THEMES.length) % COLOUR_THEMES.length
    setColourTheme(COLOUR_THEMES[next].value)
    cards.current[next]?.focus()
  }
  return (
    <>
      <PageTitle title="Appearance" subtitle={`Changes apply straight away. Showing: ${colourThemeName(colour)}, ${dark ? "dark" : "light"}.`} />
      <div className="flex max-w-[900px] flex-col gap-8">
        <section className="flex flex-col gap-3">
          <Eyebrow className="text-foreground">Colour theme</Eyebrow>
          <div role="radiogroup" aria-label="Colour theme" onKeyDown={onKeyDown} className="flex flex-wrap gap-5">
            {COLOUR_THEMES.map((t, i) => (
              <ThemeCard key={t.value} theme={t} selected={t.value === colour} onSelect={() => setColourTheme(t.value)} cardRef={(el) => { cards.current[i] = el }} />
            ))}
          </div>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <SmartphoneIcon className="size-3.5" aria-hidden="true" />
            Saved to your account, so the shopping app on your phone uses it too.
          </p>
        </section>
        <section className="flex flex-col gap-3">
          <Eyebrow className="text-foreground">Light or dark</Eyebrow>
          <Segmented
            label="Light or dark"
            className="w-[440px] max-w-full"
            value={mode}
            onChange={setTheme}
            options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "auto", label: "Match computer" }]}
          />
          <p className="text-xs text-muted-foreground">{modeNote(mode, systemDark)}</p>
        </section>
      </div>
    </>
  )
}
