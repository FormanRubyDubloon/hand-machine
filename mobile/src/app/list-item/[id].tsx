// The item sheet (full screen, always dark), Isaac's design of 27 Nov 2026: the aisle and tags, the name, a panel with
// how many to get (− and +) over a Got all pill, Skip and Edit (to the item in the Pantry tab), and Remove from
// list. Stock, minimum, note and aisle field went; the item's pantry page has them.
import { router, useLocalSearchParams } from "expo-router"
import { Check, Minus, PenLine, Plus, SkipForward, Undo2 } from "lucide-react-native"
import * as React from "react"
import { Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { aisleTitle, itemAisle, tagsOf } from "../../../../prototypes/pantry-app/src/model"
import { useStore } from "../../data/store"
import { removeFromList, removeQuestion, restoreTicks, setToGet, skip, tickAll, untick } from "../../logic/actions"
import { asksForAisle, gotPopupText, rowsOf } from "../../logic/list"
import { Button, Press } from "../../ui/kit"
import { font, radius, useColours } from "../../ui/theme"

export default function ListItemSheet() {
  const { focus } = useColours()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { state, change, local, say } = useStore()
  const insets = useSafeAreaInsets()
  const row = rowsOf(state).find((r) => r.id === id)
  const item = state.items[id]
  const [asking, setAsking] = React.useState(false)

  if (!item || !row) {
    return (
      <View style={{ flex: 1, backgroundColor: focus.bg, paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
        <Text style={{ fontFamily: font.regular, fontSize: 17, color: focus.ink }}>This isn't on the list any more.</Text>
        <Button kind="gold" label="Done" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </View>
    )
  }

  const store = state.stores.find((s) => s.id === state.storeId) ?? state.stores[0]
  const aisle = itemAisle(item, store)
  const tags = tagsOf(item).map((t) => state.categories.find((k) => k.id === t)?.name).filter(Boolean)
  // The aisle in this store, then its tags. A store with no aisle numbers shows only the tags.
  const where = [store?.noAisleNumbers ? null : aisleTitle(aisle), ...tags].filter(Boolean).join(" · ")
  const notInPantry = !!row.isNew && item.inStock - row.got <= 0

  const close = () => router.back()
  const minToGet = Math.max(1, row.got + 1)
  const setNeed = (n: number) => {
    if (n < minToGet) return
    change((s) => setToGet(s, id, n - row.got), { title: `${item.name} on the list: ${n}`, key: `toget:${id}` })
  }
  // To the item in the Pantry tab, for anything this sheet doesn't change (location, use-by, notes, store).
  const editInPantry = () => {
    router.back()
    router.navigate({ pathname: "/pantry/item/[id]", params: { id } })
  }
  // Not this time: off the list while you shop here, still to buy. Only on this phone, so it isn't in History.
  const skipThis = () => {
    local((s) => skip(s, id))
    router.back()
    say(`Skipped ${item.name.toLowerCase()}`, () => local((s) => skip(s, id, false)), "skip")
  }
  const gotAll = () => {
    if (row.done) {
      change((s) => untick(s, id), { title: `Took ${item.name.toLowerCase()} off what you got`, key: `shop:${id}` })
      return
    }
    const before = row.got
    change((s) => tickAll(s, id), { title: `Got ${item.name.toLowerCase()} on the phone`, key: `shop:${id}` })
    // No aisle here yet: ask, as ticking it on the list does (Isaac's change, 24 Nov 2026). The aisle sheet takes this
    // one's place and has its own Undo for the tick-off, so there's no toast.
    if (asksForAisle(state, item)) {
      router.replace({ pathname: "/aisle", params: { id, from: "tick", got: String(before) } })
      return
    }
    router.back()
    say(gotPopupText(row), () => change((s) => restoreTicks(s, id, before), { title: `Took ${item.name.toLowerCase()} off what you got`, key: `shop:${id}` }), "got")
  }

  return (
    <View style={{ flex: 1, backgroundColor: focus.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: focus.place }}>{where}</Text>
        <Press fade onPress={close} accessibilityLabel="Done" style={{ minHeight: 44, minWidth: 64, alignItems: "flex-end", justifyContent: "center" }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 16, color: focus.gold }}>Done</Text>
        </Press>
      </View>
      <Text accessibilityRole="header" style={{ marginTop: 24, marginHorizontal: 20, textAlign: "center", fontFamily: font.serif, fontWeight: "700", fontSize: 38, lineHeight: 42, color: focus.ink }}>{item.name}</Text>

      {/* How many to get, then Got all, in one panel (Isaac's design, 27 Nov 2026). */}
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}>
        <View style={{ backgroundColor: focus.field, borderRadius: 40, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20, gap: 12 }}>
          <Text style={{ textAlign: "center", fontFamily: font.semibold, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: focus.label }}>In the basket</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 }}>
            <Round label="One fewer in the basket" disabled={row.need <= minToGet} onPress={() => setNeed(row.need - 1)}>
              <Minus size={24} color={focus.ink} />
            </Round>
            <Text accessibilityLabel={`${row.need} in the basket`} accessibilityLiveRegion="polite" style={{ fontFamily: font.serif, fontWeight: "700", fontSize: 52, lineHeight: 60, color: focus.ink }}>{row.need}</Text>
            <Round label="One more in the basket" onPress={() => setNeed(row.need + 1)}>
              <Plus size={24} color={focus.ink} />
            </Round>
          </View>
          <Press
            onPress={gotAll}
            tint={focus.press}
            accessibilityLabel={row.done ? `Not got ${item.name}` : `Got all ${row.need}`}
            style={{ marginTop: 12, minHeight: 76, borderRadius: 38, borderWidth: 2, borderColor: focus.gold, backgroundColor: row.done ? "transparent" : focus.gold, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }}
          >
            {row.done ? <Undo2 size={24} color={focus.gold} strokeWidth={2.5} /> : <Check size={26} color={focus.onGold} strokeWidth={3} />}
            <Text style={{ fontFamily: font.semibold, fontSize: 18, letterSpacing: 1, textTransform: "uppercase", color: row.done ? focus.gold : focus.onGold }}>{row.done ? "Not got it" : "Got all"}</Text>
          </Press>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 16, gap: 12 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {!row.done && <Button kind="goldOutline" height={64} label="Skip" icon={<SkipForward size={20} color={focus.ink} />} textColour={focus.ink} accessibilityLabel={`Skip ${item.name} this shop. It stays on your list`} onPress={skipThis} style={{ flex: 1 }} />}
          {!notInPantry && !item.oneOff && <Button kind="goldOutline" height={64} label="Edit" icon={<PenLine size={20} color={focus.ink} />} textColour={focus.ink} accessibilityLabel={`Edit ${item.name} in the pantry`} onPress={editInPantry} style={{ flex: 1 }} />}
        </View>
        {asking ? (
          // Asks first, in place: says what removing will do, then Remove or Keep it.
          <View accessibilityLiveRegion="polite" style={{ gap: 12, paddingTop: 4 }}>
            <Text style={{ fontFamily: font.regular, fontSize: 16, lineHeight: 22, color: focus.ink }}>{removeQuestion(state, id)}</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button kind="goldOutline" label="Keep it" style={{ flex: 1 }} onPress={() => setAsking(false)} />
              <Press
                onPress={() => {
                  change((s) => removeFromList(s, id), { title: `Took ${item.name} off the shopping list` })
                  router.back()
                  say(`Took ${item.name.toLowerCase()} off the list.`)
                }}
                tint={focus.press}
                style={{ flex: 1, minHeight: 56, borderRadius: radius.base, backgroundColor: focus.danger, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ fontFamily: font.semibold, fontSize: 15, letterSpacing: 0.9, textTransform: "uppercase", color: focus.onGold }}>Remove</Text>
              </Press>
            </View>
          </View>
        ) : (
          <Press fade onPress={() => setAsking(true)} style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: font.regular, fontSize: 16, textDecorationLine: "underline", color: focus.danger }}>Remove from list</Text>
          </Press>
        )}
      </View>
    </View>
  )
}

function Round({ label, onPress, disabled, children }: { label: string; onPress: () => void; disabled?: boolean; children: React.ReactNode }) {
  const { focus } = useColours()
  return (
    <Press
      fade
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: focus.gold, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.4 : 1 }}
    >
      {children}
    </Press>
  )
}
