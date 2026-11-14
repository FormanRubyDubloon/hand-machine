import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from './button'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

const meta = {
  title: 'UI/Popover',
  component: Popover,
  tags: ['autodocs'],
} satisfies Meta<typeof Popover>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Popover {...args}>
      <PopoverTrigger asChild>
        <Button variant="outline">Open popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <p>Plain flour is used in 2 recipes.</p>
      </PopoverContent>
    </Popover>
  ),
}
