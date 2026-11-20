// LIST: one aisle at a time, in the order you walk the store you're in (PROTO-1 handoff, "List").
// Tap the count to get one; hold it to get them all; tap the name for the item sheet. Swipe sideways, or use
// the buttons at the foot, to change aisle. Ticking adds to stock straight away and syncs by itself.
import * as Haptics from "expo-haptics"
import { router } from "expo-router"
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react-native"
import * as React from "react"
import { Animated, PanResponder, Platform, RefreshControl, ScrollView, Text, View, useWindowDimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { TOAST_UNDO_MS, useStore } from "../../../data/store"
import { restoreTicks, tickAll, tickOne, untick, clearShop } from "../../../logic/actions"
import { aisleLabel, leftOf, refreshShop, rowsOf, shopAisles, sortRows, tickedText, type AisleView, type Row } from "../../../logic/list"
import { AddItemIcon } from "../../../ui/art"
import { Body, Button, Caption, Display, IconButton, Label, Press } from "../../../ui/kit"
import { focus, font, radius, space, useColours, useReduceMotion } from "../../../ui/theme"

export default function ListScreen() {
  const { state, change, local, say, status, online, syncNow } = useStore()
  const c = useColours()
  const insets = useSafeAreaInsets()

  // Keep the shop in step with the items (things added elsewhere join it; untouched rows follow their item).
  React.useEffect(() => {
    const shop = refreshShop(state.shop, state.items)
    if (shop !== state.shop) local((s) => ({ ...s, shop }))
  }, [state.shop, state.items, local])

  const store = state.stores.find((s) => s.id === state.storeId) ?? state.stores[0]
  const aisles = shopAisles(state)
  const all = state.aisle === "all"
  const at = all ? 0 : Math.min(Math.max(0, state.aisle as number), Math.max(0, aisles.length - 1))
  const aisle = aisles[at]
  const rows = rowsOf(state)
  const totalLeft = leftOf(rows)
  const empty = rows.length === 0
  const shopDone = !empty && rows.every((r) => r.done || r.ordered)

  const go = React.useCallback((i: number | "all") => local((s) => ({ ...s, aisle: i })), [local])

  // ----- ticking -----
  // Every tick shows a toast with Undo. Taps in a row on one item while its toast is up share the toast, and
  // Undo puts back all of them (the same run is one History entry too).
  const run = React.useRef<{ id: string; before: number; at: number } | null>(null)
  const ticked = (r: Row, got: number) => {
    const last = run.current
    const before = last && last.id === r.id && Date.now() - last.at < TOAST_UNDO_MS ? last.before : r.got
    run.current = { id: r.id, before, at: Date.now() }
    const title = `Took ${r.item.name.toLowerCase()} off what you got`
    say(tickedText({ ...r, got: before }, got), () => {
      run.current = null
      change((s) => restoreTicks(s, r.id, before), { title, key: `shop:${r.id}` })
    })
  }
  const tick = (r: Row) => {
    if (r.done) {
      run.current = null
      change((s) => untick(s, r.id), { title: `Took ${r.item.name.toLowerCase()} off what you got`, key: `shop:${r.id}` })
      return
    }
    void Haptics.selectionAsync().catch(() => {})
    change((s) => tickOne(s, r.id), { title: `Got ${r.item.name.toLowerCase()} on the phone`, key: `shop:${r.id}` })
    ticked(r, r.got + 1)
  }
  const tickRest = (r: Row) => {
    if (r.done) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    change((s) => tickAll(s, r.id), { title: `Got ${r.item.name.toLowerCase()} on the phone`, key: `shop:${r.id}` })
    ticked(r, r.need)
  }

  // ----- the heading -----
  const names = all ? ["All items"] : empty ? ["Shopping list"] : (aisle?.categories.map((k) => k.name) ?? [])
  const meta = empty
    ? "All done"
    : all
      ? `${totalLeft} left`
      : aisle
        ? `${aisle.left ? `${aisle.left} of ${aisle.total} left` : `all ${aisle.total} in your basket`}`
        : ""
  // The aisle number leads the line, bold and in ink, so it can be found at a glance in the shop.
  const aisleName = !empty && !all && aisle ? aisleLabel(aisle) : null

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
  const hint = !empty && count > 1 && nextWithItems < 0

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: space.screen, paddingTop: 10, paddingBottom: 12, gap: 6 }}>
        <Press fade onPress={() => router.push("/stores")} accessibilityLabel={`Store: ${store?.name ?? "none"}. Change store`} style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", minHeight: 36, maxWidth: "90%" }}>
          <Text numberOfLines={2} style={{ fontFamily: font.medium, fontSize: 15, color: c.muted }}>{store?.name ?? "Choose a store"}</Text>
          <ChevronDown size={16} color={c.muted} />
        </Press>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Press fade disabled={empty} onPress={() => router.push("/aisles")} accessibilityLabel={`${names.join(" and ")}. All aisles`} style={{ alignSelf: "flex-start", opacity: 1 }}>
              {names.map((n) => (
                // An underline 2 pt thick, 6 pt below the name, as in the prototype (text underlines can't be offset).
                <View key={n} style={{ alignSelf: "flex-start", borderBottomWidth: empty ? 0 : 2, borderBottomColor: c.olive, paddingBottom: 2, marginBottom: 4 }}>
                  <Display size={names.length > 1 ? 26 : 32}>{n}</Display>
                </View>
              ))}
            </Press>
            <Caption style={{ fontSize: 15 }}>{aisleName && <><Text style={{ fontFamily: font.bold, color: c.ink }}>{aisleName}</Text> · </>}{meta}</Caption>
          </View>
          <IconButton label="Add to the list" onPress={() => router.push("/add")}>
            <AddItemIcon colour={c.ink} />
          </IconButton>
        </View>
      </View>

      <ScrollView
        {...swipe.panHandlers}
        contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: hint ? 0 : 40, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={status === "syncing"} onRefresh={() => void syncNow()} tintColor={c.muted} />}
      >
        {shopDone && (
          <View accessibilityRole="summary" style={{ backgroundColor: focus.bg, borderRadius: radius.base, padding: 16, gap: 12, marginBottom: 12 }}>
            <Text style={{ fontFamily: font.regular, fontSize: 16, lineHeight: 22, color: focus.ink }}>
              <Text style={{ fontFamily: font.bold }}>Shop done. </Text>
              {offline ? "It goes to your pantry when you're back online." : "Your pantry is up to date."}
            </Text>
            <Button kind="gold" label="Start a new list" height={48} onPress={() => change((s) => clearShop(s))} />
          </View>
        )}
        {empty && (
          <Body style={{ paddingVertical: 24 }}>
            <Text style={{ fontFamily: font.bold }}>Nothing to buy.</Text> Every Staple is at or above its minimum.
          </Body>
        )}

        <Animated.View style={slide}>
          {all ? (
            sortRows(rows).map((r) => <ListRow key={r.id} r={r} onTick={tick} onHold={tickRest} />)
          ) : aisle ? (
            <AisleRows aisle={aisle} onTick={tick} onHold={tickRest} />
          ) : null}
        </Animated.View>

        {!empty && (
          <View style={{ marginTop: 20, gap: 10 }}>
            {nextWithItems >= 0 ? (
              <Press onPress={() => go(nextWithItems)} accessibilityLabel={`Done here. Next: ${aisleLabel(aisles[nextWithItems])}, ${aisles[nextWithItems].categories.map((k) => k.name).join(" and ")}`} style={{ minHeight: 64, borderRadius: radius.base, backgroundColor: c.olive, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", color: c.onOlive }}>Done here · next {aisleLabel(aisles[nextWithItems])}</Text>
                  <Text style={{ fontFamily: font.medium, fontSize: 18, color: c.onOlive }}>{aisles[nextWithItems].categories.map((k) => k.name).join(" & ")}</Text>
                </View>
                <ChevronRight size={24} color={c.onOlive} />
              </Press>
            ) : (
              <>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  {(all ? count > 0 : at > 0) ? (
                    <AisleStep dir="prev" a={all ? aisles[count - 1] : aisles[at - 1]} onPress={() => step(-1)} />
                  ) : <View />}
                  {(all ? count > 0 : at < count - 1) && <AisleStep dir="next" a={all ? aisles[0] : aisles[at + 1]} onPress={() => step(1)} />}
                </View>
              </>
            )}
          </View>
        )}
        {/* The swipe hint: the spacer pushes it to the foot of the screen when the list is short; when the list is
            longer than the screen, it follows the last row. */}
        {hint && (
          <>
            <View style={{ flex: 1 }} />
            <Caption style={{ textAlign: "center", paddingTop: 24, paddingBottom: insets.bottom + 8 }}>Swipe left or right to change aisle</Caption>
          </>
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

function AisleStep({ dir, a, onPress }: { dir: "prev" | "next"; a: AisleView; onPress: () => void }) {
  const c = useColours()
  const name = a.categories.map((k) => k.name).join(" & ")
  return (
    <Press fade onPress={onPress} accessibilityLabel={`${dir === "prev" ? "Previous" : "Next"}: ${aisleLabel(a)}, ${name}`} style={{ maxWidth: "48%", minHeight: 48, flexDirection: "row", alignItems: "center", gap: 2 }}>
      {dir === "prev" && <ChevronLeft size={20} color={c.ink} />}
      <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: font.medium, fontSize: 16, color: c.ink }}>{name}</Text>
      {dir === "next" && <ChevronRight size={20} color={c.ink} />}
    </Press>
  )
}

/** An aisle's rows. When two categories share the number, each gets a small heading with its own count. */
function AisleRows({ aisle, onTick, onHold }: { aisle: AisleView; onTick: (r: Row) => void; onHold: (r: Row) => void }) {
  const c = useColours()
  const shared = aisle.categories.length > 1
  if (!shared) return <>{aisle.rows.map((r) => <ListRow key={r.id} r={r} onTick={onTick} onHold={onHold} />)}</>
  return (
    <>
      {aisle.categories.map((k) => {
        const mine = aisle.rows.filter((r) => (k.id === "" ? !aisle.categories.some((x) => x.id && x.id === r.item.categoryId) : r.item.categoryId === k.id))
        if (!mine.length) return null
        const left = leftOf(mine)
        return (
          <View key={k.id || "other"} style={{ marginTop: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.stone }}>
              <Label>{k.name}</Label>
              <Label>{left ? `${left} left` : "Done"}</Label>
            </View>
            {mine.map((r) => <ListRow key={r.id} r={r} onTick={onTick} onHold={onHold} />)}
          </View>
        )
      })}
    </>
  )
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
        style={{ width: 48, height: 48, borderRadius: radius.base, borderWidth: 1, borderColor: c.olive, backgroundColor: r.done ? c.olive : "transparent", alignItems: "center", justifyContent: "center" }}
      >
        {r.done ? <Check size={24} color={c.onOlive} strokeWidth={2.5} /> : <Text style={{ fontFamily: font.semibold, fontSize: 20, color: c.ink }}>{r.left}</Text>}
      </Press>
    </View>
  )
}

