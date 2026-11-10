import type { Meta, StoryObj } from '@storybook/react-vite'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { Code, Note, Page, Section } from './shared'

const meta = {
  title: 'Foundations/Spacing',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// Steps the components use. Value = step × 4px (Tailwind's --spacing is 0.25rem).
const STEPS: [step: string, px: number, used: string][] = [
  ['0', 0, 'Badge padding'],
  ['px', 1, 'Borders, separator thickness'],
  ['1', 4, 'Input vertical padding, xs button gap'],
  ['1.5', 6, 'Button and badge gap, card header gap'],
  ['2', 8, 'Label gap'],
  ['3', 12, 'xs button padding'],
  ['4', 16, 'sm button padding'],
  ['5', 20, 'Small card spacing'],
  ['6', 24, 'Default button padding'],
  ['7', 28, 'xs button height, file input button'],
  ['8', 32, 'Card spacing, large button padding'],
  ['9', 36, 'sm button height'],
  ['10', 40, 'Default button and input height'],
  ['11', 44, 'Large button height'],
]

export const Scale: Story = {
  render: () => (
    <Page
      title="Spacing"
      intro={
        <>
          Tailwind&apos;s spacing scale: every step is a multiple of <Code>--spacing</Code> (0.25rem, 4px). Only the
          steps the components actually use are listed.
        </>
      }
    >
      <Section title="Scale">
        <div className="grid gap-2">
          {STEPS.map(([step, px, used]) => (
            <div key={step} className="grid grid-cols-[4rem_4rem_1fr_16rem] items-center gap-4">
              <Code>{step === 'px' ? 'px' : step}</Code>
              <Code>{px}px</Code>
              <div className="flex h-6 items-center">
                <div className="h-4 bg-foreground" style={{ width: Math.max(px, 1) }} />
              </div>
              <span className="text-sm text-muted-foreground">{used}</span>
            </div>
          ))}
        </div>
      </Section>
      <Note>
        Heights and widths use the same scale: buttons and inputs are <Code>h-7</Code>, <Code>h-9</Code>, <Code>h-10</Code>{' '}
        or <Code>h-11</Code>.
      </Note>
    </Page>
  ),
}

export const CardSpacing: Story = {
  name: 'Card spacing',
  render: () => (
    <Page
      title="Card spacing"
      intro={
        <>
          A card sets one custom property, <Code>--card-spacing</Code>, and uses it for its padding and the gap
          between its parts. It is <Code>--spacing(8)</Code> (32px) by default and <Code>--spacing(5)</Code> (20px) when{' '}
          <Code>size=&quot;sm&quot;</Code>.
        </>
      }
    >
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {(['default', 'sm'] as const).map((size) => (
          <div key={size} className="grid gap-3">
            <Code>size=&quot;{size}&quot; → {size === 'sm' ? '20px' : '32px'}</Code>
            <Card size={size}>
              <CardHeader>
                <CardTitle>Card title</CardTitle>
                <CardDescription>Padding and gaps follow the size.</CardDescription>
              </CardHeader>
              <CardContent>Content</CardContent>
            </Card>
          </div>
        ))}
      </div>
    </Page>
  ),
}
