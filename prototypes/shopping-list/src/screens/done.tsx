import { Button } from "@/components/ui/button"
import { CountBox } from "@/components/ui/count-box"
import { ListRow, ListRowText } from "@/components/ui/list-row"
import { SegmentBar } from "@/components/ui/segment-bar"
import { SummaryStats } from "@/components/ui/summary-stats"
import { plural, unitText } from "../model"
import { navigate, Redirect } from "../router"
import { useApp } from "../state"
import { MenuButton, Note, Screen, SectionHeading, SplitButton, SyncIcon } from "../layout"

export function Done() {
  const { state, sessionStore, aisles, outgoing } = useApp()
  if (!state.session || !sessionStore) {
    return <Redirect to={{ name: "home" }} />
  }

  const rows = aisles.flatMap((a) => a.items.map((li) => ({ ...li, aisle: a.number })))
  const got = rows.filter((li) => li.state === "got")
  const left = rows.filter((li) => li.remaining > 0 && !li.skipped)
  const skipped = rows.filter((li) => li.skipped)
  const cleared = aisles.filter((a) => a.items.every((li) => li.remaining === 0 || li.skipped)).length

  return (
    <Screen
      top={<SegmentBar total={aisles.length} filled={cleared} aria-label={`${cleared} of ${aisles.length} aisles done`} />}
      eyebrow={
        cleared === aisles.length
          ? `${sessionStore.name} · all ${plural(aisles.length, "aisle")} done`
          : `${sessionStore.name} · ${cleared} of ${plural(aisles.length, "aisle")} done`
      }
      title="Shop done"
      footer={
        <>
          {outgoing.length > 0 ? (
            <SplitButton
              icon={SyncIcon}
              label="Sync pantry"
              detail={plural(outgoing.length, "change")}
              disabled={!!state.sync}
              onClick={() => navigate({ name: "sync" })}
            />
          ) : (
            <Button size="lg" onClick={() => navigate({ name: "home" })}>Back to start</Button>
          )}
          <div className="flex gap-2.5">
            <Button variant="outline" size="lg" className="flex-1 border-primary" onClick={() => navigate({ name: "stores" })}>
              Shop at another store
            </Button>
            <MenuButton />
          </div>
        </>
      }
    >
      <SummaryStats
        stats={[
          { label: "Got", value: got.length },
          { label: "Left", value: left.length },
          { label: "Skipped", value: skipped.length },
        ]}
      />
      {left.length > 0 && (
        <>
          <SectionHeading>Still to get</SectionHeading>
          {left.map((li) => (
            <ListRow key={li.item.id} size="sm">
              <ListRowText
                titleSize="sm"
                title={li.item.name}
                description={`${li.aisle == null ? "No aisle number" : `Aisle ${li.aisle}`} · ${li.got ? `got ${li.got} of ${li.needed}` : unitText(li.item, li.needed) ?? `${li.needed} to get`}`}
              />
              <CountBox size="sm">{li.remaining}</CountBox>
            </ListRow>
          ))}
        </>
      )}
      {skipped.length > 0 && (
        <>
          <SectionHeading>Skipped / not here</SectionHeading>
          {skipped.map((li) => (
            <ListRow key={li.item.id} size="sm" tone="muted">
              <ListRowText
                titleSize="sm"
                title={li.item.name}
                titleClassName="line-through"
                description={`${li.aisle == null ? "No aisle number" : `Aisle ${li.aisle}`} · ${unitText(li.item, li.remaining) ?? `${li.remaining} to get`}`}
                descriptionClassName="text-foreground"
              />
              <CountBox size="sm" variant="skipped" />
            </ListRow>
          ))}
        </>
      )}
      <Note>
        {left.length || skipped.length
          ? "Skipped and unfinished items stay on the list for the next store or the next shop."
          : "You got everything on the list here."}
      </Note>
    </Screen>
  )
}
