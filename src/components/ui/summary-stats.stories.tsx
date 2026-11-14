import type { Meta, StoryObj } from '@storybook/react-vite'

import { SummaryStats } from './summary-stats'

const meta = {
  title: 'UI/Summary Stats',
  component: SummaryStats,
  tags: ['autodocs'],
  args: {
    stats: [
      { label: 'To get', value: 14 },
      { label: 'Out of stock', value: 6 },
      { label: 'On order', value: 3 },
    ],
  },
  decorators: [(Story) => <div className="w-[390px]"><Story /></div>],
} satisfies Meta<typeof SummaryStats>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
