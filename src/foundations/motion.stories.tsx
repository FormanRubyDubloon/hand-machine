import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import { Code, Note, Page, Section } from './shared'

const meta = {
  title: 'Foundations/Motion',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Transitions: Story = {
  render: () => (
    <Page
      title="Motion"
      intro={
        <>
          There are no motion tokens in this repo. Components use Tailwind&apos;s transition utilities, whose defaults
          are <Code>150ms</Code> with <Code>cubic-bezier(0.4, 0, 0.2, 1)</Code> (ease-in-out), and the enter and exit
          animations from <Code>tw-animate-css</Code>.
        </>
      }
    >
      <Section title="State transitions" note="Hover or focus each one. All use the 150ms default.">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="grid gap-3 border border-border p-5">
            <Button>Hover me</Button>
            <Code>transition-all, active:translate-y-px</Code>
            <span className="text-sm text-muted-foreground">Button: colour, ring and a 1px press on click.</span>
          </div>
          <div className="grid gap-3 border border-border p-5">
            <input
              className="h-10 w-full border border-transparent border-b-input bg-transparent text-sm outline-none transition-[color,border-color] focus-visible:border-b-ring"
              placeholder="Focus me"
            />
            <Code>transition-[color,border-color]</Code>
            <span className="text-sm text-muted-foreground">Input and textarea: only colour and border colour animate.</span>
          </div>
        </div>
      </Section>
    </Page>
  ),
}

function Replay({ children, label }: { children: (key: number) => React.ReactNode; label: string }) {
  const [key, setKey] = React.useState(0)
  return (
    <div className="grid gap-3 border border-border p-5">
      <div className="flex h-24 items-center justify-center">{children(key)}</div>
      <div className="flex items-center justify-between gap-3">
        <Code>{label}</Code>
        <Button size="xs" variant="outline" onClick={() => setKey((k) => k + 1)}>
          Replay
        </Button>
      </div>
    </div>
  )
}

export const Entrances: Story = {
  render: () => (
    <Page
      title="Entrances"
      intro="Overlays (dialog, select, tooltip) fade in and either zoom from 95% or slide in 8px from the side they open toward. Dialog and select run at 100ms; tooltip uses the 150ms default."
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Replay label="animate-in fade-in-0 zoom-in-95 duration-100">
          {(k) => <div key={k} className="h-14 w-40 animate-in border border-border bg-popover fade-in-0 zoom-in-95 duration-100" />}
        </Replay>
        <Replay label="animate-in fade-in-0 slide-in-from-top-2">
          {(k) => <div key={k} className="h-14 w-40 animate-in border border-border bg-popover fade-in-0 slide-in-from-top-2" />}
        </Replay>
        <Replay label="animate-in fade-in-0 slide-in-from-bottom-2">
          {(k) => <div key={k} className="h-14 w-40 animate-in border border-border bg-popover fade-in-0 slide-in-from-bottom-2" />}
        </Replay>
        <Replay label="animate-in fade-in-0 slide-in-from-left-2">
          {(k) => <div key={k} className="h-14 w-40 animate-in border border-border bg-popover fade-in-0 slide-in-from-left-2" />}
        </Replay>
      </div>
      <Note>Exits are the mirror: animate-out, fade-out-0 and zoom-out-95, with the same durations.</Note>
    </Page>
  ),
}

export const Loading: Story = {
  render: () => (
    <Page title="Loading" intro={<>Skeletons pulse with <Code>animate-pulse</Code>: 2s, <Code>cubic-bezier(0.4, 0, 0.6, 1)</Code>, infinite.</>}>
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <div className="grid gap-2">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    </Page>
  ),
}

const REFERENCE: [component: string, classes: string][] = [
  ['button', 'transition-all, active:translate-y-px'],
  ['badge', 'transition-colors'],
  ['input, textarea', 'transition-[color,border-color]'],
  ['select (trigger)', 'transition-[color,border-color]'],
  ['checkbox', 'transition-shadow (transition-none when checked)'],
  ['switch', 'transition-all, transition-transform'],
  ['tabs', 'transition-all, transition-opacity'],
  ['progress', 'transition-all'],
  ['dialog', 'animate-in / animate-out, fade-in-0 / fade-out-0, zoom-in-95 / zoom-out-95, duration-100'],
  ['select (content)', 'animate-in / animate-out, fade, zoom-95, slide-in-from-{side}-2, duration-100'],
  ['tooltip', 'animate-in / animate-out, fade, zoom-95, slide-in-from-{side}-2'],
  ['skeleton', 'animate-pulse'],
]

export const Reference: Story = {
  render: () => (
    <Page title="Motion reference" intro="Every transition and animation class used in src/components/ui.">
      <div className="grid border border-border">
        {REFERENCE.map(([component, classes]) => (
          <div key={component} className="grid grid-cols-[12rem_1fr] gap-6 border-b border-border p-4 last:border-b-0">
            <span className="text-xs font-semibold tracking-wide uppercase">{component}</span>
            <Code>{classes}</Code>
          </div>
        ))}
      </div>
      <Note>
        Nothing in the system respects <Code>prefers-reduced-motion</Code>: there is no <Code>motion-reduce:</Code>{' '}
        variant anywhere. The overlay animations and the skeleton pulse run regardless of the user&apos;s setting.
      </Note>
    </Page>
  ),
}
