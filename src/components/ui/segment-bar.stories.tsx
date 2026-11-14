import type { Meta, StoryObj } from '@storybook/react-vite'

import { SegmentBar } from './segment-bar'

const meta = {
  title: 'UI/Segment Bar',
  component: SegmentBar,
  tags: ['autodocs'],
  args: { total: 5, filled: 1, 'aria-label': 'Aisle 1 of 5' },
  decorators: [(Story) => <div className="w-[350px]"><Story /></div>],
} satisfies Meta<typeof SegmentBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const AllDone: Story = { args: { filled: 5, 'aria-label': 'All 5 aisles done' } }
