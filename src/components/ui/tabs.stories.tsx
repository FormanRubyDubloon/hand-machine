import type { Meta, StoryObj } from '@storybook/react-vite'

import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  decorators: [(Story) => <div className="w-[360px]"><Story /></div>],
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

const body = (
  <>
    <TabsContent value="account">Make changes to your account here.</TabsContent>
    <TabsContent value="password">Change your password here.</TabsContent>
    <TabsContent value="billing">Manage your billing details.</TabsContent>
  </>
)

export const Default: Story = {
  render: (args) => (
    <Tabs defaultValue="account" {...args}>
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>
      {body}
    </Tabs>
  ),
}

export const Line: Story = {
  render: (args) => (
    <Tabs defaultValue="account" {...args}>
      <TabsList variant="line">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>
      {body}
    </Tabs>
  ),
}

export const Vertical: Story = {
  render: (args) => (
    <Tabs defaultValue="account" orientation="vertical" className="flex-row" {...args}>
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>
      {body}
    </Tabs>
  ),
}

export const WithDisabledTab: Story = {
  render: (args) => (
    <Tabs defaultValue="account" {...args}>
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password" disabled>Password</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>
      {body}
    </Tabs>
  ),
}
