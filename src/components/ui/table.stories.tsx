import type { Meta, StoryObj } from '@storybook/react-vite'

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './table'

const meta = {
  title: 'UI/Table',
  component: Table,
  tags: ['autodocs'],
  decorators: [(Story) => <div className="w-[640px]"><Story /></div>],
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

const rows = [
  { name: 'Whole milk', location: 'Fridge', stock: '1 bottle', min: 2 },
  { name: 'Plain flour', location: 'Cupboard', stock: '2 bags · 1 open', min: 2 },
  { name: 'Peas', location: 'Freezer', stock: '1 bag · open', min: 1 },
]

export const Default: Story = {
  render: (args) => (
    <Table {...args}>
      <TableCaption>Three pantry items.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>In stock</TableHead>
          <TableHead className="text-right">Minimum</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={r.name} data-state={i === 0 ? 'selected' : undefined}>
            <TableCell className="font-medium">{r.name}</TableCell>
            <TableCell>{r.location}</TableCell>
            <TableCell>{r.stock}</TableCell>
            <TableCell className="text-right tabular-nums">{r.min}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
}
