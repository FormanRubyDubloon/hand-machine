import { ChevronRightIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ListRow, ListRowText } from "@/components/ui/list-row"
import { Switch } from "@/components/ui/switch"
import { formatSynced, plural } from "../model"
import { goBack, navigate, type Route } from "../router"
import { useApp } from "../state"
import { Eyebrow, HeaderButton, Screen, SyncIcon } from "../layout"

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

export function Menu() {
  const { state, actions, store, outgoing } = useApp()
  const shopping = state.session && !state.session.finished

  return (
    <Screen
      eyebrow="Shopping list"
      title="Menu"
      action={<HeaderButton icon={XIcon} label="Close menu" onClick={() => goBack({ name: shopping ? "shop" : "home" })} />}
      footer={
        <>
          <span className="text-sm text-muted-foreground">
            {outgoing.length ? `${plural(outgoing.length, "change")} waiting.` : "Nothing waiting to send."} Last
            synced {formatSynced(state.lastSyncedAt)}.
          </span>
          <Button size="lg" disabled={!!state.sync} onClick={() => navigate({ name: "sync" })}>
            <SyncIcon className="size-4" />
            Sync with Notion
          </Button>
        </>
      }
    >
      <nav aria-label="Menu">
        {store && (
          <div className="flex flex-col gap-1.5 border-b border-border px-5 pt-5 pb-4">
            <Eyebrow>Current store</Eyebrow>
            <span className="text-[22px] font-medium">{store.name}</span>
          </div>
        )}
        {shopping && <MenuRow title="Back to the list" description="Carry on where you were" to={{ name: "shop" }} />}
        <MenuRow title="Change store" description="Shop somewhere else, or add a store" to={{ name: "stores" }} />
        {store && (
          <MenuRow
            title="Edit current store"
            description={`Name and aisle numbers for ${store.name}`}
            to={{ name: "edit-store", id: store.id }}
          />
        )}
        {shopping && <MenuRow title="Finish this shop" description="See what's still to get and what you skipped" onClick={actions.finishShop} />}
      </nav>
      <section aria-label="Prototype settings" className="mt-auto flex flex-col gap-3 border-t border-border px-5 py-5">
        <Eyebrow>Prototype only</Eyebrow>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="simulate-offline" className="text-sm font-normal tracking-normal normal-case">
            Pretend there's no signal
          </Label>
          <Switch id="simulate-offline" checked={state.simulateOffline} onCheckedChange={actions.setSimulateOffline} />
        </div>
        <Button variant="ghost" className="-mx-3 self-start" onClick={() => confirm("Reset all demo data, including fake Notion?") && actions.reset()}>
          Reset demo data
        </Button>
      </section>
    </Screen>
  )
}
