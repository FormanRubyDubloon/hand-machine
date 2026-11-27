// The shared pieces from the handoff's component table (section 4): text styles, buttons, steppers, chips,
// rows, pills, info boxes, fields and the aisle picker. Native components only (shadcn/ui doesn't run here);
// the tokens carry over from the web app as values.
import { Check, ChevronDown, ChevronRight, ChevronLeft, Minus, Plus } from "lucide-react-native"
import * as React from "react"
import {
  Pressable, StyleSheet, Switch, Text, TextInput, View,
  type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from "react-native"
import { font, radius, space, useColours, useReduceMotion, type Colours } from "./theme"

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
    case "primary": return { box: { backgroundColor: c.primary, borderColor: c.primary }, text: c.onPrimary }
    case "secondary": return { box: { backgroundColor: "transparent", borderColor: c.primary }, text: c.ink }
    case "quiet": return { box: { backgroundColor: "transparent", borderColor: "transparent" }, text: c.ink }
    case "danger": return { box: { backgroundColor: "transparent", borderColor: c.danger }, text: c.danger }
    case "dangerFill": return { box: { backgroundColor: c.danger, borderColor: c.danger }, text: c.onDanger }
    case "gold": return { box: { backgroundColor: c.focus.gold, borderColor: c.focus.gold }, text: c.focus.onGold }
    case "goldOutline": return { box: { backgroundColor: "transparent", borderColor: c.focus.gold }, text: c.focus.ink }
  }
}

export function Button({ kind = "primary", label, height = 56, onPress, disabled, style, textColour, icon, accessibilityLabel, ...p }: {
  kind?: Kind; label: string; height?: number; onPress?: () => void; disabled?: boolean; style?: StyleProp<ViewStyle>; textColour?: string; icon?: React.ReactNode; accessibilityLabel?: string
} & Omit<PressableProps, "style" | "children">) {
  const c = useColours()
  const { focus } = c
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
      style={[{ width: size, height: size, borderRadius: radius.base, borderWidth: outline ? 1 : 0, borderColor: colour ?? c.primary, backgroundColor: filled ? (colour ?? c.primary) : "transparent", alignItems: "center", justifyContent: "center" }, style]}
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
  const { focus } = c
  const ink = dark ? focus.ink : c.ink
  const border = dark ? focus.gold : c.primary
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
/** A switch with its label. `leading` puts the switch on the left, before the label (the list's Show ordered items). */
export function Toggle({ label, caption, value, onChange, leading }: { label: string; caption?: string; value: boolean; onChange: (v: boolean) => void; leading?: boolean }) {
  const c = useColours()
  const sw = <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: c.primary, false: c.stone }} thumbColor={c.bg} ios_backgroundColor={c.stone} />
  return (
    <View style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12 }}>
      {leading && sw}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.medium, fontSize: 16, color: c.ink }}>{label}</Text>
        {!!caption && <Caption>{caption}</Caption>}
      </View>
      {!leading && sw}
    </View>
  )
}

/** Two or three options; the chosen one is filled and heavier (not colour alone). */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  const c = useColours()
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", borderWidth: 1, borderColor: c.primary, borderRadius: radius.base, overflow: "hidden" }}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <Press key={o.value} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)} style={{ flex: 1, minHeight: 44, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", backgroundColor: on ? c.primary : "transparent" }}>
            <Text numberOfLines={1} style={{ fontFamily: on ? font.bold : font.medium, fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase", color: on ? c.onPrimary : c.ink }}>{o.label}</Text>
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
      style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderStyle: dashed ? "dashed" : "solid", borderColor: on ? c.primary : c.stone, backgroundColor: on ? c.primary : "transparent", flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" }}
    >
      <Text style={{ fontFamily: on ? font.bold : font.medium, fontSize: 15, color: on ? c.onPrimary : c.ink }}>{label}</Text>
      {icon}
    </Press>
  )
}

export function Pill({ label, tone = "panel" }: { label: string; tone?: "panel" | "primary" }) {
  const c = useColours()
  return (
    <View style={{ height: 22, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: tone === "primary" ? c.primary : c.panel, justifyContent: "center", alignSelf: "flex-start" }}>
      <Text style={{ fontFamily: font.bold, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: tone === "primary" ? c.onPrimary : c.ink }}>{label}</Text>
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
  const { focus } = c
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
        borderColor: focused ? (dark ? focus.gold : c.primary) : dark ? focus.line : c.input,
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
 * A dropdown: the choice in a field, the options listed under it when opened. Options with a `num` show it in a
 * column (Batch 2, 24 Nov 2026).
 */
export function Picker({ label, value, options, onPick, dark, placeholder = "Choose one" }: {
  label: string; value: string; options: { id: string; num?: string; name: string }[]; onPick: (id: string) => void; dark?: boolean; placeholder?: string
}) {
  const c = useColours()
  const { focus } = c
  const [open, setOpen] = React.useState(false)
  const ink = dark ? focus.ink : c.ink
  const border = dark ? focus.line : c.input
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

/**
 * An item's aisle in the store you're in, as a field (Batch 4, 24 Nov 2026). It opens the Which aisle? sheet rather
 * than a dropdown, since an aisle can be any number or a named place.
 */
/** `guess`: the value is a guess from the item's tags, not set yet (27 Nov 2026); it shows a Guess pill, and `why` is read out. */
export function AisleField({ label, value, onPress, dark, guess, why }: { label: string; value: string | null; onPress: () => void; dark?: boolean; guess?: boolean; why?: string }) {
  const c = useColours()
  const { focus } = c
  const ink = dark ? focus.ink : c.ink
  return (
    <View style={{ gap: 6 }}>
      <Label colour={dark ? focus.label : undefined}>{label}</Label>
      <Press
        accessibilityLabel={`${label}: ${value ?? "none yet"}${guess ? `, a guess${why ? `. ${why}` : ""}` : ""}. Change`}
        onPress={onPress}
        tint={dark ? focus.press : undefined}
        style={{ minHeight: 52, borderWidth: 1, borderColor: dark ? focus.line : c.input, borderRadius: radius.base, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: dark ? focus.field : "transparent" }}
      >
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontFamily: font.medium, fontSize: 17, color: value ? ink : dark ? focus.label : c.muted }}>{value ?? "None yet"}</Text>
          {guess && <View style={{ alignSelf: "center" }}><Pill label="Guess" /></View>}
        </View>
        <ChevronRight size={20} color={ink} />
      </Press>
    </View>
  )
}

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
