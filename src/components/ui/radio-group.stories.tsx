import type { Meta, StoryObj } from '@storybook/react-vite'

import { Label } from './label'
import { RadioGroup, RadioGroupItem } from './radio-group'

const meta = {
  title: 'UI/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
} satisfies Meta<typeof RadioGroup>

export default meta
type Story = StoryObj<typeof meta>

const options = [
  ['comfortable', 'Comfortable'],
  ['compact', 'Compact'],
  ['spacious', 'Spacious'],
]

export const Default: Story = {
  render: (args) => (
    <RadioGroup defaultValue="comfortable" {...args}>
      {options.map(([value, label]) => (
        <div key={value} className="flex items-center gap-3">
          <RadioGroupItem value={value} id={value} />
          <Label htmlFor={value}>{label}</Label>
        </div>
      ))}
    </RadioGroup>
  ),
}

export const WithDisabledItem: Story = {
  render: (args) => (
    <RadioGroup defaultValue="compact" {...args}>
      {options.map(([value, label]) => (
        <div key={value} className="flex items-center gap-3">
          <RadioGroupItem value={value} id={`d-${value}`} disabled={value === 'spacious'} />
          <Label htmlFor={`d-${value}`}>{label}</Label>
        </div>
      ))}
    </RadioGroup>
  ),
}
