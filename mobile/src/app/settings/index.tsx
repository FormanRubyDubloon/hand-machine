// SETTINGS (full screen, from ☰): account, theme, stores, asking for aisles, tags, how syncing is going, and Sign out.
import Constants from "expo-constants"
import { router } from "expo-router"
import { ChevronRight } from "lucide-react-native"
import * as React from "react"
import { Modal, ScrollView, Text, View } from "react-native"
import { DEMO } from "../../data/supabase"
import { useStore } from "../../data/store"
import type { Theme } from "../../data/state"
import { initials, plural, whenText } from "../../logic/phrases"
import { addTag } from "../../logic/actions"
import { Button, Caption, Field, Label, Press, Segmented, Toggle } from "../../ui/kit"
import { useLeaveSettings } from "../../ui/leave-settings"
import { SheetHeader } from "../../ui/sheet"
import { font, radius, useColours } from "../../ui/theme"

export default function Settings() {
  const { state, local, change, say, status, online, pending, syncNow, signOut } = useStore()
  const [tag, setTag] = React.useState("")
  const c = useColours()
  const [asking, setAsking] = React.useState(false)
  const leave = useLeaveSettings()
  const email = state.owner?.email ?? ""
  const offline = !online || status === "offline"
  const syncLine = status === "syncing"
    ? "Syncing…"
    : offline
      ? pending ? `No signal. ${plural(pending, "change")} saved on this phone.` : "No signal. Everything here is saved on this phone."
      : status === "error"
        ? "The last sync didn't go through. It tries again by itself."
        : state.syncedAt ? `Up to date. Last synced ${whenText(state.syncedAt)}.` : "Not synced yet."
  const themeNote = state.theme === "system" ? "Follows your phone's appearance." : state.theme === "dark" ? "Dark, whatever your phone is set to." : "Light, whatever your phone is set to."

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SheetHeader title="Settings" full onDone={() => leave(tag.trim())} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 48 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.olive, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: font.bold, fontSize: 18, color: c.onOlive }}>{initials(email)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Caption>Signed in as</Caption>
            <Text style={{ fontFamily: font.medium, fontSize: 17, color: c.ink }}>{email}</Text>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Label>Theme</Label>
          <Segmented<Theme> label="Theme" value={state.theme} onChange={(t) => local((s) => ({ ...s, theme: t }))} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "Match phone" }]} />
          <Caption>{themeNote}</Caption>
        </View>

        <View style={{ gap: 8 }}>
          <Label>Shopping</Label>
          <Press onPress={() => router.push("/settings/stores")} style={{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.medium, fontSize: 18, color: c.ink }}>Stores</Text>
              <Caption>{plural(state.stores.length, "store")} · shopping at {state.stores.find((s) => s.id === state.storeId)?.name ?? "none"}</Caption>
            </View>
            <ChevronRight size={22} color={c.muted} />
          </Press>
          {/* Batch 4, 24 Nov 2026: kept on this phone, not synced. */}
          <Toggle
            label="Ask for the aisle after ticking off"
            caption={state.noAislePrompt ? "Off. Set an item's aisle from the item, or from the store's Aisles." : "When something has no aisle in the store you're in."}
            value={!state.noAislePrompt}
            onChange={(on) => local((s) => ({ ...s, noAislePrompt: on ? undefined : true }))}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Label>Tags</Label>
          <Caption>{plural(state.categories.length, "tag")}. Give items their tags, and rename or remove tags, in Collca on the web.</Caption>
          <Field label="Add a tag" value={tag} onChangeText={setTag} placeholder="e.g. World foods" />
          <Button
            kind="secondary"
            label="Add"
            disabled={!tag.trim()}
            onPress={() => {
              const made = addTag(state, tag)
              if (!made) return say(`There's already a tag called ${tag.trim()}.`)
              change(() => made.state, { title: `Added a tag: ${tag.trim()}` })
              say(`Added the tag ${tag.trim()}.`)
              setTag("")
            }}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Label>Sync</Label>
          <Text accessibilityLiveRegion="polite" style={{ fontFamily: font.regular, fontSize: 16, lineHeight: 22, color: c.ink }}>{syncLine}</Text>
          <Caption>Changes go to your pantry by themselves, and changes from Collca on the web and Claude arrive by themselves.</Caption>
          {(status === "error" || (pending > 0 && !offline)) && <Button kind="secondary" height={44} label="Try now" onPress={() => void syncNow()} />}
        </View>

        <Button kind="danger" label="Sign out" onPress={() => setAsking(true)} />
        <Caption style={{ textAlign: "center" }}>Collca {Constants.expoConfig?.version ?? "0.1"} · {DEMO ? "Demo" : "TestFlight"}</Caption>
      </ScrollView>

      <SignOutDialog
        open={asking}
        pending={pending}
        canSync={!offline}
        onCancel={() => setAsking(false)}
        onSyncOut={async () => {
          const ok = await syncNow()
          if (ok) {
            setAsking(false)
            await signOut()
          }
        }}
        onOut={async () => {
          setAsking(false)
          await signOut()
        }}
      />
    </View>
  )
}

function SignOutDialog({ open, pending, canSync, onCancel, onSyncOut, onOut }: { open: boolean; pending: number; canSync: boolean; onCancel: () => void; onSyncOut: () => void; onOut: () => void }) {
  const c = useColours()
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 16 }}>
        <View accessibilityRole="alert" style={{ backgroundColor: c.bg, borderRadius: radius.dialog, padding: 20, gap: 12 }}>
          <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 20, color: c.ink }}>Sign out of Collca?</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 16, lineHeight: 22, color: c.ink }}>
            {pending ? `${plural(pending, "change")} haven't synced yet. If you sign out now, they will be lost.` : "Everything is synced. Your pantry stays safe, and you can sign in again any time."}
          </Text>
          {pending > 0 && canSync && <Button label="Sync, then sign out" onPress={onSyncOut} />}
          <Button kind={pending ? "danger" : "primary"} label={pending ? "Sign out and lose changes" : "Sign out"} onPress={onOut} />
          <Button kind="quiet" label="Cancel" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  )
}
