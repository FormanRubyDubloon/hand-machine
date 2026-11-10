import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from './button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'

const meta = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  decorators: [(Story) => <div className="w-[380px]"><Story /></div>],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Card title</CardTitle>
        <CardDescription>A short description of what this card holds.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Body content goes here.</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button>Save</Button>
        <Button variant="outline">Cancel</Button>
      </CardFooter>
    </Card>
  ),
}

export const HeaderOnly: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Header only</CardTitle>
        <CardDescription>No content or footer.</CardDescription>
      </CardHeader>
    </Card>
  ),
}
