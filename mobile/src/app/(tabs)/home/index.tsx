// HOME (HOME-1, 26 Nov 2026, claude/collca-home-1-handoff.zip): the first tab, and where the app opens. Top to bottom:
// a greeting with the date; Tonight, one recipe you can cook now on a mustard card (Another swaps it); Use it up, the
// three items going off soonest; and, fixed at the bottom, a bar for the shop. It replaced Batch 5's emblem, count tiles
// and Want to cook list. Pull down to sync, as on the other tabs.
import { router } from "expo-router"
import { ArrowRight, ChevronRight } from "lucide-react-native"
import * as React from "react"
import { AccessibilityInfo, RefreshControl, ScrollView, Text, useWindowDimensions, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { soonest } from "../../../../../prototypes/pantry-app/src/model"
import { useStore } from "../../../data/store"
import { guessesToCheck } from "../../../logic/aisle-guesses"
import { dateLine, greeting, homeSummary, tonightLabel, tonightLine, tonightPicks } from "../../../logic/home"
import { expiryText, plural } from "../../../logic/phrases"
import { recipeRows } from "../../../logic/recipes"
import { TonightPotArt } from "../../../ui/art"
import { Button, Caption, Display, Label, Press } from "../../../ui/kit"
import { font, radius, space, useColours } from "../../../ui/theme"

/** 12, semibold, uppercase, +0.12em: the date line and the section labels. */
const small = { fontSize: 12, letterSpacing: 12 * 0.12 }

export default function Home() {
  const { state, pulling, pullToSync } = useStore()
  const c = useColours()
  const insets = useSafeAreaInsets()
  const home = homeSummary(state)
  const now = new Date()

  const seeSoon = () => router.navigate({ pathname: "/pantry/browse", params: { all: "1", show: "soon" } })
  const store = state.stores.find((s) => s.id === state.storeId) ?? state.stores[0]
  const guesses = guessesToCheck(state).length
  const shopSub = [store?.name, home.lowOrOut ? `${home.lowOrOut} low or out` : ""].filter(Boolean).join(" · ")

  const row = (key: string, title: string, sub: string, onPress: () => void, label: string) => (
    <Press key={key} onPress={onPress} accessibilityLabel={label} style={{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: 10 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: font.medium, fontSize: 18, color: c.ink }}>{title}</Text>
        {!!sub && <Caption>{sub}</Caption>}
      </View>
      <ChevronRight size={20} color={c.muted} />
    </Press>
  )

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.screen, paddingTop: 22, paddingBottom: 24, gap: 20 }}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={() => void pullToSync()} tintColor={c.muted} />}
      >
        <View style={{ gap: 6 }}>
          <Label style={small}>{dateLine(now)}</Label>
          {/* No name: the account only has an email (Isaac's choice, 26 Nov 2026: the greeting alone). */}
          <Display size={32} style={{ letterSpacing: 32 * 0.04 }}>{greeting(now)}</Display>
        </View>

        <Tonight />

        <View>
          <Label style={[small, { marginBottom: 4 }]}>Use it up</Label>
          {home.useSoon.length ? (
            home.useSoon.slice(0, 3).map((i) => {
              const sub = expiryText(soonest(i))
              return row(i.id, i.name, sub, () => router.navigate({ pathname: "/pantry/item/[id]", params: { id: i.id } }), `${i.name}. ${sub}`)
            })
          ) : (
            <Caption style={{ paddingVertical: 12 }}>Nothing goes off in the next two days.</Caption>
          )}
          {home.useSoon.length > 3 && (
            <Press fade onPress={seeSoon} style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: c.link }}>See all {home.useSoon.length}</Text>
            </Press>
          )}
        </View>

        {/* New items to review had no place in HOME-1; a single row, only when there are some (the handoff's suggestion). */}
        {home.toReview > 0 &&
          row("review", plural(home.toReview, "new item to review", "new items to review"), "", () => router.navigate({ pathname: "/pantry/browse", params: { review: "1" } }), plural(home.toReview, "new item to review", "new items to review"))}

        {/* Aisle guesses from tags (27 Nov 2026): a single row, only when there are some for the store you're in. */}
        {guesses > 0 && !!store &&
          row("aisles", plural(guesses, "aisle guess", "aisle guesses") + " to check", `At ${store.name}, from your tags`, () => router.push("/aisle-guesses"), `${plural(guesses, "aisle guess", "aisle guesses")} to check at ${store.name}`)}
      </ScrollView>

      {/* The shop bar, fixed above the safe area (Isaac's choice, 26 Nov 2026); hidden with nothing to buy. */}
      {home.toBuy > 0 && (
        <View style={{ paddingHorizontal: space.screen, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: c.bg }}>
          <Press
            onPress={() => router.navigate("/list")}
            tint={c.focus.press}
            accessibilityLabel={`${plural(home.toBuy, "thing")} to buy${shopSub ? `. ${shopSub}` : ""}. Shop`}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.shopBar, borderRadius: radius.base, paddingVertical: 14, paddingHorizontal: 16 }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 18, lineHeight: 23, color: c.onShopBar }}>{plural(home.toBuy, "thing")} to buy</Text>
              {!!shopSub && <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 19, color: c.shopBarLabel }}>{shopSub}</Text>}
            </View>
            {/* Looks like the app's gold button; the whole bar is the one target. */}
            <View style={{ height: 44, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, borderRadius: radius.base, backgroundColor: c.focus.gold }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, letterSpacing: 0.9, textTransform: "uppercase", color: c.focus.onGold }}>Shop</Text>
              <ArrowRight size={18} color={c.focus.onGold} strokeWidth={2.25} />
            </View>
          </Press>
        </View>
      )}
    </View>
  )
}

