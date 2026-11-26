// SHOP DONE (26 Nov 2026, Isaac's design): what the List shows once everything is ticked, ordered or skipped. Always
// dark, like the item sheet. What you got and what's left; for anything skipped, where else sells it ("Where
// next?", the store with the most first); Finish for today starts a new list. Undo last tick brings the list back.
import { ChevronRight, Undo2 } from "lucide-react-native"
import * as React from "react"
import { ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { NextStore } from "../logic/list"
import { ShopBagArt } from "./art"
import { Button, Display, Label, Press } from "./kit"
import { font, radius, space, useColours } from "./theme"

export function ShopDone({ storeName, got, left, next, undo, offline, toReview, onStore, onFinish, onReview }: {
  storeName?: string
  /** Rows ticked off this shop. */
  got: number
  /** Rows skipped this shop: still to get. */
  left: number
  next: NextStore[]
  /** The last tick, if this screen knows it. */
  undo?: { name: string; onPress: () => void }
  offline: boolean
  toReview: number
  onStore: (id: string) => void
  onFinish: () => void
  onReview: () => void
}) {
  const { focus } = useColours()
  const insets = useSafeAreaInsets()
  // The card to highlight: the only store, or the one that sells more than any other (none on a tie).
  const most = next.length === 1 || (next.length > 1 && next[0].rows.length > next[1].rows.length) ? next[0].store.id : undefined
  // The "Has most" pill only when there's a choice.
  const pill = next.length > 1

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: focus.bg }}
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: space.screen + 4, paddingTop: 16, paddingBottom: insets.bottom + 24 }}
    >
      <View style={{ minHeight: 44, justifyContent: "center", marginBottom: 28 }}>
        {undo && (
          <Press fade onPress={undo.onPress} accessibilityLabel={`Undo last tick, ${undo.name}`} style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 8, minHeight: 44 }}>
            <Undo2 size={20} color={focus.gold} strokeWidth={2} />
            <Text style={{ fontFamily: font.medium, fontSize: 16, color: focus.gold }}>Undo last tick</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 16, color: focus.label }}>· {undo.name}</Text>
          </Press>
        )}
      </View>

      <View accessibilityRole="summary" style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <View style={{ flex: 1, gap: 6 }}>
          {!!storeName && <Label colour={focus.ink} numberOfLines={2}>{storeName}</Label>}
          <Display size={38} colour={focus.ink}>Shop done.</Display>
          <Text style={{ fontFamily: font.medium, fontSize: 18, color: focus.ink, marginTop: 2 }}>
            Got {got}{left > 0 ? ` • ${left} left` : ""}
          </Text>
        </View>
        <ShopBagArt
          width={118}
          colours={{
            net: focus.gold, bread: focus.place, cut: focus.bg, leaf: focus.leaf, stalk: focus.label,
            veg: focus.leaf, orange: focus.fruit, apple: focus.danger, stem: focus.place,
          }}
        />
      </View>

      {next.length > 0 && (
        <View style={{ marginTop: 28, gap: 10 }}>
          <Label colour={focus.label} accessibilityRole="header">Where next?</Label>
          {next.map((n) => {
            const top = n.store.id === most
            return (
              <Press
                key={n.store.id}
                tint={focus.press}
                onPress={() => onStore(n.store.id)}
                accessibilityLabel={`${n.store.name}${top && pill ? ", has most" : ""}. ${n.rows.length} of ${left}: ${n.names}. Shop there`}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, minHeight: 72,
                  borderRadius: radius.base, borderWidth: top ? 2 : 1, borderColor: top ? focus.gold : focus.line,
                  backgroundColor: top ? focus.field : "transparent",
                }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 20, color: focus.ink }}>{n.store.name}</Text>
                    {top && pill && (
                      <View style={{ backgroundColor: focus.badge, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
                        <Text style={{ fontFamily: font.bold, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: focus.onBadge }}>Has most</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: focus.label }}>{n.names}</Text>
                </View>
                <Text style={{ fontFamily: font.semibold, fontSize: 16, color: focus.gold }}>{n.rows.length} of {left}</Text>
                <ChevronRight size={22} color={focus.gold} strokeWidth={2} />
              </Press>
            )
          })}
        </View>
      )}

      <View style={{ flex: 1, minHeight: 32 }} />

      <Button kind="goldOutline" label="Finish for today" onPress={onFinish} />
      <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: focus.label, textAlign: "center", marginTop: 14 }}>
        {offline ? "It goes to your pantry when you're back online." : "Your pantry is up to date."}
        {toReview > 0 && (
          <>
            {" "}
            <Text onPress={onReview} accessibilityRole="link" style={{ fontFamily: font.medium, color: focus.gold, textDecorationLine: "underline" }}>
              {toReview} new {toReview === 1 ? "item" : "items"} to review
            </Text>
          </>
        )}
      </Text>
    </ScrollView>
  )
}
