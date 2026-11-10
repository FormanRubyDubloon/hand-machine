import type { Meta, StoryObj } from '@storybook/react-vite'

import { Code, Note, Page, Section, useCssVar } from './shared'

const meta = {
  title: 'Foundations/Colour',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const GROUPS: { title: string; note?: string; tokens: [name: string, utility: string][] }[] = [
  {
    title: 'Surfaces',
    tokens: [
      ['background', 'bg-background'],
      ['foreground', 'text-foreground'],
      ['card', 'bg-card'],
      ['card-foreground', 'text-card-foreground'],
      ['popover', 'bg-popover'],
      ['popover-foreground', 'text-popover-foreground'],
    ],
  },
  {
    title: 'Actions',
    tokens: [
      ['primary', 'bg-primary'],
      ['primary-foreground', 'text-primary-foreground'],
      ['secondary', 'bg-secondary'],
      ['secondary-foreground', 'text-secondary-foreground'],
      ['accent', 'bg-accent'],
      ['accent-foreground', 'text-accent-foreground'],
      ['muted', 'bg-muted'],
      ['muted-foreground', 'text-muted-foreground'],
    ],
  },
  { title: 'Feedback', tokens: [['destructive', 'bg-destructive']] },
  {
    title: 'Lines and focus',
    tokens: [
      ['border', 'border-border'],
      ['input', 'border-input'],
      ['ring', 'ring-ring'],
    ],
  },
  {
    title: 'Charts',
    tokens: [1, 2, 3, 4, 5].map((n) => [`chart-${n}`, `bg-chart-${n}`] as [string, string]),
  },
  {
    title: 'Sidebar',
    tokens: [
      ['sidebar', 'bg-sidebar'],
      ['sidebar-foreground', 'text-sidebar-foreground'],
      ['sidebar-primary', 'bg-sidebar-primary'],
      ['sidebar-primary-foreground', 'text-sidebar-primary-foreground'],
      ['sidebar-accent', 'bg-sidebar-accent'],
      ['sidebar-accent-foreground', 'text-sidebar-accent-foreground'],
      ['sidebar-border', 'border-sidebar-border'],
      ['sidebar-ring', 'ring-sidebar-ring'],
    ],
  },
]

function Swatch({ name, utility }: { name: string; utility: string }) {
  const value = useCssVar(`--${name}`)
  return (
    <div className="grid gap-2">
      <div
        className="h-16 border border-border"
        style={{ background: `var(--${name})` }}
        aria-label={`${name} swatch`}
      />
      <div className="grid gap-0.5">
        <span className="text-xs font-semibold tracking-wide uppercase">{name}</span>
        <Code>var(--{name})</Code>
        <Code>{utility}</Code>
        <Code>{value || '…'}</Code>
      </div>
    </div>
  )
}

export const Tokens: Story = {
  render: () => (
    <Page
      title="Colour"
      intro={
        <>
          Semantic colour tokens, defined as oklch values in <Code>src/index.css</Code> (<Code>:root</Code> for light,{' '}
          <Code>.dark</Code> for dark) and mapped into Tailwind by <Code>@theme inline</Code>. Use the Theme toolbar
          to switch mode. Values below are read live from the CSS variables.
        </>
      }
    >
      {GROUPS.map((group) => (
        <Section key={group.title} title={group.title}>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
            {group.tokens.map(([name, utility]) => (
              <Swatch key={name} name={name} utility={utility} />
            ))}
          </div>
        </Section>
      ))}
      <Note>
        Charts use the same five values in both modes. The dark sidebar-primary is a blue that sits outside the
        taupe palette. Both are as shipped in the shadcn preset, not choices made here.
      </Note>
    </Page>
  ),
}

const PAIRS: [bg: string, fg: string, label: string][] = [
  ['background', 'foreground', 'Page'],
  ['card', 'card-foreground', 'Card'],
  ['popover', 'popover-foreground', 'Popover'],
  ['primary', 'primary-foreground', 'Primary'],
  ['secondary', 'secondary-foreground', 'Secondary'],
  ['accent', 'accent-foreground', 'Accent'],
  ['muted', 'muted-foreground', 'Muted'],
  ['sidebar', 'sidebar-foreground', 'Sidebar'],
]

export const Pairings: Story = {
  render: () => (
    <Page
      title="Colour pairings"
      intro="Each surface with the text colour that goes on it. These are the combinations the components use."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PAIRS.map(([bg, fg, label]) => (
          <div
            key={bg}
            className="grid gap-1 border border-border p-5"
            style={{ background: `var(--${bg})`, color: `var(--${fg})` }}
          >
            <span className="text-xs font-semibold tracking-widest uppercase">{label}</span>
            <span className="text-sm">The quick brown fox jumps over the lazy dog.</span>
            <span className="font-mono text-[0.6875rem] opacity-80">
              {bg} / {fg}
            </span>
          </div>
        ))}
      </div>
      <Note>
        Contrast is not measured here. Run the a11y panel on a component story to check a specific pairing.
      </Note>
    </Page>
  ),
}

const TAUPE: [step: string, oklch: string][] = [
  ['50', 'oklch(0.986 0.002 67.8)'],
  ['100', 'oklch(0.96 0.002 17.2)'],
  ['200', 'oklch(0.922 0.005 34.3)'],
  ['300', 'oklch(0.868 0.007 39.5)'],
  ['400', 'oklch(0.714 0.014 41.2)'],
  ['500', 'oklch(0.547 0.021 43.1)'],
  ['600', 'oklch(0.438 0.017 39.3)'],
  ['700', 'oklch(0.367 0.016 35.7)'],
  ['800', 'oklch(0.268 0.011 36.5)'],
  ['900', 'oklch(0.214 0.009 43.1)'],
  ['950', 'oklch(0.147 0.004 49.3)'],
]

export const TaupeScale: Story = {
  name: 'Taupe scale',
  render: () => (
    <Page
      title="Taupe scale"
      intro={
        <>
          The raw values behind the semantic tokens. The code has no primitive layer: these oklch literals appear
          directly in <Code>:root</Code> and <Code>.dark</Code>. They match Tailwind&apos;s taupe palette, which is why
          the Figma file names them <Code>color-taupe-50</Code> to <Code>color-taupe-950</Code>.
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
        {TAUPE.map(([step, oklch]) => (
          <div key={step} className="grid gap-2">
            <div className="h-16 border border-border" style={{ background: oklch }} />
            <div className="grid gap-0.5">
              <span className="text-xs font-semibold tracking-wide uppercase">taupe-{step}</span>
              <Code>{oklch}</Code>
            </div>
          </div>
        ))}
      </div>
    </Page>
  ),
}
