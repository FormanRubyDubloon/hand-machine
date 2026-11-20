// The three sections, with the tab bar at the top (decided on the canvas, the "TOP" row) and Settings on the
// right. Tapping the tab you're on takes that section back to its first screen.
// Under the tabs, a one-line note shows only when something is waiting: no signal, or a sync that failed.
import { router, usePathname } from "expo-router"
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from "expo-router/ui"
import { BookOpen, CloudOff, List, Menu, Package, type LucideIcon } from "lucide-react-native"
import * as React from "react"
import { Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useStore } from "../../data/store"
import { Press } from "../../ui/kit"
import { font, useColours } from "../../ui/theme"
import { plural } from "../../logic/phrases"

const TABS = [
  { name: "list", href: "/list", label: "List", icon: List },
  { name: "recipes", href: "/recipes", label: "Recipes", icon: BookOpen },
  { name: "pantry", href: "/pantry", label: "Pantry", icon: Package },
] as const

export default function TabsLayout() {
  const c = useColours()
  const insets = useSafeAreaInsets()
  return (
    <Tabs style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <TabList style={{ flexDirection: "row", alignItems: "flex-end", gap: 16, paddingHorizontal: 20, paddingTop: 6, borderBottomWidth: 1, borderBottomColor: c.line }}>
        {TABS.map((t) => (
          <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
            <TabButton label={t.label} icon={t.icon} root={t.href} />
          </TabTrigger>
        ))}
        <View style={{ flex: 1 }} />
        <Press fade accessibilityLabel="Settings" onPress={() => router.push("/settings")} style={{ width: 40, height: 48, alignItems: "flex-end", justifyContent: "center" }}>
          <Menu size={24} color={c.ink} strokeWidth={2} />
        </Press>
      </TabList>
      <SyncNote />
      <TabSlot style={{ flex: 1 }} />
    </Tabs>
  )
}

function TabButton({ label, icon: Icon, isFocused, root, onPress, ref, ...p }: Omit<TabTriggerSlotProps, "ref"> & { label: string; icon: LucideIcon; root: string; ref?: React.Ref<React.ComponentRef<typeof View>> }) {
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
      style={{ height: 48, flexDirection: "row", alignItems: "center", gap: 5, borderBottomWidth: 3, borderBottomColor: isFocused ? c.olive : "transparent" }}
    >
      <Icon size={17} color={isFocused ? c.ink : c.muted} strokeWidth={2} />
      <Text style={{ fontFamily: font.semibold, fontSize: 14, letterSpacing: 1.1, textTransform: "uppercase", color: isFocused ? c.ink : c.muted }}>{label}</Text>
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
