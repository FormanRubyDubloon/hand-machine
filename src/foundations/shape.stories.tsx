import type { Meta, StoryObj } from '@storybook/react-vite'

import { Code, Note, Page, Section } from './shared'

const meta = {
  title: 'Foundations/Shape',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Radius: Story = {
  render: () => (
    <Page
      title="Shape"
      intro={
        <>
          <Code>--radius</Code> is 0.625rem (10px). The scale below is derived from it with <Code>calc()</Code> in{' '}
          <Code>@theme inline</Code>.
        </>
      }
    >
      <Section title="Radius scale">
        <div className="flex flex-wrap gap-6">
          {(
            [
              ['rounded-none', '0', 'rounded-none'],
              ['rounded-sm', 'radius × 0.6 = 6px', 'rounded-sm'],
              ['rounded-md', 'radius × 0.8 = 8px', 'rounded-md'],
              ['rounded-lg', 'radius = 10px', 'rounded-lg'],
              ['rounded-xl', 'radius × 1.4 = 14px', 'rounded-xl'],
              ['rounded-2xl', 'radius × 1.8 = 18px', 'rounded-2xl'],
              ['rounded-3xl', 'radius × 2.2 = 22px', 'rounded-3xl'],
              ['rounded-4xl', 'radius × 2.6 = 26px', 'rounded-4xl'],
            ] as const
          ).map(([cls, value, utility]) => (
            <div key={cls} className="grid gap-2">
              <div className={`${utility} size-20 border border-foreground bg-muted`} />
              <div className="grid gap-0.5">
                <Code>{cls}</Code>
                <Code>{value}</Code>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Note>
        The components in this system set <Code>rounded-none</Code> explicitly, so square corners are the look and the
        radius scale is currently unused by them. It is here for anything built on the tokens.
      </Note>
    </Page>
  ),
}

export const Borders: Story = {
  render: () => (
    <Page title="Borders" intro="Borders are 1px. Colour comes from the border and input tokens; focus uses ring.">
      <div className="grid gap-6">
        {(
          [
            ['border border-border', 'Card and outline button edge'],
            ['border border-transparent border-b-input', 'Input: only the bottom edge is visible'],
            ['border border-transparent border-b-ring', 'Input focus'],
            ['border border-transparent border-b-destructive', 'Input invalid'],
          ] as const
        ).map(([classes, use]) => (
          <div key={classes} className="grid grid-cols-[18rem_1fr] items-center gap-6">
            <div className={`${classes} h-12 bg-background`} />
            <div className="grid gap-0.5">
              <Code>{classes}</Code>
              <span className="text-sm text-muted-foreground">{use}</span>
            </div>
          </div>
        ))}
      </div>
    </Page>
  ),
}

export const Elevation: Story = {
  render: () => (
    <Page
      title="Elevation and rings"
      intro="Depth is a single shadow plus hairline rings. Focus and invalid states use rings (a box-shadow with no blur) rather than outlines."
    >
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
        {(
          [
            ['shadow-sm', 'shadow-sm', 'Card shadow'],
            ['ring-1 ring-foreground/5', 'ring-1 ring-foreground/5', 'Card edge'],
            ['ring-2 ring-ring/30', 'ring-2 ring-ring/30', 'Button focus'],
            ['ring-[3px] ring-ring/50', 'ring-[3px] ring-ring/50', 'Badge focus'],
            ['ring-2 ring-destructive/20', 'ring-2 ring-destructive/20', 'Button invalid'],
            ['ring-[3px] ring-destructive/20', 'ring-[3px] ring-destructive/20', 'Badge destructive focus'],
          ] as const
        ).map(([label, utility, use]) => (
          <div key={label} className="grid gap-3">
            <div className={`${utility} h-20 bg-card`} />
            <div className="grid gap-0.5">
              <Code>{label}</Code>
              <span className="text-sm text-muted-foreground">{use}</span>
            </div>
          </div>
        ))}
      </div>
      <Note>
        In dark mode the destructive ring is <Code>ring-destructive/40</Code> and the input border is{' '}
        <Code>white / 15%</Code>. Switch the Theme toolbar to compare.
      </Note>
    </Page>
  ),
}
