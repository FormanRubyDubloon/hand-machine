import type { Meta, StoryObj } from '@storybook/react-vite'

import { Input } from './input'

const meta = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  args: { placeholder: 'Type here' },
  decorators: [(Story) => <div className="w-[320px]"><Story /></div>],
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithValue: Story = { args: { defaultValue: 'Hello' } }
export const Email: Story = { args: { type: 'email', placeholder: 'name@example.com' } }
export const Password: Story = { args: { type: 'password', defaultValue: 'secret' } }
export const Disabled: Story = { args: { disabled: true } }
export const File: Story = { args: { type: 'file' } }
