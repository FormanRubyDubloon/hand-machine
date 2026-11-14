import type { Meta, StoryObj } from '@storybook/react-vite'

import { SyncBar } from './sync-bar'

const meta = {
  title: 'UI/Sync Bar',
  component: SyncBar,
  tags: ['autodocs'],
  args: {
    progress: 60,
    detail: 'Sent 3 · getting changes',
    note: 'Keep shopping. Anything you tick now goes in the next sync.',
  },
  decorators: [(Story) => <div className="w-[390px]"><Story /></div>],
} satisfies Meta<typeof SyncBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
