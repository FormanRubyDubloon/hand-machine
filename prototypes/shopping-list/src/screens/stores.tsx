import { PlusIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StoreRow } from "@/components/ui/store-row"
import { aislesOf, plural, toGetAt } from "../model"
import { goBack, navigate } from "../router"
import { useApp } from "../state"
import { HeaderButton, Note, Screen } from "../layout"

export function Stores() {
  const { state, actions } = useApp()

  return (
    <Screen
      eyebrow="Where are you shopping?"
      title="Stores"
      action={<HeaderButton icon={XIcon} label="Close" onClick={() => goBack({ name: "home" })} />}
      footer={
        <Button size="lg" onClick={() => navigate({ name: "edit-store", id: null })}>
          <PlusIcon className="size-4" />
          Add store
        </Button>
      }
    >
      <Note className="border-b border-border">Tap a store to shop there. Tap the pencil to change its name or aisle numbers.</Note>
      {state.stores.map((store) => {
        const items = toGetAt(state, store)
        const aisles = aislesOf(store, state.categories).filter((a) =>
          items.some((i) => a.categoryIds.includes(i.categoryId))
        )
        return (
          <StoreRow
            key={store.id}
            name={store.name}
            current={store.id === state.lastStoreId}
            description={
              items.length ? `${plural(items.length, "item")} to get · ${plural(aisles.length, "aisle")}` : "Nothing to get here"
            }
            onSelect={() => actions.startShop(store.id)}
            onEdit={() => navigate({ name: "edit-store", id: store.id })}
          />
        )
      })}
    </Screen>
  )
}
