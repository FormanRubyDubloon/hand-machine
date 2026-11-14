import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { FilterChips } from './filter-chips'

const options = [
  { value: 'all', label: 'All', count: 14 },
  { value: 'out', label: 'Out', count: 6 },
  { value: 'low', label: 'Low', count: 8 },
] as const

function Demo() {
  const [value, setValue] = useState<'all' | 'out' | 'low'>('all')
  return <FilterChips aria-label="Filter by stock" options={[...options]} value={value} onValueChange={setValue} />
}

const meta = {
  title: 'UI/Filter Chips',
  component: Demo,
  tags: ['autodocs'],
} satisfies Meta<typeof Demo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
