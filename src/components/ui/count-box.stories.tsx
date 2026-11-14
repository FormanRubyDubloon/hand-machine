import type { Meta, StoryObj } from '@storybook/react-vite'

import { CountBox } from './count-box'

const meta = {
  title: 'UI/Count Box',
  component: CountBox,
  tags: ['autodocs'],
  args: { children: 2 },
  argTypes: {
    variant: { control: 'select', options: ['default', 'inverse', 'filled', 'done', 'skipped', 'add'] },
    size: { control: 'select', options: ['default', 'sm', 'wide'] },
  },
} satisfies Meta<typeof CountBox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Filled: Story = { args: { variant: 'filled', size: 'wide', children: 4 } }
export const Done: Story = { args: { variant: 'done' } }
export const Skipped: Story = { args: { variant: 'skipped' } }
export const Add: Story = { args: { variant: 'add' } }
export const Inverse: Story = {
  args: { variant: 'inverse', children: 10 },
  decorators: [(Story) => <div className="bg-primary p-4"><Story /></div>],
}
export const AllStates: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <CountBox>2</CountBox>
      <CountBox variant="done" />
      <CountBox variant="skipped" />
      <CountBox variant="add" />
      <CountBox variant="filled" size="wide">12</CountBox>
      <CountBox size="sm">1</CountBox>
    </div>
  ),
}
