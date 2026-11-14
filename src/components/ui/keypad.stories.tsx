import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { Keypad } from './keypad'

const meta = {
  title: 'UI/Keypad',
  component: Keypad,
  tags: ['autodocs'],
  args: { onKey: fn(), clearLabel: 'No aisle' },
  decorators: [(Story) => <div className="w-[350px]"><Story /></div>],
} satisfies Meta<typeof Keypad>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
