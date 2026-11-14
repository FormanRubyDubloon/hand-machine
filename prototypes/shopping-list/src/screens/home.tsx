import { MenuIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CountBox } from "@/components/ui/count-box"
import { FilterChips } from "@/components/ui/filter-chips"
import { ListRow, ListRowText } from "@/components/ui/list-row"
import { SummaryStats } from "@/components/ui/summary-stats"
import { formatSynced, matchesFilter, nameList, needOf, stockOf, toGetAt } from "../model"
import { navigate } from "../router"
import { useApp } from "../state"
import { SyncReminder } from "../components"
import { Eyebrow, HeaderButton, Screen, SyncIcon } from "../layout"

const today = () =>
  new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })

export function Home() {
  const { state, actions, outgoing, sessionStore } = useApp()
  const all = Object.values(state.items).filter((i) => needOf(i, state.baseline) > 0)
  const status = (i: (typeof all)[number]) => stockOf(i)
  // HOME-02: the last shop ended and nothing has gone to the pantry yet.
  const unsynced = !!state.session?.finished && outgoing.length > 0

  const stores = [...state.stores].sort((a, b) =>
    a.id === state.lastStoreId ? -1 : b.id === state.lastStoreId ? 1 : 0
  )

  return (
    <Screen
      eyebrow={today()}
      title="Shopping list"
      action={<HeaderButton icon={MenuIcon} label="Menu" onClick={() => navigate({ name: "menu" })} />}
      footer={
        <>
          <span className="text-sm text-muted-foreground">
            Last synced {formatSynced(state.lastSyncedAt)}.{" "}
            {outgoing.length ? `${outgoing.length} waiting to send.` : "Nothing waiting to send."}
          </span>
          <Button
            variant={outgoing.length ? "default" : "outline"}
            size="lg"
            className={outgoing.length ? "" : "border-primary"}
            disabled={!!state.sync}
            onClick={() => (outgoing.length ? navigate({ name: "sync" }) : actions.startSync())}
          >
            <SyncIcon className="size-4" />
            {outgoing.length ? "Sync pantry" : "Get latest"}
          </Button>
        </>
      }
    >
      <SyncReminder
        show={unsynced}
        store={sessionStore?.name ?? "Last shop"}
        changes={outgoing.length}
        onSync={() => navigate({ name: "sync" })}
      />
      <SummaryStats
        aria-label="Summary"
        stats={[
          { label: "To get", value: all.length },
          { label: "Out of stock", value: all.filter((i) => status(i) === "out").length },
          { label: "Want to cook", value: state.recipes.filter((r) => r.wantToCook).length, onClick: () => navigate({ name: "recipes" }) },
        ]}
      />
      <div className="flex items-center justify-between px-5 pt-3">
        <h2>
          <Eyebrow>Where are you shopping?</Eyebrow>
        </h2>
        <Button variant="link" className="-mr-2 h-11 px-2 text-foreground" onClick={() => navigate({ name: "stores" })}>
          Edit stores
        </Button>
      </div>
      <div className="px-5 pt-1 pb-3.5">
        <FilterChips
          aria-label="Filter by stock"
          value={state.filter}
          onValueChange={actions.setFilter}
          options={[
            { value: "all", label: "All", count: all.length },
            { value: "out", label: "Out", count: all.filter((i) => status(i) === "out").length },
            { value: "low", label: "Low", count: all.filter((i) => status(i) === "low").length },
          ]}
        />
      </div>
      <nav aria-label="Stores" className="border-t border-border">
        {stores.map((store) => {
          const items = toGetAt(state, store).filter((i) => matchesFilter(status(i), state.filter))
          const last = store.id === state.lastStoreId
          if (items.length === 0)
            return (
              <ListRow key={store.id} tone="quiet" size="sm">
                <ListRowText title={store.name} titleSize="sm" />
                <span className="text-sm">Nothing to get</span>
              </ListRow>
            )
          return (
            <ListRow key={store.id} asChild tone={last ? "current" : "default"} size={last ? "lg" : "default"}>
              <button type="button" onClick={() => actions.startShop(store.id)}>
                <ListRowText
                  eyebrow={last ? "Last used" : undefined}
                  title={store.name}
                  titleSize={last ? "lg" : "md"}
                  description={nameList(items.map((i) => i.name))}
                />
                <CountBox variant={last ? "inverse" : "default"}>{items.length}</CountBox>
              </button>
            </ListRow>
          )
        })}
      </nav>
    </Screen>
  )
}
