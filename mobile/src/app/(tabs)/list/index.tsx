// LIST: one aisle at a time, in the order you walk the store you're in (PROTO-1 handoff, "List"), or one tag at a
// time (Batch 4, 24 Nov 2026). Tap the count to get one; hold it to get them all; tap the name for the item sheet.
// Swipe sideways, or tap the heading for the Aisles and Tags menu, to move on. "Add item" sits under each heading's
// rows; the button by the heading opens the list filters. Ticking adds to stock straight away and syncs by itself.
// Ticking something with no aisle in this store asks which aisle it was in (the aisle sheet, /aisle).
import * as Haptics from "expo-haptics"
import { router, useFocusEffect } from "expo-router"
import { Check, ChevronDown, ChevronRight, Plus, SkipForward, SlidersHorizontal } from "lucide-react-native"
import * as React from "react"
import { Animated, PanResponder, Platform, RefreshControl, ScrollView, Text, View, useWindowDimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { PhoneState } from "../../../data/state"
import { TOAST_UNDO_MS, useStore } from "../../../data/store"
import { chooseStore, restoreAll, restoreTicks, skipRows, tickAll, tickOne, tickRows, untick, clearShop } from "../../../logic/actions"
import { homeSummary } from "../../../logic/home"
import { asksForAisle, filtersOn, leftOf, refreshShop, rowsOf, shopGroups, shownRows, sortRows, tickedText, whereNext, type Row } from "../../../logic/list"
import { Body, Button, Caption, Display, IconButton, Press } from "../../../ui/kit"
import { ShopDone } from "../../../ui/shop-done"
import { TagMark } from "../../../ui/tags"
import { plural } from "../../../logic/phrases"
import { font, radius, space, useColours, useReduceMotion } from "../../../ui/theme"

/** Bought more than one: how long after the last tap the aisle question waits. */
const ASK_AFTER_MS = 1500

export default function ListScreen() {
  const { state, change, local, say, status, online, pulling, pullToSync } = useStore()
  const c = useColours()
  const { focus } = c
  const insets = useSafeAreaInsets()

  // Keep the shop in step with the items (things added elsewhere join it; untouched rows follow their item).
  React.useEffect(() => {
    const shop = refreshShop(state.shop, state.items)
    if (shop !== state.shop) local((s) => ({ ...s, shop }))
  }, [state.shop, state.items, local])

  const store = state.stores.find((s) => s.id === state.storeId) ?? state.stores[0]
  const aisles = shopGroups(state)
  const all = state.aisle === "all"
  const at = all ? 0 : Math.min(Math.max(0, state.aisle as number), Math.max(0, aisles.length - 1))
  const aisle = aisles[at]
  // Everything on the list decides "empty" and "shop done"; what the filters let through is what's shown.
  const allRows = rowsOf(state)
  const rows = shownRows(state)
  const totalLeft = leftOf(rows)
  const empty = allRows.length === 0
  // Skipped rows still need buying, but not in this shop, so they don't keep it from being done.
  const skipped = allRows.filter((r) => r.skipped)
  const shopDone = !empty && allRows.every((r) => r.done || r.ordered || r.skipped)
  const filtered = filtersOn(state.filter)
  const noMatch = !empty && rows.length === 0 && skipped.length < allRows.length

  const go = React.useCallback((i: number | "all") => local((s) => ({ ...s, aisle: i })), [local])

  // Setting an item's aisle moves it to another heading, which can shift the headings along. Stay on the one you
  // were looking at.
  // Only when the headings change under you: moving yourself (swipe, menu, Done here) just remembers the new one.
  const last = React.useRef<{ aisle: PhoneState["aisle"]; key?: string }>({ aisle: state.aisle })
  React.useEffect(() => {
    const was = last.current
    if (!all && was.aisle === state.aisle && was.key && aisles[at]?.key !== was.key) {
      const j = aisles.findIndex((g) => g.key === was.key)
      if (j >= 0 && j !== at) return go(j)
    }
    last.current = { aisle: state.aisle, key: all ? undefined : aisles[at]?.key }
  })

  // ----- ticking -----
  // Every tick shows a toast with Undo. Taps in a row on one item while its toast is up share the toast, and
  // Undo puts back all of them (the same run is one History entry too).
  const run = React.useRef<{ id: string; before: number; at: number } | null>(null)
  // The last run of ticks, for Shop done's Undo last tick (kept while the list is open, not saved).
  // `restore` puts it back: one item's ticks, or everything a Got all ticked.
  const lastTick = React.useRef<{ ids: string[]; name: string; restore: (s: PhoneState) => PhoneState } | null>(null)
  const ticked = (r: Row, got: number) => {
    const last = run.current
    const before = last && last.id === r.id && Date.now() - last.at < TOAST_UNDO_MS ? last.before : r.got
    run.current = { id: r.id, before, at: Date.now() }
    lastTick.current = { ids: [r.id], name: r.item.name, restore: (s) => restoreTicks(s, r.id, before) }
    const title = `Took ${r.item.name.toLowerCase()} off what you got`
    say(tickedText({ ...r, got: before }, got), () => {
      run.current = null
      lastTick.current = null
      change((s) => restoreTicks(s, r.id, before), { title, key: `shop:${r.id}` })
    })
  }
  // Asking for the aisle (Batch 4). Bought more than one: it waits until you've stopped tapping. Skipped, it
  // doesn't ask again for that item until the next time the list opens.
  const asked = React.useRef(new Set<string>())
  const waiting = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelAsk = React.useCallback(() => {
    if (waiting.current) clearTimeout(waiting.current)
    waiting.current = null
  }, [])
  useFocusEffect(React.useCallback(() => cancelAsk, [cancelAsk]))
  const askAisle = (r: Row, wait: boolean) => {
    cancelAsk()
    if (asked.current.has(r.id) || !asksForAisle(state, r.item)) return
    waiting.current = setTimeout(() => {
      waiting.current = null
      asked.current.add(r.id)
      // The sheet covers the tick's toast, so it carries what was got before this run of taps, for its own Undo.
      const got = run.current?.id === r.id ? run.current.before : r.got
      router.push({ pathname: "/aisle", params: { id: r.id, from: "tick", got: String(got) } })
    }, wait ? ASK_AFTER_MS : 350)
  }
  const tick = (r: Row) => {
    if (r.done) {
      cancelAsk()
      run.current = null
      lastTick.current = null
      change((s) => untick(s, r.id), { title: `Took ${r.item.name.toLowerCase()} off what you got`, key: `shop:${r.id}` })
      return
    }
    void Haptics.selectionAsync().catch(() => {})
    change((s) => tickOne(s, r.id), { title: `Got ${r.item.name.toLowerCase()} on the phone`, key: `shop:${r.id}` })
    ticked(r, r.got + 1)
    askAisle(r, r.need > 1 && r.got + 1 < r.need)
  }
  const tickRest = (r: Row) => {
    if (r.done) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    change((s) => tickAll(s, r.id), { title: `Got ${r.item.name.toLowerCase()} on the phone`, key: `shop:${r.id}` })
    ticked(r, r.need)
    askAisle(r, false)
  }

  // Got all (26 Nov 2026): ticks off everything still to get on screen (this heading, or All items), as holding
  // each one would. Ordered items are left alone. One toast and one History entry; Undo puts each row back. It
  // doesn't ask for aisles.
  const onScreen = all ? rows : (aisle?.rows ?? [])
  const toGet = onScreen.filter((r) => !r.done && !r.ordered && !r.skipped)
  const gotAll = () => {
    if (!toGet.length) return
    cancelAsk()
    run.current = null
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    const ids = toGet.map((r) => r.id)
    const where = all || !aisle ? "the list" : aisle.title
    const name = toGet.length === 1 ? toGet[0].item.name : plural(toGet.length, "thing")
    let before: Record<string, number> = {}
    change((s) => {
      const r = tickRows(s, ids)
      before = r.before
      return r.state
    }, { title: `Got everything left in ${where} on the phone`, detail: toGet.map((r) => r.item.name).join(", ") })
    const restore = (s: PhoneState) => restoreAll(s, before)
    lastTick.current = { ids, name, restore }
    say(`Got ${name.toLowerCase()}.`, () => {
      lastTick.current = null
      change(restore, { title: `Took ${name.toLowerCase()} off what you got` })
    })
  }

  // Skip all (26 Nov 2026): skips everything still to get on screen this shop, as Skip this shop does for one.
  const skipAll = () => {
    if (!toGet.length) return
    cancelAsk()
    const ids = toGet.map((r) => r.id)
    const name = toGet.length === 1 ? toGet[0].item.name : plural(toGet.length, "thing")
    local((s) => skipRows(s, ids))
    say(`Skipped ${name.toLowerCase()} this shop.`, () => local((s) => skipRows(s, ids, false)))
  }

  // ----- the heading -----
  const title = all ? "All items" : empty || noMatch ? "Shopping list" : (aisle?.title ?? "")
  const meta = empty
    ? "All done"
    : noMatch
      ? "Nothing matches the filters"
    : all
      ? `${totalLeft} left`
      : aisle
        ? `${aisle.left ? `${aisle.left} of ${aisle.total} left` : `all ${aisle.total} in your basket`}`
        : ""

  // ----- moving between aisles -----
  const count = aisles.length
  const step = React.useCallback((d: number) => {
    if (all) return go(d > 0 ? 0 : count - 1)
    const j = at + d
    if (j >= 0 && j < count) go(j)
  }, [all, at, count, go])
  const slide = useSlide(all ? -1 : at)
  const swipe = React.useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > 1.5 * Math.abs(g.dy),
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > 60 && Math.abs(g.dx) > 1.5 * Math.abs(g.dy)) step(g.dx < 0 ? 1 : -1)
    },
  }), [step])

  const nextWithItems = !all && aisle && aisle.left === 0 ? aisles.findIndex((a, k) => k > at && a.left > 0) : -1
  const offline = !online || status === "offline"
  // Adding from an aisle puts a new item in it (in this store); adding from a tag gives it that tag.
  const addParams = all || !aisle ? undefined
    : aisle.tag ? { category: aisle.tag }
    : aisle.aisle !== undefined && aisle.aisle !== null ? { aisle: String(aisle.aisle) }
    : undefined
  const byTag = state.groupBy === "tag"
  const headingTag = byTag && aisle?.tag ? state.categories.find((t) => t.id === aisle.tag) : undefined

  if (shopDone) {
    const undo = lastTick.current && lastTick.current.ids.every((id) => state.shop?.rows[id]) ? lastTick.current : null
    return (
      <ShopDone
        storeName={store?.name}
        got={allRows.filter((r) => r.done).length}
        left={skipped.length}
        next={whereNext(state)}
        undo={undo ? {
          name: undo.name,
          onPress: () => {
            lastTick.current = null
            run.current = null
            change(undo.restore, { title: `Took ${undo.name.toLowerCase()} off what you got`, key: undo.ids.length === 1 ? `shop:${undo.ids[0]}` : undefined })
          },
        } : undefined}
        offline={offline}
        toReview={homeSummary(state).toReview}
        onStore={(id) => local((s) => chooseStore(s, id))}
        onFinish={() => change((s) => clearShop(s))}
        onReview={() => router.navigate({ pathname: "/pantry/browse", params: { review: "1" } })}
      />
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: space.screen, paddingTop: 10, paddingBottom: 12, gap: 6 }}>
        <Press fade onPress={() => router.push("/stores")} accessibilityLabel={`Store: ${store?.name ?? "none"}. Change store`} style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", minHeight: 36, maxWidth: "90%" }}>
          <Text numberOfLines={2} style={{ fontFamily: font.medium, fontSize: 15, color: c.muted }}>{store?.name ?? "Choose a store"}</Text>
          <ChevronDown size={16} color={c.muted} />
        </Press>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Press fade disabled={empty || noMatch} onPress={() => router.push("/aisles")} accessibilityLabel={`${title}. ${byTag ? "All tags" : "All aisles"}`} style={{ alignSelf: "flex-start", opacity: 1 }}>
              {/* An underline 2 pt thick, 6 pt below the name, as in the prototype (text underlines can't be offset). */}
              {/* Shopping by tag, the heading leads with the tag's icon in its colour (Isaac's change, 24 Nov 2026). */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {!all && headingTag && <TagMark tag={headingTag} size="md" />}
                <View style={{ flexShrink: 1, alignSelf: "flex-start", borderBottomWidth: empty || noMatch ? 0 : 2, borderBottomColor: c.primary, paddingBottom: 2, marginBottom: 4 }}>
                  <Display size={32}>{title}</Display>
                </View>
              </View>
            </Press>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
              <Caption style={{ fontSize: 15 }}>{!all && !empty && !noMatch && aisle?.label ? <><Text style={{ fontFamily: font.semibold, color: c.ink }}>{aisle.label}</Text> · </> : null}{meta}</Caption>
              {/* What's skipped this shop, beside what's left; it opens the Skipped sheet (Isaac's change, 24 Nov 2026). */}
              {skipped.length > 0 && (
                <Press fade onPress={() => router.push("/skipped")} hitSlop={12} accessibilityRole="button" accessibilityLabel={`${skipped.length} skipped this shop. Show them`}>
                  <Caption style={{ fontSize: 15 }}> · <Text style={{ fontFamily: font.semibold, color: c.primary }}>{skipped.length} skipped</Text></Caption>
                </Press>
              )}
            </View>
          </View>
          <IconButton
            label={filtered ? `Filters, ${filtered} on` : "Filters"}
            filled={!!filtered}
            disabled={empty}
            onPress={() => router.push("/filters")}
            style={empty ? { opacity: 0.4 } : undefined}
          >
            <SlidersHorizontal size={22} color={filtered ? c.onPrimary : c.ink} strokeWidth={2} />
          </IconButton>
        </View>
      </View>

      <ScrollView
        {...swipe.panHandlers}
        contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: insets.bottom + 40, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={() => void pullToSync()} tintColor={c.muted} />}
      >
        {empty && (
          <Body style={{ paddingVertical: 24 }}>
            <Text style={{ fontFamily: font.bold }}>Nothing to buy.</Text> Every Staple is at or above its minimum.
          </Body>
        )}

        {noMatch && (
          <View style={{ paddingVertical: 24, gap: 12, alignItems: "flex-start" }}>
            <Body>Nothing on the list matches the filters.</Body>
            <Press fade onPress={() => local((s) => ({ ...s, filter: undefined, aisle: 0 }))} style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={{ fontFamily: font.medium, fontSize: 16, color: c.ink, textDecorationLine: "underline" }}>Clear filters</Text>
            </Press>
          </View>
        )}

        <Animated.View style={slide}>
          {noMatch ? null : all ? (
            sortRows(rows).map((r) => <ListRow key={r.id} r={r} onTick={tick} onHold={tickRest} />)
          ) : aisle ? (
            aisle.rows.map((r) => <ListRow key={r.id} r={r} onTick={tick} onHold={tickRest} />)
          ) : null}
          <Button
            kind="secondary"
            label="Add item"
            icon={<Plus size={20} color={c.ink} strokeWidth={2} />}
            accessibilityLabel={addParams && aisle ? `Add an item to ${aisle.title}` : "Add an item to the list"}
            onPress={() => router.push(addParams ? { pathname: "/add", params: addParams } : "/add")}
            style={{ marginTop: 16 }}
          />
          {/* Got all and Skip all: small, side by side, in the focus gold (Isaac's change, 26 Nov 2026). */}
          {toGet.length > 0 && (
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <Button
                kind="gold"
                label="Got all"
                height={44}
                icon={<Check size={18} color={focus.onGold} strokeWidth={2} />}
                accessibilityLabel={`Got all: tick off ${plural(toGet.length, "thing")} in ${all || !aisle ? "the list" : aisle.title}`}
                onPress={gotAll}
                style={{ flex: 1 }}
              />
              <Button
                kind="gold"
                label="Skip all"
                height={44}
                icon={<SkipForward size={18} color={focus.onGold} strokeWidth={2} />}
                accessibilityLabel={`Skip all: skip ${plural(toGet.length, "thing")} in ${all || !aisle ? "the list" : aisle.title} this shop`}
                onPress={skipAll}
                style={{ flex: 1 }}
              />
            </View>
          )}
        </Animated.View>

        {!empty && !noMatch && nextWithItems >= 0 && (
          <View style={{ marginTop: 20 }}>
            <Press onPress={() => go(nextWithItems)} accessibilityLabel={`Done here. Next: ${aisles[nextWithItems].title}, ${aisles[nextWithItems].left} left`} style={{ minHeight: 64, borderRadius: radius.base, backgroundColor: c.primary, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", color: c.onPrimary }}>Done here · next</Text>
                <Text style={{ fontFamily: font.medium, fontSize: 18, color: c.onPrimary }}>{[aisles[nextWithItems].title, aisles[nextWithItems].label, `${aisles[nextWithItems].left} left`].filter(Boolean).join(" · ")}</Text>
              </View>
              <ChevronRight size={24} color={c.onPrimary} />
            </Press>
          </View>
        )}

      </ScrollView>
    </View>
  )
}

