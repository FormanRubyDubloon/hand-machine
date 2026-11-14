import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronRightIcon } from 'lucide-react'

import { CountBox } from './count-box'
import { ListRow, ListRowText } from './list-row'

const meta = {
  title: 'UI/List Row',
  component: ListRow,
  tags: ['autodocs'],
  argTypes: {
    tone: { control: 'select', options: ['default', 'current', 'muted', 'quiet'] },
    size: { control: 'select', options: ['sm', 'default', 'lg'] },
  },
  decorators: [(Story) => <div className="w-[390px] border-t border-border"><Story /></div>],
} satisfies Meta<typeof ListRow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <ListRow asChild {...args}>
      <button type="button">
        <ListRowText title="Corner shop" titleSize="md" description="Sourdough bread, Tin foil and 3 more" />
        <CountBox>5</CountBox>
      </button>
    </ListRow>
  ),
}

export const Current: Story = {
  args: { tone: 'current', size: 'lg' },
  render: (args) => (
    <ListRow asChild {...args}>
      <button type="button">
        <ListRowText eyebrow="Last used" title="Supermarket" description="Lemons, Chillis, Fennel and 7 more" />
        <CountBox variant="inverse">10</CountBox>
      </button>
    </ListRow>
  ),
}

export const WithChevron: Story = {
  render: (args) => (
    <ListRow asChild {...args}>
      <button type="button">
        <ListRowText title="Change store" titleSize="md" description="Shop somewhere else, or add a store" />
        <ChevronRightIcon className="size-4.5" aria-hidden="true" />
      </button>
    </ListRow>
  ),
}

export const Quiet: Story = {
  args: { tone: 'quiet', size: 'sm' },
  render: (args) => (
    <ListRow {...args}>
      <ListRowText title="Fishmonger" titleSize="sm" />
      <span className="text-sm">Nothing to get</span>
    </ListRow>
  ),
}
