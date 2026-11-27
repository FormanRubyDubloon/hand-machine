// A pantry item: its stock said plainly, then In stock and Minimum to keep as two matching steppers (Isaac's
// change, 24 Nov 2026: they replace Used one, Used all, Add one and Add to the list), then its use-by date,
// location, aisle, store and notes. The Used in list of recipes was removed at the same time.
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker"
import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Platform, ScrollView, Text, View } from "react-native"
import { aisleTitle, isBulk, isStaple, itemAisle, shortfall, locationLabel, tagsOf, type Location } from "../../../../../../prototypes/pantry-app/src/model"
import { useStore } from "../../../../data/store"
import { acceptGuesses, guessFor, guessReason } from "../../../../logic/aisle-guesses"
import { addOne, approve, openOne, setOpenLow, setLocation, setMin, setNotes, setStore, setUseBy, usedOne } from "../../../../logic/actions"
import { stockStatus, expiryText } from "../../../../logic/phrases"
import { AisleField, BackLink, Body, Button, Caption, Chip, Display, Field, InfoBox, Label, Picker, Press, Stepper, Toggle } from "../../../../ui/kit"
import { LOCATIONS } from "../../../../ui/locations"
import { TagMark } from "../../../../ui/tags"
import { font, radius, space, useColours } from "../../../../ui/theme"

/** The store dropdown's "Any store", which is no store id. */
const ANY = "__any"

