import { XIcon } from "lucide-react"
import { CountBox } from "@/components/ui/count-box"
import { FilterChips } from "@/components/ui/filter-chips"
import { ListRow, ListRowText } from "@/components/ui/list-row"
import { matchesFilter, nameList, plural } from "../model"
import { navigate, Redirect } from "../router"
import { useApp } from "../state"
import { HeaderButton, Screen } from "../layout"

export function Aisles() {
  const { state, actions, sessionStore, aisles } = useApp()
  const session = state.session
  if (!session || !sessionStore) {
    return <Redirect to={{ name: "home" }} />
  }

  const open = aisles.flatMap((a) => a.items).filter((li) => li.remaining > 0)
  const skipped = open.filter((li) => li.skipped).length
  const left = open.filter((li) => !li.skipped)
  const aislesLeft = aisles.filter((a) => a.items.some((li) => li.remaining > 0 && !li.skipped)).length

  return (
    <Screen
      eyebrow={skipped ? `${sessionStore.name} · ${skipped} skipped` : sessionStore.name}
      title="Aisles"
      subtitle={
        <>
          <strong className="font-semibold text-foreground">{left.length}</strong>{" "}
          {left.length === 1 ? "item" : "items"} left in {plural(aislesLeft, "aisle")}
        </>
      }
      action={<HeaderButton icon={XIcon} label="Close aisles" onClick={() => navigate({ name: "shop" }, { replace: true })} />}
      below={
        <FilterChips
          aria-label="Filter by stock"
          value={state.filter}
          onValueChange={actions.setFilter}
          options={[
            { value: "all", label: "All", count: left.length },
            { value: "out", label: "Out", count: left.filter((li) => li.stock === "out").length },
            { value: "low", label: "Low", count: left.filter((li) => li.stock === "low").length },
          ]}
        />
      }
    >
      <nav aria-label="Aisles">
        {aisles.map((aisle, i) => {
          const current = i === Math.min(session.aisleIndex, aisles.length - 1)
          const todo = aisle.items.filter((li) => li.remaining > 0 && !li.skipped && matchesFilter(li.stock, state.filter))
          const skippedHere = aisle.items.filter((li) => li.skipped).length
          const done = aisle.items.every((li) => li.remaining === 0 || li.skipped)
          const box = done ? (skippedHere ? "skipped" : "done") : "default"
          return (
            <ListRow key={aisle.number} asChild tone={current ? "current" : "default"} size={current ? "lg" : "default"}>
              <button
                type="button"
                aria-current={current ? "page" : undefined}
                onClick={() => {
                  actions.setAisle(i)
                  navigate({ name: "shop" }, { replace: true })
                }}
              >
                <span className="w-6 shrink-0 text-sm font-semibold text-muted-foreground group-data-[tone=current]/list-row:text-primary-foreground/70">
                  {aisle.number}
                </span>
                <ListRowText
                  title={aisle.name}
                  titleClassName={done && !current ? "text-muted-foreground line-through" : undefined}
                  description={
                    current
                      ? `${todo.length} left${skippedHere ? ` · ${skippedHere} skipped` : ""}`
                      : done
                        ? skippedHere ? `Done · ${skippedHere} skipped` : "Done"
                        : nameList(todo.map((li) => li.item.name)) || "Nothing matching"
                  }
                  descriptionClassName={current ? "text-[10px] font-semibold tracking-widest uppercase" : undefined}
                />
                <CountBox variant={box}>
                  {todo.length}
                </CountBox>
              </button>
            </ListRow>
          )
        })}
      </nav>
    </Screen>
  )
}
