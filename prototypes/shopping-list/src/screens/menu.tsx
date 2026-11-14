import { ChevronRightIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import { ListRow, ListRowText } from "@/components/ui/list-row"
import { Switch } from "@/components/ui/switch"
import { formatSynced, plural } from "../model"
import { goBack, navigate, type Route } from "../router"
import { useApp } from "../state"
import { Eyebrow, HeaderButton, SyncIcon } from "../layout"

function MenuRow({ title, description, to, onClick }: { title: string; description: string; to?: Route; onClick?: () => void }) {
  return (
    <ListRow asChild className="min-h-19">
      <button type="button" onClick={onClick ?? (() => to && navigate(to))}>
        <ListRowText title={title} titleSize="md" description={description} />
        <ChevronRightIcon className="size-4.5 shrink-0" aria-hidden="true" />
      </button>
    </ListRow>
  )
}

/** The menu, as a bottom drawer over whichever screen you opened it from. Swipe down or tap outside to close. */
export function MenuDrawer({ open }: { open: boolean }) {
  const { state, actions, store, outgoing } = useApp()
  const shopping = state.session && !state.session.finished
  const close = () => goBack({ name: shopping ? "shop" : "home" })

  return (
    <Drawer open={open} onOpenChange={(next) => !next && close()}>
      <DrawerContent className="mx-auto max-w-[430px] data-[vaul-drawer-direction=bottom]:max-h-[90dvh]">
        <DrawerHeader className="flex-row items-end justify-between gap-4 border-b border-border px-5 pt-4 pb-5 text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
          <div className="flex flex-col gap-2">
            <Eyebrow>Shopping list</Eyebrow>
            <DrawerTitle className="text-3xl leading-none tracking-[0.04em]">Menu</DrawerTitle>
            <DrawerDescription className="sr-only">Change store, finish the shop recipes or sync your pantry.</DrawerDescription>
          </div>
          <HeaderButton icon={XIcon} label="Close menu" onClick={close} />
        </DrawerHeader>
        <div className="flex flex-col overflow-y-auto overscroll-contain">
          <nav aria-label="Menu">
            {store && (
              <div className="flex flex-col gap-1.5 border-b border-border px-5 pt-5 pb-4">
                <Eyebrow>Current store</Eyebrow>
                <span className="text-[22px] font-medium">{store.name}</span>
              </div>
            )}
            {shopping && <MenuRow title="Back to the list" description="Carry on where you were" onClick={close} />}
            <MenuRow title="Change store" description="Shop somewhere else, or add a store" to={{ name: "stores" }} />
            {store && (
              <MenuRow
                title="Edit current store"
                description={`Name and aisle numbers for ${store.name}`}
                to={{ name: "edit-store", id: store.id }}
              />
            )}
            <MenuRow
              title="Recipes"
              description={`${state.recipes.filter((r) => r.wantToCook).length} you want to cook, saved on this phone`}
              to={{ name: "recipes" }}
            />
            {shopping && <MenuRow title="Finish this shop" description="See what's still to get and what you skipped" onClick={actions.finishShop} />}
          </nav>
          <section aria-label="Prototype settings" className="flex flex-col gap-3 px-5 py-5">
            <Eyebrow>Prototype only</Eyebrow>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="simulate-offline" className="text-sm font-normal tracking-normal normal-case">
                Pretend there's no signal
              </Label>
              <Switch id="simulate-offline" checked={state.simulateOffline} onCheckedChange={actions.setSimulateOffline} />
            </div>
            <div className="-mx-3 flex gap-1">
              <Button variant="ghost" onClick={actions.signOut}>
                Sign out
              </Button>
              <Button variant="ghost" onClick={() => confirm("Reset all demo data, including the fake pantry?") && actions.reset()}>
                Reset demo data
              </Button>
            </div>
          </section>
        </div>
        <div className="flex shrink-0 flex-col gap-2.5 border-t border-border bg-background px-5 pt-3.5 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
          <span className="text-sm text-muted-foreground">
            {outgoing.length ? `${plural(outgoing.length, "change")} waiting.` : "Nothing waiting to send."} Last
            synced {formatSynced(state.lastSyncedAt)}.
          </span>
          <Button size="lg" disabled={!!state.sync} onClick={() => navigate({ name: "sync" })}>
            <SyncIcon className="size-4" />
            Sync pantry
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
