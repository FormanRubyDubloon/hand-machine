import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { ItemRow } from './item-row'
import { SwipeRow } from './swipe-row'

const meta = {
  title: 'UI/Swipe Row',
  component: SwipeRow,
  tags: ['autodocs'],
  args: {
    right: { label: 'Got all 4', onAction: fn() },
    left: { label: 'Skip', onAction: fn() },
  },
  decorators: [(Story) => <div className="w-[390px] border-t border-border"><Story /></div>],
} satisfies Meta<typeof SwipeRow>

export default meta
type Story = StoryObj<typeof meta>

/** Drag the row right (got all) or left (skip). A tap still reaches the row. */
export const Default: Story = {
  render: (args) => (
    <SwipeRow {...args}>
      <ItemRow name="Lemons" description="Got 2 of 4" stock="low" state="partly-got" remaining={2} />
    </SwipeRow>
  ),
}
