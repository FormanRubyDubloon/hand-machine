import type { Meta, StoryObj } from '@storybook/react-vite'

import { ItemRow } from './item-row'

const meta = {
  title: 'UI/Item Row',
  component: ItemRow,
  tags: ['autodocs'],
  args: { name: 'Chillis', description: 'Habanero', stock: 'low', remaining: 2, state: 'to-get' },
  argTypes: {
    state: { control: 'select', options: ['to-get', 'partly-got', 'got', 'skipped'] },
    stock: { control: 'select', options: [null, 'out', 'low'] },
  },
  decorators: [(Story) => <div className="w-[390px] border-t border-border"><Story /></div>],
} satisfies Meta<typeof ItemRow>

export default meta
type Story = StoryObj<typeof meta>

export const ToGet: Story = {}
export const PartlyGot: Story = {
  args: { name: 'Lemons', state: 'partly-got', description: 'Got 2 of 4', remaining: 2 },
}
export const Got: Story = {
  args: { name: 'Kiwis', state: 'got', description: 'Got 3 of 3', stock: 'out' },
}
export const Skipped: Story = {
  args: { name: 'Sweet potatoes', state: 'skipped', stock: 'out' },
}
export const AllStates: Story = {
  render: () => (
    <>
      <ItemRow name="Chillis" description="Habanero" stock="low" remaining={2} />
      <ItemRow name="Lemons" description="Got 2 of 4" stock="low" state="partly-got" remaining={2} />
      <ItemRow name="Kiwis" description="Got 3 of 3" stock="out" state="got" />
      <ItemRow name="Sweet potatoes" stock="out" state="skipped" />
    </>
  ),
}
