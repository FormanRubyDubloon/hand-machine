// The shared pieces from the handoff's component table (section 4): text styles, buttons, steppers, chips,
// rows, pills, info boxes, fields and the aisle picker. Native components only (shadcn/ui doesn't run here);
// the tokens carry over from the web app as values.
import { Check, ChevronDown, ChevronLeft, Minus, Plus } from "lucide-react-native"
import * as React from "react"
import {
  Pressable, StyleSheet, Switch, Text, TextInput, View,
  type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from "react-native"
import { focus, font, radius, space, useColours, useReduceMotion, type Colours } from "./theme"

// ---------- text ----------

type TProps = TextProps & { colour?: string; style?: StyleProp<TextStyle> }

export function Body({ colour, style, ...p }: TProps) {
  const c = useColours()
  return <Text {...p} style={[{ fontFamily: font.regular, fontSize: 16, lineHeight: 22, color: colour ?? c.ink }, style]} />
}
export function Caption({ colour, style, ...p }: TProps) {
  const c = useColours()
  return <Text {...p} style={[{ fontFamily: font.regular, fontSize: 14, lineHeight: 19, color: colour ?? c.muted }, style]} />
}
/** The item name in list and pantry rows. */
export function Name({ colour, style, ...p }: TProps) {
  const c = useColours()
  return <Text {...p} style={[{ fontFamily: font.medium, fontSize: 18, lineHeight: 23, color: colour ?? c.ink }, style]} />
}
/** Serif, uppercase: aisle names, pantry locations, item names on their own page. */
export function Display({ colour, style, size = 30, ...p }: TProps & { size?: number }) {
  const c = useColours()
  return (
    <Text
      accessibilityRole="header"
      {...p}
      style={[{ fontFamily: font.serif, fontWeight: "700", fontSize: size, lineHeight: Math.round(size * 1.08), letterSpacing: size * 0.035, textTransform: "uppercase", color: colour ?? c.ink }, style]}
    />
  )
}
/** Small caps labels: tab labels, section labels, button text. */
export function Label({ colour, style, ...p }: TProps) {
  const c = useColours()
  return <Text {...p} style={[{ fontFamily: font.semibold, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: colour ?? c.muted }, style]} />
}

// ---------- pressing ----------

/**
 * Every tappable thing: scales to 0.97 with a pressed tint (90 ms in the prototype; native presses are instant).
 * `fade` is for tabs and the aisle name, which fade to 60% instead, so the header doesn't move.
 * Reduce Motion keeps the tint and drops the scale. Disabled things don't react.
 */
export function Press({ style, fade, tint, disabled, children, ...p }: PressableProps & { style?: StyleProp<ViewStyle>; fade?: boolean; tint?: string; children?: React.ReactNode; ref?: React.Ref<React.ComponentRef<typeof View>> }) {
  const c = useColours()
  const reduce = useReduceMotion()
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      {...p}
      style={({ pressed }) => [
        style,
        disabled && { opacity: 0.5 },
        pressed && !disabled && (fade ? { opacity: 0.6 } : { transform: reduce ? [] : [{ scale: 0.97 }] }),
      ]}
    >
      {({ pressed }) => (
        <>
          {children}
          {pressed && !disabled && !fade && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint ?? c.press, borderRadius: radius.base }]} />}
        </>
      )}
    </Pressable>
  )
}

// ---------- buttons ----------

export type Kind = "primary" | "secondary" | "quiet" | "danger" | "dangerFill" | "gold" | "goldOutline"

