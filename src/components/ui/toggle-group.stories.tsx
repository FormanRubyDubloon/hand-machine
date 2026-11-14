import type { Meta, StoryObj } from '@storybook/react-vite'

import { ToggleGroup, ToggleGroupItem } from './toggle-group'

const meta = {
  title: 'UI/Toggle Group',
  component: ToggleGroup,
  tags: ['autodocs'],
  args: { type: 'single', defaultValue: 'all' },
} satisfies Meta<typeof ToggleGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Single: Story = {
  render: (args) => (
    <ToggleGroup {...args}>
      <ToggleGroupItem value="all">All</ToggleGroupItem>
      <ToggleGroupItem value="out">Out</ToggleGroupItem>
      <ToggleGroupItem value="low">Low</ToggleGroupItem>
    </ToggleGroup>
  ),
}

export const Outline: Story = {
  args: { variant: 'outline', spacing: 0 },
  render: Single.render,
}
