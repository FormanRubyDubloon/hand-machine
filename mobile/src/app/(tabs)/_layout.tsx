// Home and the three sections, with the tab bar at the top (decided on the canvas, the "TOP" row), then search and
// Settings on the right. Batch 5 (24 Nov 2026, Isaac's choice of the sketches): the Collca emblem is the Home tab,
// and the section tabs are words only, so it all still fits on one row at 390 points.
// Tapping the tab you're on takes that section back to its first screen.
// Under the tabs, a one-line note shows only when something is waiting: no signal, or a sync that failed.
import { router, usePathname } from "expo-router"
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from "expo-router/ui"
import { CloudOff, Menu, Search } from "lucide-react-native"
import * as React from "react"
import { ActivityIndicator, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useStore } from "../../data/store"
import { Press } from "../../ui/kit"
import { font, radius, useColours } from "../../ui/theme"
import { plural } from "../../logic/phrases"

const TABS = [
  { name: "list", href: "/list", label: "List" },
  { name: "recipes", href: "/recipes", label: "Recipes" },
  { name: "pantry", href: "/pantry", label: "Pantry" },
] as const

export default function TabsLayout() {
  const c = useColours()
  const insets = useSafeAreaInsets()
  return (
    <Tabs style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <TabList style={{ flexDirection: "row", alignItems: "flex-end", gap: 16, paddingHorizontal: 20, paddingTop: 6, borderBottomWidth: 1, borderBottomColor: c.line }}>
        <TabTrigger name="home" href="/home" asChild>
          <TabButton label="Home" root="/home" emblem />
        </TabTrigger>
        {TABS.map((t) => (
          <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
            <TabButton label={t.label} root={t.href} />
          </TabTrigger>
        ))}
        <View style={{ flex: 1 }} />
        {/* Search sits close to Settings, with the spinner (only while syncing) between them (Isaac's change). */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <SearchButton />
          <SyncSpinner />
          <AccountButton />
        </View>
      </TabList>
      <SyncNote />
      <TabSlot style={{ flex: 1 }} />
    </Tabs>
  )
}

/** Settings: a menu icon (Isaac's change, 26 Nov 2026; it was the account's first letter in a circle). */
function AccountButton() {
  const c = useColours()
  const { state } = useStore()
  const email = state.owner?.email ?? ""
  return (
    <Press
      fade
      accessibilityRole="button"
      accessibilityLabel={email ? `Settings, signed in as ${email}` : "Settings"}
      onPress={() => router.push("/settings")}
      style={{ width: 40, height: 48, alignItems: "flex-end", justifyContent: "center" }}
    >
      <Menu size={24} color={c.ink} strokeWidth={2} />
    </Press>
  )
}

/** Search across the list, the pantry and recipes (Batch 5). */
function SearchButton() {
  const c = useColours()
  return (
    <Press fade accessibilityRole="button" accessibilityLabel="Search" onPress={() => router.push("/search")} hitSlop={{ left: 6 }} style={{ width: 40, height: 48, alignItems: "flex-end", justifyContent: "center", paddingRight: 6 }}>
      <Search size={22} color={c.ink} strokeWidth={2} />
    </Press>
  )
}

/** The Collca emblem: a ringed C in the display serif. It stands for Home (Batch 5). */
function Emblem({ on }: { on: boolean }) {
  const c = useColours()
  return (
    <View style={{ width: 28, height: 28, borderRadius: radius.pill, borderWidth: 1.5, borderColor: c.primary, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: font.serif, fontWeight: "700", fontSize: 15, lineHeight: 18, color: on ? c.ink : c.primary }}>C</Text>
    </View>
  )
}

function TabButton({ label, emblem, isFocused, root, onPress, ref, ...p }: Omit<TabTriggerSlotProps, "ref"> & { label: string; emblem?: boolean; root: string; ref?: React.Ref<React.ComponentRef<typeof View>> }) {
  const c = useColours()
  const path = usePathname()
  return (
    <Press
      {...p}
      ref={ref}
      fade
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={label}
      onPress={(e) => {
        // Already here: back to this section's first screen.
        if (isFocused && path !== root) router.dismissTo(root as never)
        else onPress?.(e)
      }}
      style={{ height: 48, flexDirection: "row", alignItems: "center", gap: 5, borderBottomWidth: 3, borderBottomColor: isFocused ? c.navActive : "transparent" }}
    >
      {emblem ? <Emblem on={!!isFocused} /> : <Text style={{ fontFamily: font.semibold, fontSize: 14, letterSpacing: 1.1, textTransform: "uppercase", color: isFocused ? c.ink : c.muted }}>{label}</Text>}
    </Press>
  )
}

/** Shown only when the phone and the pantry aren't in step: no signal, or a sync that failed. */
function SyncNote() {
  const c = useColours()
  const { status, online, pending, syncNow, lastError } = useStore()
  const offline = !online || status === "offline"
  if (!(offline && pending) && status !== "error") return null
  const text = status === "error"
    ? `Couldn't sync${lastError ? `: ${lastError}` : ""}. Tap to try again.`
    : `No signal. ${plural(pending, "change")} saved on this phone, sent when you're back online.`
  return (
    <Press fade onPress={() => void syncNow()} accessibilityRole="button" accessibilityLabel={text} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: c.panel }}>
      <CloudOff size={16} color={c.ink} />
      <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: c.ink }}>{text}</Text>
    </Press>
  )
}

/**
 * A small spinner beside the account button while the app syncs by itself. Hidden while a pulled-down list shows its own
 * spinner, so there's only ever one.
 */
function SyncSpinner() {
  const c = useColours()
  const { status, pulling } = useStore()
  if (status !== "syncing" || pulling) return null
  return (
    <View accessibilityLabel="Syncing" accessibilityLiveRegion="polite" style={{ height: 48, justifyContent: "center" }}>
      <ActivityIndicator size="small" color={c.muted} />
    </View>
  )
}
