import type { Meta, StoryObj } from '@storybook/react-vite'

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from './command'

const meta = {
  title: 'UI/Command',
  component: Command,
  tags: ['autodocs'],
  decorators: [(Story) => <div className="w-[420px] border border-border"><Story /></div>],
} satisfies Meta<typeof Command>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Command {...args}>
      <CommandInput placeholder="Search pantry, recipes and list" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        <CommandGroup heading="Pantry">
          <CommandItem>Lemons</CommandItem>
          <CommandItem>Lemon curd</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Recipes">
          <CommandItem>Salmon with lemon and peas</CommandItem>
          <CommandItem>Lemon drizzle cake</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
}
