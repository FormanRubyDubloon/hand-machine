import * as React from "react"
import { ArrowDownIcon, ArrowUpIcon, MenuIcon, RefreshCwIcon, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SyncBar } from "@/components/ui/sync-bar"
import { useApp } from "./state"
import { navigate } from "./router"

/** The frame every screen shares: header, optional sync bar, scrolling body, footer. */
export function Screen({
  eyebrow,
  title,
  subtitle,
  aside,
  action,
  leading,
  top,
  below,
  footer,
  children,
  className,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  aside?: React.ReactNode
  action?: React.ReactNode
  leading?: React.ReactNode
  top?: React.ReactNode
  below?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const { state } = useApp()
  const sync = state.sync

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex shrink-0 flex-col gap-3.5 border-b border-border px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-5">
        {top}
        <div className="flex items-end justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {leading}
            <div className="flex min-w-0 flex-col gap-2">
              {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
              <h1 className="type-title text-3xl leading-none font-semibold tracking-[0.04em] break-words uppercase">
                {title}
              </h1>
              {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
            </div>
          </div>
          {aside && <span className="shrink-0 text-sm text-muted-foreground">{aside}</span>}
          {action}
        </div>
        {below}
      </header>
      {sync && sync.phase !== "paused" && (
        <SyncBar
          progress={sync.phase === "finishing" ? 100 : sync.progress}
          detail={
            sync.phase === "sending"
              ? `Sending ${sync.outgoing}`
              : sync.phase === "receiving"
                ? `Sent ${sync.outgoing} · getting changes`
                : "Finishing"
          }
          note="Keep shopping. Anything you tick now goes in the next sync."
        />
      )}
      <main className={cn("flex flex-1 flex-col overflow-y-auto overscroll-contain", className)}>{children}</main>
      {footer && (
        <footer className="flex shrink-0 flex-col gap-2.5 border-t border-border bg-background px-5 pt-3.5 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
          {footer}
        </footer>
      )}
    </div>
  )
}

export function Eyebrow({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("text-[10px] font-semibold tracking-widest text-muted-foreground uppercase", className)}
      {...props}
    />
  )
}

/** Square icon button in the header (close, back, menu). */
export function HeaderButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <Button variant="outline" size="icon-lg" aria-label={label} onClick={onClick} className="shrink-0">
      <Icon className="size-4.5" />
    </Button>
  )
}

/** The menu button that sits beside the main footer button. */
export function MenuButton() {
  return (
    <Button
      variant="outline"
      size="icon-lg"
      aria-label="Menu"
      onClick={() => navigate({ name: "menu" })}
      className="shrink-0 border-primary"
    >
      <MenuIcon className="size-5" />
    </Button>
  )
}

/** A footer button with a label on the left and a quiet count on the right. */
export function SplitButton({
  label,
  detail,
  icon: Icon,
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  label: React.ReactNode
  detail?: React.ReactNode
  icon?: LucideIcon
}) {
  return (
    <Button size="lg" className={cn("justify-between px-5", className)} {...props}>
      <span className="flex items-center gap-2">
        {Icon && <Icon className="size-4" />}
        {label}
      </span>
      {detail && (
        <span className="text-sm font-normal tracking-normal normal-case text-primary-foreground/70 [&_strong]:font-semibold [&_strong]:text-primary-foreground">
          {detail}
        </span>
      )}
    </Button>
  )
}

export const SyncIcon = RefreshCwIcon

export function SectionHeading({
  children,
  count,
  direction,
  className,
}: {
  children: React.ReactNode
  count?: React.ReactNode
  direction?: "up" | "down"
  className?: string
}) {
  const Icon = direction === "up" ? ArrowUpIcon : direction === "down" ? ArrowDownIcon : null
  return (
    <div className={cn("flex items-center gap-2 border-b border-border px-5 pt-5 pb-2 text-muted-foreground", className)}>
      {Icon && <Icon className="size-3.5" aria-hidden="true" />}
      <h2 className="flex-1 text-[10px] font-semibold tracking-widest uppercase">{children}</h2>
      {count && <span className="text-[10px] font-semibold tracking-widest uppercase">{count}</span>}
    </div>
  )
}

export function Note({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("px-5 py-4 text-sm leading-5 text-muted-foreground", className)} {...props} />
}
