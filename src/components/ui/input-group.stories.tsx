import type { Meta, StoryObj } from '@storybook/react-vite'
import { SearchIcon } from 'lucide-react'

import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from './input-group'

const meta = {
  title: 'UI/Input Group',
  component: InputGroup,
  tags: ['autodocs'],
  decorators: [(Story) => <div className="w-[320px]"><Story /></div>],
} satisfies Meta<typeof InputGroup>

export default meta
type Story = StoryObj<typeof meta>

export const WithIcon: Story = {
  render: (args) => (
    <InputGroup {...args}>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search pantry" aria-label="Search pantry" />
    </InputGroup>
  ),
}

export const WithSuffix: Story = {
  render: (args) => (
    <InputGroup {...args}>
      <InputGroupAddon>
        <InputGroupText>£</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput defaultValue="1.65" aria-label="Price each" />
    </InputGroup>
  ),
}
