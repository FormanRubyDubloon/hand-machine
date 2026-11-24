// Drawings for the phone, in the style of Collca's emblem on the web (prototypes/pantry-app/src/splash-emblem.tsx).
import * as React from "react"
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg"
import { font, SPLASH } from "./theme"

const INK = "#3D2B1F"

/** A leaf pointing along +x from the origin, for placing with translate/rotate. */
const LEAF = "M0 0 C 6 -7, 17 -7, 24 0 C 17 7, 6 7, 0 0 Z"

/** One sprig with fewer, larger leaves than the web emblem's, so it holds up at phone size. */
function Sprig({ flip, ink = INK }: { flip?: boolean; ink?: string }) {
  const leaves: [number, number, number][] = [[139, 296, -150], [136, 294, -35], [136, 258, -140], [140, 252, -45], [148, 214, -115]]
  return (
    <G transform={flip ? "translate(400 0) scale(-1 1)" : undefined}>
      <Path d="M142 322 C 130 285, 128 240, 152 196" fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" />
      {leaves.map(([x, y, a], k) => <Path key={k} d={LEAF} transform={`translate(${x} ${y}) rotate(${a}) scale(1.2)`} fill={ink} />)}
    </G>
  )
}

/**
 * "COLLCA" along the arch over the window, one letter at a time. react-native-svg's TextPath ignores the
 * centring (startOffset 50% with textAnchor middle) and runs the word off the right, so each letter is placed
 * and turned by hand. Widths are Georgia Bold at 80 pt, near enough to space them evenly.
 */
function ArchedName({ ink = INK }: { ink?: string }) {
  const letters: [string, number][] = [["C", 58], ["O", 64], ["L", 54], ["L", 54], ["C", 58], ["A", 60]]
  const gap = 4
  const r = 146
  const total = letters.reduce((n, [, w]) => n + w, 0) + gap * (letters.length - 1)
  let at = -total / 2
  return (
    <G>
      {letters.map(([ch, w], k) => {
        const mid = at + w / 2
        at += w + gap
        const a = mid / r
        const x = 200 + r * Math.sin(a)
        const y = 262 - r * Math.cos(a)
        return (
          <SvgText key={k} x={x} y={y} transform={`rotate(${(a * 180) / Math.PI} ${x} ${y})`} textAnchor="middle" fontFamily={font.serif} fontSize={80} fontWeight="700" fill={ink}>
            {ch}
          </SvgText>
        )
      })}
    </G>
  )
}

/**
 * The sign-in emblem: the web emblem cut down to its centre. "Collca" arched over the window, the jar between
 * two sprigs on a plain mound, one sparkle. The label copy, rosettes, stamps, dots and the jar's N°1 are gone:
 * at phone width they turned to texture, and the screen's own heading says the rest.
 *
 * `mono` draws it in one colour (Home, Isaac's change, 24 Nov 2026): `mono.ink` for every line and fill, and the jar
 * and its label dot cut out in `mono.cutout` (the page colour) instead of gold.
 */
export function SignInEmblem({ width = 220, mono }: { width?: number; mono?: { ink: string; cutout: string } }) {
  const ink = mono?.ink ?? INK
  const jar = mono?.cutout ?? SPLASH
  return (
    <Svg width={width} height={width * (340 / 400)} viewBox="0 0 400 340" accessibilityLabel="Collca">
      <ArchedName ink={ink} />

      {/* The window and its sill. */}
      <Path d="M108 330 V 240 A 92 92 0 0 1 292 240 V 330" fill="none" stroke={ink} strokeWidth={4} />
      <Line x1={92} y1={330} x2={308} y2={330} stroke={ink} strokeWidth={4} strokeLinecap="round" />

      {/* One sparkle above the jar. */}
      <Path d="M200 164 L203 173 L212 176 L203 179 L200 188 L197 179 L188 176 L197 173 Z" fill={ink} />

      <Sprig ink={ink} />
      <Sprig flip ink={ink} />

      {/* The mound, solid. */}
      <Path d="M110 330 Q 200 262 290 330 Z" fill={ink} />

      {/* The jar: lid, body cut out in the panel colour, a plain label band. */}
      <Rect x={180} y={214} width={40} height={13} rx={2} fill={ink} />
      <Path d="M184 227 V 234 Q 170 236 170 250 V 300 Q 170 310 180 310 H 220 Q 230 310 230 300 V 250 Q 230 236 216 234 V 227" fill={jar} stroke={ink} strokeWidth={3.5} strokeLinejoin="round" />
      <Rect x={171} y={256} width={58} height={22} fill={ink} />
      <Circle cx={200} cy={267} r={4} fill={jar} />
    </Svg>
  )
}

/**
 * The List's "Add to the list" icon: a jar, as on the emblem, with a plus where its label would be. 24-point grid
 * and a 2-point line, to sit with the Lucide icons around it.
 */
export function AddItemIcon({ size = 24, colour }: { size?: number; colour: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={colour} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 3 H16 V6 H8 Z" />
      <Path d="M9 6 V7.5 Q5 8.5 5 12 V19 Q5 21 7 21 H17 Q19 21 19 19 V12 Q19 8.5 15 7.5 V6" />
      <Path d="M12 11.5 V17.5 M9 14.5 H15" />
    </Svg>
  )
}
