import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { ChoiceRow } from './choice-row'

const choices = [
  { id: 'phone', label: 'This phone', value: '4 in stock', description: 'Was 2, you bought 2 today' },
  { id: 'notion', label: 'Notion', value: '1 in stock', description: 'Changed today, 11:40' },
  { id: 'sum', label: 'Add them up', value: '3 in stock', description: "Notion's 1, plus the 2 you bought" },
]

function Demo() {
  const [selected, setSelected] = useState('phone')
  return (
    <div role="radiogroup" aria-label="Which is right?" className="w-[390px] border-t border-border">
      {choices.map((c) => (
        <ChoiceRow
          key={c.id}
          label={c.label}
          value={c.value}
          description={c.description}
          selected={selected === c.id}
          onClick={() => setSelected(c.id)}
        />
      ))}
    </div>
  )
}

const meta = {
  title: 'UI/Choice Row',
  component: Demo,
  tags: ['autodocs'],
} satisfies Meta<typeof Demo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
