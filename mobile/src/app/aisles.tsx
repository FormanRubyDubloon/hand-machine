// The aisle menu (full screen): All items first, then one row per aisle number, with what's left in each.
// The current aisle's box is filled; finished aisles have a dashed box.
import { router } from "expo-router"
import { List, X } from "lucide-react-native"
import * as React from "react"
import { ScrollView, Text, View } from "react-native"
import { useStore } from "../data/store"
import { filterNames, filtersOn, leftOf, NO_FILTER, shopAisles, shownRows, type ListFilter } from "../logic/list"
import { Chip, Press } from "../ui/kit"
import { SheetHeader } from "../ui/sheet"
import { font, radius, useColours } from "../ui/theme"

export default function Aisles() {
  const { state, local } = useStore()
  const c = useColours()
  const aisles = shopAisles(state)
  const all = state.aisle === "all"
  // With filters on, only aisles with a match are listed. Each filter shows as a chip, as in the Filters sheet;
  // tapping its X turns that one off.
  const f = state.filter
  const filters = f ? (["show", "stock"] as const).filter((k) => f[k] !== "all").map((k) => ({ key: k, name: filterNames({ ...NO_FILTER, [k]: f[k] })[0] })) : []
  const remove = (k: "show" | "stock") => local((s) => {
    const next: ListFilter = { ...(s.filter ?? NO_FILTER), [k]: "all" }
    return { ...s, filter: filtersOn(next) ? next : undefined, aisle: s.aisle === "all" ? "all" : 0 }
  })
  const shown = shownRows(state)
  const go = (i: number | "all") => {
    local((s) => ({ ...s, aisle: i }))
    router.back()
  }
  const box = (on: boolean, dashed = false) => ({
    width: 44, height: 44, borderRadius: radius.base, borderWidth: 1, borderStyle: dashed ? ("dashed" as const) : ("solid" as const),
    borderColor: on ? c.olive : c.stone, backgroundColor: on ? c.olive : c.panel, alignItems: "center" as const, justifyContent: "center" as const,
  })
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SheetHeader title="Aisles" full />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {filters.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
            {filters.map((x) => (
              <Chip key={x.key} on label={x.name} accessibilityLabel={`Remove filter: ${x.name}`} icon={<X size={16} color={c.onOlive} strokeWidth={2.5} />} onPress={() => remove(x.key)} />
            ))}
          </View>
        )}
        <Press onPress={() => go("all")} accessibilityState={{ selected: all }} accessibilityLabel={`All items, ${leftOf(shown)} left`} style={{ minHeight: 68, flexDirection: "row", alignItems: "center", gap: 14, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <View style={box(all)}><List size={20} color={all ? c.onOlive : c.ink} /></View>
          <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 19, color: c.ink }}>All items</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 15, color: c.muted }}>{leftOf(shown)} left</Text>
        </Press>
        {aisles.map((a, k) => {
          const on = !all && state.aisle === k
          const done = a.left === 0
          const names = a.categories.map((x) => x.name)
          return (
            <Press key={a.key} onPress={() => go(k)} accessibilityState={{ selected: on }} accessibilityLabel={`${a.number ? `Aisle ${a.number}` : "No aisle number"}: ${names.join(" and ")}. ${done ? "Done" : `${a.left} left`}`} style={{ minHeight: 68, flexDirection: "row", alignItems: "center", gap: 14, borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: 8 }}>
              <View style={box(on, done && !on)}>
                <Text style={{ fontFamily: font.bold, fontSize: 17, color: on ? c.onOlive : c.ink }}>{a.number ?? "–"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                {names.map((n) => <Text key={n} style={{ fontFamily: font.medium, fontSize: 19, lineHeight: 24, color: done ? c.muted : c.ink }}>{n}</Text>)}
              </View>
              <Text style={{ fontFamily: font.regular, fontSize: 15, color: c.muted }}>{done ? "Done" : `${a.left} left`}</Text>
            </Press>
          )
        })}
      </ScrollView>
    </View>
  )
}
