import type { Meta, StoryObj } from '@storybook/react-vite'
import { CircleAlert, Terminal } from 'lucide-react'

import { Alert, AlertAction, AlertDescription, AlertTitle } from './alert'
import { Button } from './button'

const meta = {
  title: 'UI/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: { variant: { control: 'select', options: ['default', 'destructive'] } },
  decorators: [(Story) => <div className="w-[420px]"><Story /></div>],
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Alert {...args}>
      <AlertTitle>Heads up</AlertTitle>
      <AlertDescription>You can add components to your app using the CLI.</AlertDescription>
    </Alert>
  ),
}

export const Destructive: Story = {
  args: { variant: 'destructive' },
  render: (args) => (
    <Alert {...args}>
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>Your session has expired. Please sign in again.</AlertDescription>
    </Alert>
  ),
}

export const WithIcon: Story = {
  render: (args) => (
    <Alert {...args}>
      <Terminal />
      <AlertTitle>Heads up</AlertTitle>
      <AlertDescription>You can add components to your app using the CLI.</AlertDescription>
    </Alert>
  ),
}

export const DestructiveWithIcon: Story = {
  args: { variant: 'destructive' },
  render: (args) => (
    <Alert {...args}>
      <CircleAlert />
      <AlertTitle>Payment failed</AlertTitle>
      <AlertDescription>Check your card details and try again.</AlertDescription>
    </Alert>
  ),
}

export const WithAction: Story = {
  render: (args) => (
    <Alert {...args}>
      <AlertTitle>Update available</AlertTitle>
      <AlertDescription>A new version is ready to install.</AlertDescription>
      <AlertAction>
        <Button size="xs" variant="outline">Update</Button>
      </AlertAction>
    </Alert>
  ),
}
