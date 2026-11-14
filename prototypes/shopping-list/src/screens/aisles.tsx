import { XIcon } from "lucide-react"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { CountBox } from "@/components/ui/count-box"
import { FilterChips } from "@/components/ui/filter-chips"
import { ListRow, ListRowText } from "@/components/ui/list-row"
import { matchesFilter, nameList, plural } from "../model"
import { goBack, Redirect } from "../router"
import { useApp } from "../state"
import { Eyebrow, HeaderButton } from "../layout"

/** The aisle list, as a bottom drawer over the shop screen. Swipe down or tap outside to close. */
export function AislesDrawer({ open }: { open: boolean }) {
  const { state, sessionStore } = useApp()
  const ready = !!state.session && !!sessionStore
  const close = () => goBack({ name: "shop" })
  return (
    <>
      {open && !ready && <Redirect to={{ name: "home" }} />}
      <Drawer open={open && ready} onOpenChange={(next) => !next && close()}>
        <DrawerContent className="mx-auto max-w-[430px] data-[vaul-drawer-direction=bottom]:max-h-[90dvh]">
          {ready && <AislesContent close={close} />}
        </DrawerContent>
      </Drawer>
    </>
  )
}

function AislesContent({ close }: { close: () => void }) {
  const { state, actions, sessionStore, aisles } = useApp()
  const session = state.session!

  const open = aisles.flatMap((a) => a.items).filter((li) => li.remaining > 0)
  const skipped = open.filter((li) => li.skipped).length
  const left = open.filter((li) => !li.skipped)
  const aislesLeft = aisles.filter((a) => a.items.some((li) => li.remaining > 0 && !li.skipped)).length

  const allCurrent = session.aisleIndex < 0
  const allTodo = left.filter((li) => matchesFilter(li.stock, state.filter))

  return (
    <>
      <DrawerHeader className="gap-3.5 border-b border-border px-5 pt-4 pb-5 text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
        <div className="flex items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <Eyebrow>{skipped ? `${sessionStore!.name} · ${skipped} skipped` : sessionStore!.name}</Eyebrow>
            <DrawerTitle className="text-3xl leading-none tracking-[0.04em]">Aisles</DrawerTitle>
            <DrawerDescription className="mt-0">
              <strong className="font-semibold text-foreground">{left.length}</strong>{" "}
              {left.length === 1 ? "item" : "items"} left in {plural(aislesLeft, "aisle")}
            </DrawerDescription>
          </div>
          <HeaderButton icon={XIcon} label="Close aisles" onClick={close} />
        </div>
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
      </DrawerHeader>
      <div className="flex flex-col overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
      <nav aria-label="Aisles">
        <ListRow asChild tone={allCurrent ? "current" : "default"} size={allCurrent ? "lg" : "default"}>
          <button
            type="button"
            aria-current={allCurrent ? "page" : undefined}
            onClick={() => {
              actions.setAisle(-1)
              close()
            }}
          >
            <span className="w-6 shrink-0" aria-hidden="true" />
            <ListRowText
              title="All items"
              description={allCurrent ? `${allTodo.length} left` : "Every aisle in one list"}
              descriptionClassName={allCurrent ? "text-[10px] font-semibold tracking-widest uppercase" : undefined}
            />
            <CountBox variant="default">{allTodo.length}</CountBox>
          </button>
        </ListRow>
        {aisles.map((aisle, i) => {
          const current = !allCurrent && i === Math.min(session.aisleIndex, aisles.length - 1)
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
                  close()
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
      </div>
    </>
  )
}
