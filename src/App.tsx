import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-3xl mx-auto space-y-10">

        <div>
          <h1 className="text-3xl font-bold tracking-tight">hand-machine</h1>
          <p className="text-muted-foreground mt-1">Design system foundation</p>
        </div>

        <Separator />

        {/* Buttons */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
          </div>
        </section>

        <Separator />

        {/* Badges */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Badges</h2>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </section>

        <Separator />

        {/* Form controls */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Form controls</h2>
          <div className="grid gap-4 max-w-sm">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="disabled">Disabled</Label>
              <Input id="disabled" placeholder="Can't touch this" disabled />
            </div>
          </div>
        </section>

        <Separator />

        {/* Cards */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Cards</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Card title</CardTitle>
                <CardDescription>Supporting description text goes here.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Card body content area.</p>
              </CardContent>
              <CardFooter className="gap-2">
                <Button size="sm">Action</Button>
                <Button size="sm" variant="outline">Cancel</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Another card</CardTitle>
                <CardDescription>With a badge in the footer.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">More content goes here.</p>
              </CardContent>
              <CardFooter>
                <Badge variant="secondary">In progress</Badge>
              </CardFooter>
            </Card>
          </div>
        </section>

      </div>
    </div>
  )
}

export default App