export default function PantryItem() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { state, change, say } = useStore()
  const c = useColours()
  const item = state.items[id]
  const [notes, setNotesText] = React.useState(item?.notes ?? "")
  if (!item) {
    return (
      <View style={{ flex: 1, padding: space.screen, gap: 12 }}>
        <BackLink label="Back" onPress={() => router.back()} />
        <Caption>This item isn't in your pantry any more.</Caption>
      </View>
    )
  }
  const name = item.name.toLowerCase()
  const store = state.stores.find((s) => s.id === state.storeId) ?? state.stores[0]
  const aisle = itemAisle(item, store)
  // No aisle here yet: the guess from its tags, if there's a clear one (27 Nov 2026). Shown under the aisle field, and
  // "Looks right, save it" on a new item takes it, since the New box calls its aisle a guess.
  const guess = store && aisle === null ? guessFor(state, store, item) : null
  const guessTitle = guess ? aisleTitle(guess.aisle) : ""
  const guessWhy = guess ? guessReason(guess, state.categories.find((k) => k.id === guess.tagId)?.name ?? "tagged") : ""
  const takeGuess = () => {
    if (!guess || !store) return
    change((s) => acceptGuesses(s, [guess]), note(`${item.name}: ${guessTitle.toLowerCase()} at ${store.name}`, `aisle:${store.id}:${id}`))
  }
  const tagList = tagsOf(item).map((t) => state.categories.find((k) => k.id === t)).filter((k): k is NonNullable<typeof k> => !!k)
  const tags = tagList.map((k) => k.name)
  const bulk = isBulk(item)
  const unit = item.unit?.[0] ?? (bulk ? "pack" : "")
  const open = item.open ?? 0
  const date = (item.useBy ?? []).find((d): d is string => !!d) ?? null
  const note = (title: string, key?: string) => ({ title, key })

  // The stepper moves one at a time: up is one bought (an undated unit), down is one used (the soonest date
  // goes first). For Bulk items a pack is the unit, and down finishes a pack.
  const setStock = (n: number) => {
    if (n > item.inStock) change((st) => addOne(st, id), note(bulk ? `Added a ${unit} of ${name}` : `Added 1 ${name}`, `stock:${id}`))
    else if (n < item.inStock) change((st) => usedOne(st, id), note(bulk ? `Finished a ${unit} of ${name}` : `Used 1 ${name}`, `stock:${id}`))
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 6 }}>
        <BackLink label="Back" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: 40, gap: 20 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 6 }}>
          <Label>{[locationLabel(item.location), ...tags].join(" · ")}</Label>
          <Display size={32}>{item.name}</Display>
          {/* The stock's state as the subheading; the count itself is in the In stock stepper (Isaac's change, 24 Nov 2026). */}
          <Text accessibilityLiveRegion="polite" style={{ fontFamily: font.medium, fontSize: 18, lineHeight: 24, color: c.muted }}>{stockStatus(item)}</Text>
        </View>

        {item.review && (
          <InfoBox>
            <Body><Text style={{ fontFamily: font.bold }}>New.</Text> Its aisle and where it lives are guesses. Change them below if they're wrong.</Body>
            <Button label="Looks right, save it" height={48} onPress={() => {
              change((s) => approve(guess ? acceptGuesses(s, [guess]) : s, id), note(`Checked ${name}${guess ? `, ${guessTitle.toLowerCase()} at ${store?.name}` : ""}`))
              say(guess ? `Saved ${name}, in ${guessTitle.toLowerCase()}.` : `Saved ${name}.`)
            }} />
          </InfoBox>
        )}

        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Label>In stock</Label>
              {/* The heading above already says how many in words, so this says what's counted. */}
              <Caption>{[`Counted in ${item.unit?.[1] ?? (bulk ? "packs" : "units")}`, bulk && open ? `${open} open` : ""].filter(Boolean).join(" · ")}</Caption>
            </View>
            <Stepper label="In stock" value={item.inStock} min={0} onChange={setStock} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Label>Minimum to keep</Label>
              <Caption>{isStaple(item) ? "A Staple" : "Not a Staple"}</Caption>
            </View>
            <Stepper label="Minimum to keep" value={item.target} min={0} onChange={(n) => change((st) => setMin(st, id, n), note(`Set the minimum for ${name} to ${n}`, `min:${id}`))} />
          </View>
          {bulk && <Button kind="secondary" height={48} label={`Open a ${unit}`} disabled={open >= item.inStock} onPress={() => change((st) => openOne(st, id), note(`Opened a ${unit} of ${name}`))} />}
          {bulk && open > 0 && (
            <Toggle
              label={`Open ${unit} running low`}
              caption={open < item.inStock ? `You have a full ${unit} to follow it.` : shortfall({ ...item, openLow: undefined }) > 0 ? "It's on the list already, for your minimum." : `With no full ${unit} left, 1 goes on the list.`}
              value={!!item.openLow}
              onChange={(v) => change((st) => setOpenLow(st, id, v), note(v ? `${name}: open ${unit} running low` : `${name}: open ${unit} not running low`))}
            />
          )}
        </View>

        <UseBy
          date={date}
          caption={date ? expiryText(date) : item.noExpiry ? "Doesn't go off" : "No date"}
          onPick={(iso) => change((s) => setUseBy(s, id, iso), note(iso ? `Changed the use-by date of ${name}` : `Cleared the use-by date of ${name}`, `useby:${id}`))}
        />

        <View style={{ gap: 8 }}>
          <Label>Location</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {LOCATIONS.filter((l) => l.value !== "none").map((l) => (
              <Chip key={l.value} label={l.label} on={item.location === l.value} onPress={() => change((s) => setLocation(s, id, l.value as Location), note(`Moved ${name} to the ${l.label.toLowerCase()}`))} />
            ))}
          </View>
        </View>

        {store && !store.noAisleNumbers && (
          <View style={{ gap: 8 }}>
            <AisleField label={`Aisle at ${store.name}`} value={aisle === null ? null : aisleTitle(aisle)} onPress={() => router.push({ pathname: "/aisle", params: { id, from: "edit" } })} />
            {guess && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Caption style={{ flex: 1 }}>Guess: {guessWhy.charAt(0).toLowerCase() + guessWhy.slice(1)}.</Caption>
                <Press fade onPress={takeGuess} accessibilityLabel={`Use ${guessTitle} for ${item.name}`} style={{ minHeight: 44, justifyContent: "center" }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: c.primary }}>Use it</Text>
                </Press>
              </View>
            )}
          </View>
        )}

        {state.stores.length > 1 && (
          <View style={{ gap: 6 }}>
            <Picker
              label="Store"
              value={item.where[0] ?? ANY}
              options={[{ id: ANY, name: "Any store" }, ...state.stores.map((st) => ({ id: st.id, name: st.name }))]}
              onPick={(k) => change((s) => setStore(s, id, k === ANY ? null : k), note(k === ANY ? `${item.name}: any store` : `${item.name}: buy at ${state.stores.find((st) => st.id === k)?.name}`))}
            />
            <Caption>{item.where.length ? "It's only on the list when you shop there." : "On the list wherever you shop."}</Caption>
          </View>
        )}

        {/* Tags are given to items in Collca on the web (Isaac's decision, 24 Nov 2026), so here they're only shown. Below Store (Isaac's change, 24 Nov 2026). */}
        <View style={{ gap: 6 }}>
          <Label>Tags</Label>
          {/* Each tag with its icon in its colour, as on the web (Isaac's change, 24 Nov 2026). */}
          {tagList.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {tagList.map((k) => (
                <View key={k.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 12, minHeight: 32, borderRadius: radius.base, borderWidth: 1, borderColor: c.line, paddingLeft: k.icon || k.colour ? 4 : 12 }}>
                  <TagMark tag={k} size="sm" />
                  <Text style={{ fontFamily: font.medium, fontSize: 15, color: c.ink }}>{k.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Body>No tags</Body>
          )}
          <Caption>Change tags in Collca on the web.</Caption>
        </View>

        <Field
          label="Notes"
          value={notes}
          onChangeText={setNotesText}
          onBlur={() => notes !== (item.notes ?? "") && change((s) => setNotes(s, id, notes), note(`Changed the notes on ${name}`))}
          placeholder="Anything worth remembering"
          multiline
          style={{ minHeight: 72 }}
        />

        <Caption>Changes here go to your pantry by themselves.</Caption>
      </ScrollView>
    </View>
  )
}