function kindStyle(kind: Kind, c: Colours): { box: ViewStyle; text: string } {
  switch (kind) {
    case "primary": return { box: { backgroundColor: c.olive, borderColor: c.olive }, text: c.onOlive }
    case "secondary": return { box: { backgroundColor: "transparent", borderColor: c.olive }, text: c.ink }
    case "quiet": return { box: { backgroundColor: "transparent", borderColor: "transparent" }, text: c.ink }
    case "danger": return { box: { backgroundColor: "transparent", borderColor: c.danger }, text: c.danger }
    case "dangerFill": return { box: { backgroundColor: c.danger, borderColor: c.danger }, text: c.onDanger }
    case "gold": return { box: { backgroundColor: focus.gold, borderColor: focus.gold }, text: focus.onGold }
    case "goldOutline": return { box: { backgroundColor: "transparent", borderColor: focus.gold }, text: focus.ink }
  }
}

export function Button({ kind = "primary", label, height = 56, onPress, disabled, style, textColour, icon, accessibilityLabel, ...p }: {
  kind?: Kind; label: string; height?: number; onPress?: () => void; disabled?: boolean; style?: StyleProp<ViewStyle>; textColour?: string; icon?: React.ReactNode; accessibilityLabel?: string
} & Omit<PressableProps, "style" | "children">) {
  const c = useColours()
  const k = kindStyle(kind, c)
  return (
    <Press
      {...p}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? label}
      tint={kind === "gold" || kind === "goldOutline" ? focus.press : undefined}
      style={[{ minHeight: height, paddingHorizontal: 18, borderWidth: 1, borderRadius: radius.base, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, k.box, style]}
    >
      {icon}
      <Text style={{ fontFamily: font.semibold, fontSize: 15, letterSpacing: 0.9, textTransform: "uppercase", color: textColour ?? k.text, textAlign: "center" }}>{label}</Text>
    </Press>
  )
}

/** Icon-only square button (always with a label for VoiceOver). */
export function IconButton({ label, onPress, children, size = 48, outline = true, filled, colour, disabled, style }: {
  label: string; onPress?: () => void; children: React.ReactNode; size?: number; outline?: boolean; filled?: boolean; colour?: string; disabled?: boolean; style?: StyleProp<ViewStyle>
}) {
  const c = useColours()
  return (
    <Press
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={size < 44 ? (44 - size) / 2 : 0}
      style={[{ width: size, height: size, borderRadius: radius.base, borderWidth: outline ? 1 : 0, borderColor: colour ?? c.olive, backgroundColor: filled ? (colour ?? c.olive) : "transparent", alignItems: "center", justifyContent: "center" }, style]}
    >
      {children}
    </Press>
  )
}

/** A text link back: "‹ Recipes". */
export function BackLink({ label, onPress, colour }: { label: string; onPress: () => void; colour?: string }) {
  const c = useColours()
  return (
    <Press fade onPress={onPress} accessibilityLabel={`Back to ${label}`} style={{ flexDirection: "row", alignItems: "center", minHeight: 44, paddingRight: 12, alignSelf: "flex-start" }}>
      <ChevronLeft size={22} color={colour ?? c.ink} strokeWidth={2} />
      <Text style={{ fontFamily: font.medium, fontSize: 16, color: colour ?? c.ink }}>{label}</Text>
    </Press>
  )
}

// ---------- stepper ----------

export function Stepper({ value, onChange, min = 0, max, label, display, dark, live = true }: {
  value: number; onChange: (n: number) => void; min?: number; max?: number; label: string; display?: string; dark?: boolean; live?: boolean
}) {
  const c = useColours()
  const ink = dark ? focus.ink : c.ink
  const border = dark ? focus.gold : c.olive
  const box: ViewStyle = { width: 44, height: 44, borderRadius: radius.base, borderWidth: 1, borderColor: border, alignItems: "center", justifyContent: "center" }
  return (
    <View accessibilityLabel={label} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Press accessibilityLabel={`Less: ${label}`} disabled={value <= min} onPress={() => onChange(value - 1)} style={box} tint={dark ? focus.press : undefined}>
        <Minus size={20} color={ink} strokeWidth={2} />
      </Press>
      <Text accessibilityLiveRegion={live ? "polite" : "none"} style={{ minWidth: 44, textAlign: "center", fontFamily: font.semibold, fontSize: 22, color: ink }}>{display ?? value}</Text>
      <Press accessibilityLabel={`More: ${label}`} disabled={max !== undefined && value >= max} onPress={() => onChange(value + 1)} style={box} tint={dark ? focus.press : undefined}>
        <Plus size={20} color={ink} strokeWidth={2} />
      </Press>
    </View>
  )
}