/** Slides the aisle in from the side it came from (a fade with Reduce Motion). */
function useSlide(key: number) {
  const reduce = useReduceMotion()
  const { width } = useWindowDimensions()
  const x = React.useRef(new Animated.Value(0)).current
  const o = React.useRef(new Animated.Value(1)).current
  const last = React.useRef(key)
  React.useEffect(() => {
    if (last.current === key) return
    const dir = key > last.current ? 1 : -1
    last.current = key
    x.setValue(reduce ? 0 : dir * width * 0.25)
    o.setValue(0)
    Animated.parallel([
      Animated.timing(x, { toValue: 0, duration: 250, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(o, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== "web" }),
    ]).start()
  }, [key, reduce, width, x, o])
  return { transform: [{ translateX: x }], opacity: o }
}

function ListRow({ r, onTick, onHold }: { r: Row; onTick: (r: Row) => void; onHold: (r: Row) => void }) {
  const c = useColours()
  const name = r.item.name.toLowerCase()
  const tickLabel = r.done ? `Undo ${name}` : `Got one ${name}, ${r.left} to get. Hold to get them all.`
  return (
    <View style={{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: space.row, borderBottomWidth: 1, borderBottomColor: c.line }}>
      <Press fade onPress={() => router.push({ pathname: "/list-item/[id]", params: { id: r.id } })} accessibilityLabel={`${r.item.name}${r.note ? `, ${r.note}` : ""}. Details`} style={{ flex: 1, paddingVertical: 10, gap: 2 }}>
        <Text style={{ fontFamily: font.medium, fontSize: 20, lineHeight: 25, color: r.done || r.ordered ? c.muted : c.ink, textDecorationLine: r.done ? "line-through" : "none" }}>{r.item.name}</Text>
        {!!r.note && <Caption>{r.note}</Caption>}
      </Press>
      <Press
        accessibilityLabel={tickLabel}
        accessibilityActions={r.done ? [] : [{ name: "gotAll", label: "Got all" }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === "gotAll" && onHold(r)}
        onPress={() => onTick(r)}
        onLongPress={() => onHold(r)}
        delayLongPress={500}
        style={{ width: 48, height: 48, borderRadius: radius.base, borderWidth: 1, borderColor: c.primary, backgroundColor: r.done ? c.primary : "transparent", alignItems: "center", justifyContent: "center" }}
      >
        {r.done ? <Check size={24} color={c.onPrimary} strokeWidth={2.5} /> : <Text style={{ fontFamily: font.semibold, fontSize: 20, color: c.ink }}>{r.left}</Text>}
      </Press>
    </View>
  )
}

