import * as React from "react"
import { WifiOffIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChoiceRow } from "@/components/ui/choice-row"
import { CountBox } from "@/components/ui/count-box"
import { ListRow, ListRowText } from "@/components/ui/list-row"
import {
  aislesOf, formatTime, incomingChanges, needOf, plural, unitText,
  type Change, type Item, type State,
} from "../model"
import { readRemote } from "../mock-pantry"
import { goBack, navigate, Redirect } from "../router"
import { useApp } from "../state"
import { HeaderButton, MenuButton, Note, Screen, SectionHeading, SplitButton, SyncIcon } from "../layout"

const listRoute = (s: State) => ({ name: s.session && !s.session.finished ? "shop" : "home" }) as const

function withUnit(c: Change, n: number) {
  return c.item.unit ? unitText(c.item, n)! : String(n)
}

/** Why an item is on the list, in the words the pantry app uses. */
function entryText(item: Item) {
  const e = item.entries?.[0]
  if (!e) return null
  if (e.source.kind === "claude") return "Added by Claude"
  if (e.source.kind === "recipe") return `For ${e.source.recipe} · you chose Want to cook`
  return "Added by hand"
}

function ChangeRow({ change, aisle, clash }: { change: Change; aisle?: number | null; clash?: boolean }) {
  const { state } = useApp()
  const { item, kind, from, to } = change
  const toGet = needOf(item, state.baseline)
  const prefix = aisle ? `Aisle ${aisle} · ` : ""
  const description =
    kind === "new" || kind === "list"
      ? [entryText(item) ?? "New item", `${toGet} to get`].join(" · ")
      : kind === "target"
        ? `Minimum ${from} → ${withUnit(change, to!)}`
        : kind === "stock"
          ? `${prefix}${prefix ? "in" : "In"} stock ${from} → ${withUnit(change, to!)}`
          : "Details changed"
  const full = clash ? `${description} · also changed here` : description
  const value = kind === "stock" && from !== undefined && to !== undefined
    ? `${to - from > 0 ? "+" : ""}${to - from}`
    : toGet
  return (
    <ListRow className="min-h-18">
      <ListRowText title={item.name} titleSize="md" description={full} />
      <CountBox size="wide" className="h-13">{value}</CountBox>
    </ListRow>
  )
}

/** SYNC-01: what will go to your pantry and what will come back. */
export function SyncReview() {
  const { state, actions, store, outgoing } = useApp()
  const offline = state.simulateOffline || !navigator.onLine
  const incoming = React.useMemo(() => (offline ? [] : incomingChanges(readRemote(), state.baseline)), [offline, state.baseline])
  // An item changed both here and in the pantry app counts once.
  const total = new Set([...outgoing, ...incoming].map((c) => c.item.id)).size
  const both = new Set(outgoing.map((c) => c.item.id))

  return (
    <Screen
      eyebrow={`${store ? `${store.name} · ` : ""}last synced ${formatTime(state.lastSyncedAt)}`}
      title="Sync"
      action={<HeaderButton icon={XIcon} label="Close" onClick={() => goBack(listRoute(state))} />}
      footer={
        <>
          <SplitButton
            icon={SyncIcon}
            label="Sync now"
            detail={total ? plural(total, "change") : undefined}
            disabled={!!state.sync}
            onClick={actions.startSync}
          />
          <div className="flex gap-2.5">
            <Button variant="outline" size="lg" className="flex-1 border-primary" onClick={() => navigate(listRoute(state))}>
              Back to list
            </Button>
            <MenuButton />
          </div>
        </>
      }
    >
      <Note className="pb-0">Check what will change. Nothing is sent until you tap Sync now.</Note>
      <SectionHeading direction="up" count={plural(outgoing.length, "item")}>Going to your pantry</SectionHeading>
      {outgoing.length ? outgoing.map((c) => <ChangeRow key={c.item.id} change={c} />) : <Note>Nothing to send.</Note>}
      <SectionHeading direction="down" count={offline ? undefined : plural(incoming.length, "item")}>Coming from your pantry</SectionHeading>
      {offline ? (
        <Note>Can't check your pantry without signal.</Note>
      ) : incoming.length ? (
        incoming.map((c) => <ChangeRow key={c.item.id} change={c} clash={both.has(c.item.id)} />)
      ) : (
        <Note>Nothing new in your pantry.</Note>
      )}
    </Screen>
  )
}

/** SYNC-02: the same item changed here and in the pantry app. Two choices. */
export function SyncConflict() {
  const { state } = useApp()
  const sync = state.sync
  const id = sync?.conflicts.find((c) => !(c in sync.resolutions))
  if (!sync || !id) return <Redirect to={listRoute(state)} />
  // Keyed so the choice resets for each item.
  return <ConflictChoice key={id} id={id} />
}

