// Changed in two places: the rest of the sync went through; this item keeps the phone's version until you
// choose. Names the field that clashed and when the other side changed it (handoff open question 7).
import * as React from "react"
import { Modal, Text, View } from "react-native"
import { useStore } from "../data/store"
import { FIELD_LABELS } from "../logic/merge"
import { phrase, whenText } from "../logic/phrases"
import type { Item } from "../data/state"
import { Button, Press } from "./kit"
import { font, radius, useColours } from "./theme"

/** The clashing field's value, said plainly. */
function valueOf(item: Item, field: string, storeName: (id: string) => string) {
  switch (field) {
    case "where": return item.where.length ? item.where.map(storeName).join(", ") : "Any store"
    case "inStock": case "open": return phrase(item)
    case "target": return item.target > 0 ? `Minimum ${item.target}` : "Not a Staple"
    case "entries": return `${(item.entries ?? []).reduce((n, e) => n + e.qty, 0)} on the list`
    case "useBy": return (item.useBy ?? []).find(Boolean) ?? "No date"
    default: {
      const v = (item as Record<string, unknown>)[field]
      return v === undefined || v === null || v === "" ? "Nothing" : typeof v === "object" ? JSON.stringify(v) : String(v)
    }
  }
}

export function ConflictDialog() {
  const { state, resolveConflict } = useStore()
  const c = useColours()
  const [later, setLater] = React.useState<string[]>([])
  const conflict = state.conflicts.find((x) => !later.includes(x.itemId))
  const mine = conflict ? state.items[conflict.itemId] : undefined
  if (!conflict || !mine) return null
  const field = conflict.fields[0]
  const storeName = (id: string) => state.stores.find((x) => x.id === id)?.name ?? "A deleted store"
  const what = conflict.fields.map((f) => FIELD_LABELS[f] ?? f).join(" and ")
  const option = (title: string, value: string, onPress: () => void) => (
    <Press onPress={onPress} accessibilityLabel={`${title}: ${value}`} style={{ borderWidth: 1, borderColor: c.primary, borderRadius: radius.base, padding: 14, gap: 2 }}>
      <Text style={{ fontFamily: font.semibold, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", color: c.muted }}>{title}</Text>
      <Text style={{ fontFamily: font.medium, fontSize: 18, color: c.ink }}>{value}</Text>
    </Press>
  )
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setLater((l) => [...l, conflict.itemId])}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 16 }}>
        <View accessibilityRole="alert" style={{ backgroundColor: c.bg, borderRadius: radius.dialog, padding: 20, gap: 12 }}>
          <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 20, lineHeight: 26, color: c.ink }}>{mine.name} changed in two places</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 16, lineHeight: 22, color: c.ink }}>The rest of your sync went through. Its {what} changed here and elsewhere. Which should {mine.name} keep?</Text>
          {option("This phone", valueOf(mine, field, storeName), () => resolveConflict(conflict.itemId, "phone"))}
          {option(`Elsewhere${conflict.remoteAt ? `, ${whenText(conflict.remoteAt)}` : ""}`, valueOf(conflict.remote, field, storeName), () => resolveConflict(conflict.itemId, "other"))}
          <Button kind="quiet" label="Decide later (keeps this phone's for now)" onPress={() => setLater((l) => [...l, conflict.itemId])} />
        </View>
      </View>
    </Modal>
  )
}
