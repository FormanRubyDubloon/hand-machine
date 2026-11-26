// The Aisles and Tags menu (full screen; Batch 4, 24 Nov 2026). Two tabs choose how you shop: by aisle, in the order
// you walk the store (No aisle first), or by tag (A to Z, No tag last). All items first, then one row per heading,
// with what's left in each. The current one's box is filled; finished ones have a dashed box.
import { router } from "expo-router"
import { List, X } from "lucide-react-native"
import * as React from "react"
import { ScrollView, Text, View } from "react-native"
import { useStore } from "../data/store"
import { filterNames, filtersOn, leftOf, NO_FILTER, shopGroups, shownRows, type GroupBy, type ListFilter } from "../logic/list"
import { Caption, Chip, Press, Segmented } from "../ui/kit"
import { SheetHeader } from "../ui/sheet"
import { TAG_ICONS, TagMark } from "../ui/tags"
import { font, radius, useColours } from "../ui/theme"

export default function Aisles() {
  const { state, local } = useStore()
  const c = useColours()
  const aisles = shopGroups(state)
  const by: GroupBy = state.groupBy ?? "aisle"
  const store = state.stores.find((x) => x.id === state.storeId) ?? state.stores[0]
  const all = state.aisle === "all"
  // With filters on, only aisles with a match are listed. Each filter shows as a chip, as in the Filters sheet;
  // tapping its X turns that one off.
  const f = state.filter
  type Key = "show" | "stock" | "hideOrdered" | "thisStore"
  const filters: { key: Key; name: string }[] = f
    ? [
        ...(["show", "stock"] as const).map((k) => ({ key: k, name: filterNames({ ...NO_FILTER, [k]: f[k] })[0] })).filter((x) => !!x.name),
        ...(f.hideOrdered ? [{ key: "hideOrdered" as const, name: "No ordered" }] : []),
        ...(f.thisStore ? [{ key: "thisStore" as const, name: "This store" }] : []),
      ]
    : []
  const remove = (k: Key) => local((s) => {
    const next: ListFilter = k === "thisStore" || k === "hideOrdered" ? { ...(s.filter ?? NO_FILTER), [k]: undefined } : { ...(s.filter ?? NO_FILTER), [k]: "all" }
    return { ...s, filter: filtersOn(next) ? next : undefined, aisle: s.aisle === "all" ? "all" : 0 }
  })
  const shown = shownRows(state)
  const go = (i: number | "all") => {
    local((s) => ({ ...s, aisle: i }))
    router.back()
  }
  const box = (on: boolean, dashed = false) => ({
    width: 44, height: 44, borderRadius: radius.base, borderWidth: 1, borderStyle: dashed ? ("dashed" as const) : ("solid" as const),
    borderColor: on ? c.primary : c.stone, backgroundColor: on ? c.primary : c.panel, alignItems: "center" as const, justifyContent: "center" as const,
  })
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SheetHeader title={by === "tag" ? "Tags" : "Aisles"} full />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <View style={{ paddingBottom: 12, gap: 8 }}>
          <Segmented<GroupBy>
            label="Shop by"
            value={by}
            onChange={(v) => local((s) => ({ ...s, groupBy: v === "aisle" ? undefined : v, aisle: s.aisle === "all" ? "all" : 0 }))}
            options={[{ value: "aisle", label: "Aisles" }, { value: "tag", label: "Tags" }]}
          />
          {by === "aisle" && store?.noAisleNumbers && <Caption>{store.name} has no aisle numbers, so its list goes A to Z.</Caption>}
          {by === "tag" && <Caption>Each tag's items follow the walk round the store. Something with two tags is under both.</Caption>}
        </View>
        {filters.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
            {filters.map((x) => (
              <Chip key={x.key} on label={x.name} accessibilityLabel={`Remove filter: ${x.name}`} icon={<X size={16} color={c.onPrimary} strokeWidth={2.5} />} onPress={() => remove(x.key)} />
            ))}
          </View>
        )}
        <Press onPress={() => go("all")} accessibilityState={{ selected: all }} accessibilityLabel={`All items, ${leftOf(shown)} left`} style={{ minHeight: 68, flexDirection: "row", alignItems: "center", gap: 14, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <View style={box(all)}><List size={20} color={all ? c.onPrimary : c.ink} /></View>
          <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 19, color: c.ink }}>All items</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 15, color: c.muted }}>{leftOf(shown)} left</Text>
        </Press>
        {aisles.map((a, k) => {
          const on = !all && state.aisle === k
          const done = a.left === 0
          // The box shows the aisle number, the first letter of a place or tag, or a dash for No aisle and No tag.
          const mark = typeof a.aisle === "number" ? String(a.aisle) : a.aisle || a.tag ? a.title.slice(0, 1).toUpperCase() : "–"
          const tag = a.tag ? state.categories.find((t) => t.id === a.tag) : undefined
          const TagIcon = tag?.icon ? TAG_ICONS[tag.icon] : null
          return (
            <Press key={a.key} onPress={() => go(k)} accessibilityState={{ selected: on }} accessibilityLabel={`${a.title}${a.label ? `, ${a.label}` : ""}. ${done ? "Done" : `${a.left} left`}`} style={{ minHeight: 68, flexDirection: "row", alignItems: "center", gap: 14, borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: 8 }}>
              {/* A tag shows its icon in its colour (Isaac's change, 24 Nov 2026); the current one is filled in the primary colour as before. */}
              {tag && (tag.icon || tag.colour) && !on ? (
                <TagMark tag={tag} size="lg" fallback={mark} style={done ? { borderWidth: 1, borderStyle: "dashed", borderColor: c.stone } : undefined} />
              ) : (
                <View style={box(on, done && !on)}>
                  {TagIcon ? <TagIcon size={22} color={on ? c.onPrimary : c.ink} strokeWidth={1.75} /> : <Text style={{ fontFamily: font.bold, fontSize: 17, color: on ? c.onPrimary : c.ink }}>{mark}</Text>}
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.medium, fontSize: 19, lineHeight: 24, color: done ? c.muted : c.ink }}>{a.title}</Text>
                {!!a.label && <Caption>{a.label}</Caption>}
              </View>
              <Text style={{ fontFamily: font.regular, fontSize: 15, color: c.muted }}>{done ? "Done" : `${a.left} left`}</Text>
            </Press>
          )
        })}
      </ScrollView>
    </View>
  )
}
