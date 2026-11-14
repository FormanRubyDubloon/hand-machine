import type { Meta, StoryObj } from '@storybook/react-vite'
import { CheckIcon, Undo2Icon } from 'lucide-react'
import { fn } from 'storybook/test'

import { ItemRow } from './item-row'
import { SwipeRow } from './swipe-row'

const meta = {
  title: 'UI/Swipe Row',
  component: SwipeRow,
  tags: ['autodocs'],
  args: {
    right: { label: 'Undo', onAction: fn(), icon: Undo2Icon, tone: 'muted' },
    left: { label: 'Got 1', onAction: fn(), icon: CheckIcon, tone: 'primary' },
  },
  decorators: [(Story) => <div className="w-[390px] border-t border-border"><Story /></div>],
} satisfies Meta<typeof SwipeRow>

export default meta
type Story = StoryObj<typeof meta>

/** Drag the row left (got 1) or right (undo). A tap still reaches the row. */
export const Default: Story = {
  render: (args) => (
    <SwipeRow {...args}>
      <ItemRow name="Lemons" description="Got 2 of 4" stock="low" state="partly-got" remaining={2} />
    </SwipeRow>
  ),
}
