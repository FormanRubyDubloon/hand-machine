import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ArrowRight, Info, Trash2, Plus } from 'lucide-react'

const prototypes = [
  { name: 'Pantry', href: '/prototypes/pantry-app/', description: 'The desktop pantry app: stock, recipes, the shopping list and History.' },
  { name: 'Shopping list', href: '/prototypes/shopping-list/', description: 'The phone web app for the shop. A fallback until the iPhone app replaces it.' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

function App() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground px-8 py-12">
        <div className="max-w-3xl mx-auto space-y-12">

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">hand-machine</h1>
            <p className="text-sm text-muted-foreground">Design system · Stevie Sans · Taupe · Radix Sera</p>
          </div>

          <Separator />

          {/* The prototypes built with these components. Each is its own page on this site. */}
          <Section title="Prototypes">
            <div className="grid gap-3 sm:grid-cols-2">
              {prototypes.map((p) => (
                <a
                  key={p.href}
                  href={p.href}
                  className="group flex flex-col gap-1 border border-border p-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex items-center justify-between text-sm font-semibold">
                    {p.name}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                  <span className="text-xs text-muted-foreground">{p.description}</span>
                </a>
              ))}
            </div>
          </Section>

          <Separator />

          {/* Buttons */}
          <Section title="Button">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="xs">Extra small</Button>
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon"><Plus /></Button>
                <Button size="icon" variant="outline"><Trash2 /></Button>
                <Button disabled>Disabled</Button>
              </div>
            </div>
          </Section>

          <Separator />

          {/* Badge */}
          <Section title="Badge">
            <div className="flex flex-wrap gap-4">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="ghost">Ghost</Badge>
              <Badge variant="link">Link</Badge>
            </div>
          </Section>

          <Separator />

          {/* Form */}
          <Section title="Form">
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" type="email" placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Write something…" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan">Plan</Label>
                  <Select>
                    <SelectTrigger id="plan">
                      <SelectValue placeholder="Choose a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-5">
                <div className="space-y-3">
                  <Label>Notifications</Label>
                  <div className="space-y-2">
                    {['Email', 'Push', 'SMS'].map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <Checkbox id={`chk-${item}`} />
                        <Label htmlFor={`chk-${item}`}>{item}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>Frequency</Label>
                  <RadioGroup defaultValue="daily" className="space-y-2">
                    {['Daily', 'Weekly', 'Never'].map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <RadioGroupItem value={item.toLowerCase()} id={`radio-${item}`} />
                        <Label htmlFor={`radio-${item}`}>{item}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="flex items-center gap-3">
                  <Switch id="marketing" />
                  <Label htmlFor="marketing">Marketing emails</Label>
                </div>
              </div>
            </div>
          </Section>

          <Separator />

          {/* Card */}
          <Section title="Card">
            <div className="grid sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription</CardTitle>
                  <CardDescription>Your plan renews on 1 Dec 2026.</CardDescription>
                  <CardAction>
                    <Badge variant="secondary">Pro</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <Progress value={68} />
                  <p className="mt-2 text-xs text-muted-foreground">68 of 100 seats used</p>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button size="sm">Upgrade</Button>
                  <Button size="sm" variant="ghost">Manage</Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Team</CardTitle>
                  <CardDescription>4 members with access.</CardDescription>
                </CardHeader>
                <CardContent>
                  <AvatarGroup>
                    {['AF', 'BK', 'CL', 'DM'].map((initials) => (
                      <Avatar key={initials}>
                        <AvatarImage src="" />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                    ))}
                    <AvatarGroupCount>+2</AvatarGroupCount>
                  </AvatarGroup>
                </CardContent>
                <CardFooter>
                  <Button size="sm" variant="outline"><Plus />Invite</Button>
                </CardFooter>
              </Card>
            </div>
          </Section>

          <Separator />

          {/* Alert */}
          <Section title="Alert">
            <div className="space-y-3">
              <Alert>
                <Info />
                <AlertTitle>Heads up</AlertTitle>
                <AlertDescription>Your trial ends in 3 days. Upgrade to keep access.</AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <Trash2 />
                <AlertTitle>Destructive action</AlertTitle>
                <AlertDescription>This cannot be undone. All data will be permanently removed.</AlertDescription>
              </Alert>
            </div>
          </Section>

          <Separator />

          {/* Tabs */}
          <Section title="Tabs">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Overview content goes here.</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="analytics">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Analytics content goes here.</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="settings">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Settings content goes here.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </Section>

          <Separator />

          {/* Skeleton + Avatar + Tooltip + Dialog */}
          <Section title="Misc">
            <div className="flex flex-wrap items-start gap-8">

              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-3">Skeleton</p>
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-3">Avatar</p>
                <div className="flex items-center gap-2">
                  <Avatar size="sm"><AvatarFallback>SM</AvatarFallback></Avatar>
                  <Avatar><AvatarFallback>MD</AvatarFallback></Avatar>
                  <Avatar size="lg"><AvatarFallback>LG</AvatarFallback></Avatar>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-3">Tooltip</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon"><Info /></Button>
                  </TooltipTrigger>
                  <TooltipContent>Helpful context lives here</TooltipContent>
                </Tooltip>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-3">Dialog</p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Open dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm deletion</DialogTitle>
                      <DialogDescription>This action is permanent and cannot be reversed.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="ghost">Cancel</Button>
                      <Button variant="destructive">Delete</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

            </div>
          </Section>

        </div>
      </div>
    </TooltipProvider>
  )
}

export default App