// ---------- choosing ----------

/** An on/off setting: its label (and a line under it) on the left, the system switch on the right. */
export function Toggle({ label, caption, value, onChange }: { label: string; caption?: string; value: boolean; onChange: (v: boolean) => void }) {
  const c = useColours()
  return (
    <View style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.medium, fontSize: 16, color: c.ink }}>{label}</Text>
        {!!caption && <Caption>{caption}</Caption>}
      </View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: c.olive, false: c.stone }} thumbColor={c.bg} ios_backgroundColor={c.stone} />
    </View>
  )
}

/** Two or three options; the chosen one is filled and heavier (not colour alone). */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  const c = useColours()
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", borderWidth: 1, borderColor: c.olive, borderRadius: radius.base, overflow: "hidden" }}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <Press key={o.value} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)} style={{ flex: 1, minHeight: 44, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", backgroundColor: on ? c.olive : "transparent" }}>
            <Text numberOfLines={1} style={{ fontFamily: on ? font.bold : font.medium, fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase", color: on ? c.onOlive : c.ink }}>{o.label}</Text>
          </Press>
        )
      })}
    </View>
  )
}

export function Chip({ label, on, onPress, dashed, icon, accessibilityLabel }: { label: string; on?: boolean; onPress: () => void; dashed?: boolean; icon?: React.ReactNode; accessibilityLabel?: string }) {
  const c = useColours()
  return (
    <Press
      accessibilityState={{ selected: !!on }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderStyle: dashed ? "dashed" : "solid", borderColor: on ? c.olive : c.stone, backgroundColor: on ? c.olive : "transparent", flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" }}
    >
      <Text style={{ fontFamily: on ? font.bold : font.medium, fontSize: 15, color: on ? c.onOlive : c.ink }}>{label}</Text>
      {icon}
    </Press>
  )
}

export function Pill({ label, tone = "panel" }: { label: string; tone?: "panel" | "olive" }) {
  const c = useColours()
  return (
    <View style={{ height: 22, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: tone === "olive" ? c.olive : c.panel, justifyContent: "center", alignSelf: "flex-start" }}>
      <Text style={{ fontFamily: font.bold, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: tone === "olive" ? c.onOlive : c.ink }}>{label}</Text>
    </View>
  )
}

export function InfoBox({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColours()
  return <View style={[{ backgroundColor: c.panel, borderRadius: radius.base, padding: 14, gap: 10 }, style]}>{children}</View>
}

// ---------- fields ----------

export type FieldRef = React.ComponentRef<typeof TextInput>

export function Field({ label, labelColour, dark, style, ref, ...p }: TextInputProps & { label?: string; labelColour?: string; dark?: boolean; ref?: React.Ref<FieldRef> }) {
  const c = useColours()
  const [focused, setFocused] = React.useState(false)
  const input = (
    <TextInput
      ref={ref}
      placeholderTextColor={dark ? focus.placeholder : c.placeholder}
      accessibilityLabel={p.accessibilityLabel ?? label ?? p.placeholder}
      {...p}
      onFocus={(e) => { setFocused(true); p.onFocus?.(e) }}
      onBlur={(e) => { setFocused(false); p.onBlur?.(e) }}
      style={[{
        minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.base, borderWidth: 1,
        borderColor: focused ? (dark ? focus.gold : c.olive) : dark ? focus.line : c.stone,
        backgroundColor: dark ? focus.field : c.bg, color: dark ? focus.ink : c.ink, fontFamily: font.regular, fontSize: 17,
      }, style]}
    />
  )
  if (!label) return input
  return (
    <View style={{ gap: 6 }}>
      <Label colour={labelColour ?? (dark ? focus.label : undefined)}>{label}</Label>
      {input}
    </View>
  )
}

/**
 * The aisle picker: a button showing "Aisle 1 · Fruit & veg" that opens a list in place, with ✓ on the current
 * choice. Not the system picker, so the aisle numbers show.
 */
/**
 * A dropdown: the choice in a field, the options listed under it when opened. Options with a `num` (an aisle
 * number) show it in a column; the store picker's don't (Batch 2, 24 Nov 2026).
 */
export function AislePicker({ label, value, options, onPick, dark, placeholder = "Choose an aisle" }: {
  label: string; value: string; options: { id: string; num?: string; name: string }[]; onPick: (id: string) => void; dark?: boolean; placeholder?: string
}) {
  const c = useColours()
  const [open, setOpen] = React.useState(false)
  const ink = dark ? focus.ink : c.ink
  const border = dark ? focus.line : c.stone
  const current = options.find((o) => o.id === value)
  return (
    <View style={{ gap: 6 }}>
      <Label colour={dark ? focus.label : undefined}>{label}</Label>
      <Press
        accessibilityLabel={`${label}: ${current ? [current.num, current.name].filter(Boolean).join(" ") : "none"}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        tint={dark ? focus.press : undefined}
        style={{ minHeight: 52, borderWidth: 1, borderColor: border, borderRadius: radius.base, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: dark ? focus.field : "transparent" }}
      >
        <Text style={{ fontFamily: font.medium, fontSize: 17, color: ink, flex: 1 }}>{current ? [current.num, current.name].filter(Boolean).join(" · ") : placeholder}</Text>
        <ChevronDown size={20} color={ink} style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }} />
      </Press>
      {open && (
        <View style={{ borderWidth: 1, borderColor: border, borderRadius: radius.base, overflow: "hidden" }}>
          {options.map((o, k) => {
            const on = o.id === value
            return (
              <Press
                key={o.id}
                accessibilityState={{ selected: on }}
                onPress={() => { onPick(o.id); setOpen(false) }}
                tint={dark ? focus.press : undefined}
                style={{ minHeight: 48, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: k ? 1 : 0, borderTopColor: border, backgroundColor: on ? (dark ? focus.field : c.panel) : "transparent" }}
              >
                {o.num !== undefined && <Text style={{ width: 64, fontFamily: font.semibold, fontSize: 14, color: dark ? focus.label : c.muted }}>{o.num}</Text>}
                <Text style={{ flex: 1, fontFamily: on ? font.bold : font.regular, fontSize: 17, color: ink }}>{o.name}</Text>
                {on && <Check size={20} color={ink} />}
              </Press>
            )
          })}
        </View>
      )}
    </View>
  )
}

/** The same dropdown, for choices that aren't aisles. */
export const Picker = AislePicker

// ---------- layout ----------

export function Divider({ colour }: { colour?: string }) {
  const c = useColours()
  return <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: colour ?? c.line }} />
}

/** A row with a name and caption on the left and something on the right. */
export function Row({ children, right, onPress, label, minHeight = 68, style }: {
  children: React.ReactNode; right?: React.ReactNode; onPress?: () => void; label?: string; minHeight?: number; style?: StyleProp<ViewStyle>
}) {
  const c = useColours()
  const inner = (
    <>
      <View style={{ flex: 1, gap: 3, paddingVertical: 10 }}>{children}</View>
      {right}
    </>
  )
  const box: ViewStyle = { minHeight, flexDirection: "row", alignItems: "center", gap: space.row, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: c.line }
  if (!onPress) return <View style={[box, style]}>{inner}</View>
  return <Press accessibilityLabel={label} onPress={onPress} style={[box, style]}>{inner}</Press>
}
