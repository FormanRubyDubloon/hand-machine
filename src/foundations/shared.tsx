import * as React from 'react'

import { cn } from '@/lib/utils'

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

/** True when the `.dark` class is on <html> (set by the Storybook theme toolbar). */
export function useDark() {
  return React.useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains('dark'),
    () => false,
  )
}

/** Reads a CSS custom property from :root, so the docs follow the code and the active mode. */
export function useCssVar(name: string) {
  return React.useSyncExternalStore(
    subscribe,
    () => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    () => '',
  )
}

export function Page({ title, intro, children }: { title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-10 py-12">
      <h1 className="font-heading text-lg font-semibold tracking-wider uppercase">{title}</h1>
      {intro ? <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{intro}</p> : null}
      <div className="mt-10 grid gap-12">{children}</div>
    </div>
  )
}

export function Section({ title, note, children }: { title: string; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="grid gap-4">
      <div className="border-b border-border pb-2">
        <h2 className="text-xs font-semibold tracking-widest uppercase">{title}</h2>
        {note ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{note}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function Code({ children, className }: { children: React.ReactNode; className?: string }) {
  return <code className={cn('font-mono text-[0.6875rem] text-muted-foreground', className)}>{children}</code>
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-2xl border-l-2 border-foreground pl-3 text-sm leading-relaxed text-card-foreground">{children}</p>
  )
}
