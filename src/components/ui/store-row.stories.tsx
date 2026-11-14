import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { StoreRow } from './store-row'

const meta = {
  title: 'UI/Store Row',
  component: StoreRow,
  tags: ['autodocs'],
  args: { name: 'Greengrocer', description: '4 items to get · 1 aisle', onSelect: fn(), onEdit: fn() },
  decorators: [(Story) => <div className="w-[390px] border-t border-border"><Story /></div>],
} satisfies Meta<typeof StoreRow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Current: Story = {
  args: { name: 'Supermarket', description: '10 items to get · 5 aisles', current: true },
}
