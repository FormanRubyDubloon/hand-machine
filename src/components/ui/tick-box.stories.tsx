import type { Meta, StoryObj } from '@storybook/react-vite'

import { TickBox } from './tick-box'

const meta = {
  title: 'UI/Tick Box',
  component: TickBox,
  tags: ['autodocs'],
  args: { checked: false, inverse: false },
} satisfies Meta<typeof TickBox>

export default meta
type Story = StoryObj<typeof meta>

export const Unchecked: Story = {}
export const Checked: Story = { args: { checked: true } }
export const InverseChecked: Story = {
  args: { checked: true, inverse: true },
  decorators: [(Story) => <div className="bg-primary p-4"><Story /></div>],
}