function ConflictChoice({ id }: { id: string }) {
  const { state, actions } = useApp()
  const sync = state.sync!
  const [choice, setChoice] = React.useState<"phone" | "pantry">("phone")

  const remoteItems = readRemote()
  const remote = remoteItems[id]
  const local = sync.snapshot[id]
  const base = state.baseline[id]
  const bought = local.inStock - base.inStock
  const values = { phone: local.inStock, pantry: remote.inStock }
  // Conflicts count once, not as both a change going out and one coming in.
  const others = sync.outgoing + incomingChanges(remoteItems, state.baseline).length - sync.conflicts.length - 1
  const more = sync.conflicts.filter((c) => !(c in sync.resolutions)).length - 1

  const decideLater = () => {
    actions.cancelSync()
    navigate(listRoute(state), { replace: true })
  }

  return (
    <Screen
      eyebrow={`Sync paused · ${sync.conflicts.length - Object.keys(sync.resolutions).length} to check`}
      title={local.name}
      action={<HeaderButton icon={XIcon} label="Close and decide later" onClick={decideLater} />}
      footer={
        <>
          <SplitButton
            icon={SyncIcon}
            label={`Use ${values[choice]} and ${more ? "next" : "finish sync"}`}
            onClick={() => {
              actions.resolveConflict(id, values[choice])
              if (!more) navigate(listRoute(state), { replace: true })
            }}
          />
          <div className="flex gap-2.5">
            <Button variant="outline" size="lg" className="flex-1 border-primary" onClick={decideLater}>
              Decide later
            </Button>
            <MenuButton />
          </div>
        </>
      }
    >
      <Note className="border-b border-border">
        You bought {bought} here, and the stock was also changed in the pantry app since your last sync. Which change do you want to keep?
      </Note>
      <div role="radiogroup" aria-label="Which change do you want to keep?">
        <ChoiceRow
          label="This phone"
          value={`${values.phone} in stock`}
          description={`Was ${base.inStock}, you bought ${bought} today`}
          selected={choice === "phone"}
          onClick={() => setChoice("phone")}
        />
        <ChoiceRow
          label="Pantry app"
          value={`${values.pantry} in stock`}
          description={remote.editedAt ? `Changed in the pantry app today, ${formatTime(remote.editedAt)}` : "Changed in the pantry app"}
          selected={choice === "pantry"}
          onClick={() => setChoice("pantry")}
        />
      </div>
      {others > 0 && <Note>The other {plural(others, "change")} are ready to go once you choose.</Note>}
    </Screen>
  )
}

/** SYNC-04: couldn't reach your pantry. */
export function SyncOffline() {
  const { state, actions, store, outgoing } = useApp()
  const aisleOf = (categoryId: string) => {
    if (!store) return null
    return aislesOf(store, state.categories).find((a) => a.categoryIds.includes(categoryId))?.number ?? null
  }

  return (
    <Screen
      eyebrow={`Sync · last synced ${formatTime(state.lastSyncedAt)}`}
      title="No signal"
      action={<HeaderButton icon={XIcon} label="Close" onClick={() => navigate(listRoute(state), { replace: true })} />}
      footer={
        <>
          <Button size="lg" onClick={() => navigate(listRoute(state), { replace: true })}>
            Keep shopping
          </Button>
          <div className="flex gap-2.5">
            <Button variant="outline" size="lg" className="flex-1 border-primary" onClick={actions.startSync}>
              <SyncIcon className="size-4" />
              Try again
            </Button>
            <MenuButton />
          </div>
        </>
      }
    >
      <div className="flex items-start gap-4 p-5">
        <span className="flex size-14 shrink-0 items-center justify-center border border-ring" aria-hidden="true">
          <WifiOffIcon className="size-7" />
        </span>
        <p className="text-[17px] leading-6">
          Couldn't reach your pantry.{" "}
          {outgoing.length
            ? `Your ${plural(outgoing.length, "change")} ${outgoing.length === 1 ? "is" : "are"} saved on this phone, so nothing is lost.`
            : "Nothing is waiting to send."}{" "}
          Sync again when you're back in signal.
        </p>
      </div>
      {outgoing.length > 0 && (
        <>
          <SectionHeading direction="up" count={plural(outgoing.length, "item")}>Waiting to sync</SectionHeading>
          {outgoing.map((c) => (
            <ChangeRow key={c.item.id} change={c} aisle={aisleOf(c.item.categoryId)} />
          ))}
        </>
      )}
    </Screen>
  )
}