/** A date as the local day, "2026-11-20". toISOString would give the UTC day, a day out around midnight. */
const dayOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

/**
 * The use-by date. With no date there's no picker showing today (which read as a date that wasn't set, and
 * couldn't save today): "Add a date" opens the calendar; pick a day and Save. A set date shows as the
 * compact picker, with Clear beside it.
 */
function UseBy({ date, caption, onPick }: { date: string | null; caption: string; onPick: (iso: string | null) => void }) {
  const c = useColours()
  const [picking, setPicking] = React.useState(false)
  const [draft, setDraft] = React.useState(() => new Date())
  const value = date ? new Date(`${date}T12:00:00`) : new Date()
  const pickAndroid = () =>
    DateTimePickerAndroid.open({ value, mode: "date", onChange: (e, d) => e.type === "set" && d && onPick(dayOf(d)) })
  const link = (label: string, onPress: () => void) => (
    <Press fade onPress={onPress} style={{ minHeight: 44, justifyContent: "center" }}>
      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: c.primary }}>{label}</Text>
    </Press>
  )

  if (Platform.OS === "web") {
    return (
      <View style={{ gap: 6 }}>
        <Label>Use by</Label>
        <Field value={date ?? ""} placeholder="YYYY-MM-DD" accessibilityLabel="Use by" onChangeText={(t) => /^\d{4}-\d{2}-\d{2}$/.test(t) && onPick(t)} />
      </View>
    )
  }

  return (
    <View style={{ gap: 6 }}>
      <Label>Use by</Label>
      {date ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 }}>
          {Platform.OS === "ios" ? (
            <DateTimePicker value={value} mode="date" display="compact" accentColor={c.primary} themeVariant={c.isDark ? "dark" : "light"} accessibilityLabel="Use by" onChange={(_, d) => d && onPick(dayOf(d))} style={{ marginLeft: -10 }} />
          ) : (
            link(new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), pickAndroid)
          )}
          <Caption style={{ flex: 1 }}>{caption}</Caption>
          {link("Clear", () => onPick(null))}
        </View>
      ) : picking && Platform.OS === "ios" ? (
        // Picking a day only selects it (iOS sends no change for the day already selected, so today could never
        // be saved by tapping); Save keeps it.
        <View>
          <DateTimePicker value={draft} mode="date" display="inline" accentColor={c.primary} themeVariant={c.isDark ? "dark" : "light"} accessibilityLabel="Use by" onChange={(_, d) => d && setDraft(d)} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 20 }}>
            {link("Cancel", () => setPicking(false))}
            <Button height={44} label={`Save ${draft.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`} onPress={() => { setPicking(false); onPick(dayOf(draft)) }} style={{ paddingHorizontal: 18 }} />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 }}>
          <Button kind="secondary" height={44} label="Add a date" onPress={() => { if (Platform.OS === "ios") { setDraft(new Date()); setPicking(true) } else pickAndroid() }} style={{ paddingHorizontal: 16 }} />
          <Caption style={{ flex: 1 }}>{caption}</Caption>
        </View>
      )}
    </View>
  )
}