/** Tonight: one recipe you can cook now, chosen for you. Another shows the next; the choice is kept while the app is open. */
function Tonight() {
  const { state } = useStore()
  const c = useColours()
  const { fontScale } = useWindowDimensions()
  const picks = tonightPicks(recipeRows(state.recipes, state.items))
  const [chosen, setChosen] = React.useState<string | null>(null)
  const at = Math.max(0, picks.findIndex((p) => p.recipe.id === chosen))
  const pick = picks[at]
  const label = tonightLabel()
  // At the largest text sizes the drawing goes, so the name has the room.
  const drawing = fontScale <= 1.35

  const another = () => {
    const next = picks[(at + 1) % picks.length]
    setChosen(next.recipe.id)
    AccessibilityInfo.announceForAccessibility(next.recipe.name)
  }
  const openRecipe = () => pick && router.navigate({ pathname: "/recipes/[id]", params: { id: pick.recipe.id } })

  const ink = c.onTonight
  const pot = drawing && <TonightPotArt size={104} colours={{ ink, body: c.potBody, knob: c.potKnob, stitch: c.tonight }} />
  const text = (body: string) => <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink }}>{body}</Text>
  const dark = { backgroundColor: c.focus.bg, borderColor: c.focus.bg }

  let content: React.ReactNode
  if (!state.recipes.length) {
    content = (
      <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Label colour={ink} style={small}>{label}</Label>
          {text("No recipes yet. Give one to Claude: paste it, share a link or send a file.")}
        </View>
        {pot}
      </View>
    )
  } else if (!pick) {
    content = (
      <>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Label colour={ink} style={small}>{label}</Label>
            {text("Nothing you can cook from what's in.")}
          </View>
          {pot}
        </View>
        <Button label="See recipes" height={52} style={dark} textColour={c.focus.ink} onPress={() => router.navigate("/recipes")} />
      </>
    )
  } else {
    const line = tonightLine(pick)
    content = (
      <>
        <Press
          onPress={openRecipe}
          tint="transparent"
          accessibilityRole="button"
          accessibilityLabel={`${label}. ${pick.recipe.name}. ${line.replace(" min", " minutes").replace(" · y", ". Y")}.`}
          style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <Label colour={ink} style={small}>{label}</Label>
            <Display size={28} colour={ink} accessibilityRole="text" style={{ textTransform: "none", letterSpacing: 0 }}>{pick.recipe.name}</Display>
            {text(line)}
          </View>
          {pot}
        </Press>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {/* Opens the recipe page, not the cooking view, so you check servings first (Isaac's choice, 26 Nov 2026). */}
          <Button label="Start cooking" height={52} style={[dark, { flex: 1 }]} textColour={c.focus.ink} onPress={openRecipe} />
          {picks.length > 1 && (
            <Button label="Another" accessibilityLabel="Another recipe" kind="quiet" height={52} textColour={ink} onPress={another} style={{ borderWidth: 1.5, borderColor: ink, paddingHorizontal: 16 }} />
          )}
        </View>
      </>
    )
  }

  return <View style={{ backgroundColor: c.tonight, borderRadius: radius.base, padding: 18, gap: 14 }}>{content}</View>
}
