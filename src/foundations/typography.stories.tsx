import type { Meta, StoryObj } from '@storybook/react-vite'

import { Code, Note, Page, Section } from './shared'

const meta = {
  title: 'Foundations/Typography',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Typefaces: Story = {
  render: () => (
    <Page
      title="Typography"
      intro={
        <>
          One typeface, Stevie Sans, loaded from Adobe Fonts by the Typekit link in <Code>index.html</Code> and set in{' '}
          <Code>src/index.css</Code> as <Code>--font-sans</Code>. <Code>--font-heading</Code> points at the same family.
        </>
      }
    >
      <Section title="Typeface" note='font-family: "stevie-sans", sans-serif'>
        <div className="grid gap-3 border border-border p-6">
          <p className="text-lg font-semibold tracking-wider uppercase">Stevie Sans</p>
          <p className="text-base">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
          <p className="text-base">abcdefghijklmnopqrstuvwxyz</p>
          <p className="text-base">0123456789 &amp;?!@#%()[]</p>
        </div>
      </Section>

      <Section
        title="Weights"
        note="The Adobe Fonts kit serves only 400 and 700 (and their italics). A weight in between falls back to the nearest served face, so medium renders as regular and semibold as bold."
      >
        <div className="grid gap-3 border border-border p-6">
          {(
            [
              ['font-normal', '400', 'font-normal'],
              ['font-medium', '500 → renders 400', 'font-medium'],
              ['font-semibold', '600 → renders 700', 'font-semibold'],
              ['font-bold', '700', 'font-bold'],
            ] as const
          ).map(([cls, label, utility]) => (
            <div key={cls} className="flex items-baseline gap-6">
              <span className={`${utility} w-64 text-base`}>The quick brown fox</span>
              <Code>
                {cls} ({label})
              </Code>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  ),
}

export const Scale: Story = {
  render: () => (
    <Page
      title="Type scale"
      intro="Only the sizes the components use. Sizes and line heights are Tailwind defaults (rem at 16px)."
    >
      <div className="grid gap-5 border border-border p-6">
        {(
          [
            ['text-[0.625rem]', '10px / auto', 'text-[0.625rem]', 'Badge'],
            ['text-xs', '12px / 16px', 'text-xs', 'Button, label'],
            ['text-sm', '14px / 20px', 'text-sm', 'Card, input at md and up'],
            ['text-base', '16px / 24px', 'text-base', 'Input below md'],
            ['text-lg', '18px / 28px', 'text-lg', 'Card title'],
          ] as const
        ).map(([cls, size, utility, use]) => (
          <div key={cls} className="grid grid-cols-[1fr_auto] items-baseline gap-6 border-b border-border pb-4 last:border-0 last:pb-0">
            <span className={utility}>The quick brown fox jumps over the lazy dog</span>
            <div className="grid text-right">
              <Code>{cls}</Code>
              <Code>{size}</Code>
              <Code>{use}</Code>
            </div>
          </div>
        ))}
      </div>
    </Page>
  ),
}

const STYLES: [name: string, classes: string][] = [
  ['button', 'text-xs font-semibold tracking-widest uppercase'],
  ['badge', 'text-[0.625rem] font-semibold tracking-widest uppercase'],
  ['card', 'text-sm'],
  ['card-title', 'font-heading text-lg font-semibold tracking-wider uppercase'],
  ['card-description', 'text-sm leading-relaxed text-muted-foreground'],
  ['input', 'text-base md:text-sm'],
  ['input-file', 'text-sm font-medium'],
  ['label', 'text-xs font-semibold tracking-wide uppercase'],
]

export const Styles: Story = {
  render: () => (
    <Page
      title="Text styles"
      intro="The code has no named type styles; each component composes Tailwind utilities. These are those combinations, named after the component slot. The Figma file has a text style with the same name for each."
    >
      <div className="grid gap-0 border border-border">
        {STYLES.map(([name, classes]) => (
          <div key={name} className="grid grid-cols-[10rem_1fr] items-baseline gap-6 border-b border-border p-5 last:border-b-0">
            <div className="grid gap-0.5">
              <span className="text-xs font-semibold tracking-wide uppercase">{name}</span>
            </div>
            <div className="grid gap-2">
              <span className={classes}>The quick brown fox jumps over the lazy dog</span>
              <Code>{classes}</Code>
            </div>
          </div>
        ))}
      </div>
      <Note>
        Tracking: <Code>tracking-wide</Code> 0.025em, <Code>tracking-wider</Code> 0.05em, <Code>tracking-widest</Code>{' '}
        0.1em. <Code>leading-relaxed</Code> is 1.625. Uppercase is a text-transform, not a different set of glyphs.
      </Note>
    </Page>
  ),
}
