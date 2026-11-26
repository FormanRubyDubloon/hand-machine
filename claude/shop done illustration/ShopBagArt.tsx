// Shop done: a string bag of shopping (DONE-F, 26 Nov 2026). Paste into mobile/src/ui/art.tsx.
// art.tsx already imports Svg, Circle, G, Path and Rect from react-native-svg; add Ellipse to that import.
// Unlike the emblem drawings this one is in several colours, so it takes a set of colours, not one ink.

/** The colours the string bag is drawn in. See shop-bag-illustration.md for which theme token each one is. */
export type ShopBagColours = {
  /** The net and its handle. */
  net: string
  /** The baguette. */
  bread: string
  /** The slashes on the baguette. */
  cut: string
  /** The leek's leaves and the orange's leaf. */
  leaf: string
  /** The leek's stalk. */
  stalk: string
  /** The vegetable at the bottom of the bag. */
  veg: string
  orange: string
  apple: string
  /** The apple's stalk. */
  stem: string
}

/**
 * Shop done: a net bag with a baguette and a leek sticking out, an orange, an apple and a green vegetable.
 * Drawn on a 140 x 208 grid. Decorative, so it is hidden from VoiceOver like the other drawings.
 */
export function ShopBagArt({ width = 118, colours: c }: { width?: number; colours: ShopBagColours }) {
  return (
    <Svg width={width} height={width * (208 / 140)} viewBox="30 4 140 208" accessible={false}>
      {/* The baguette, with three slashes. */}
      <G transform="translate(130 36) rotate(15)">
        <Rect x={-10} y={0} width={20} height={112} rx={10} fill={c.bread} />
        <Path d="M-4 16 L4 23 M-4 34 L4 41 M-4 52 L4 59" fill="none" stroke={c.cut} strokeWidth={2} strokeLinecap="round" />
      </G>

      {/* The leek: two leaves, then the stalk over them. */}
      <Path d="M70 70 C54 48 50 28 56 10 C68 24 76 46 80 68 Z M78 68 C78 42 86 24 98 14 C98 34 94 52 88 70 Z" fill={c.leaf} />
      <Rect x={-7} y={0} width={14} height={84} rx={7} transform="translate(76 62) rotate(-8)" fill={c.stalk} />

      {/* The orange and its leaf. */}
      <Circle cx={76} cy={150} r={24} fill={c.orange} />
      <Path d="M76 128 C78 120 86 118 92 120 C90 126 84 130 76 128 Z" fill={c.leaf} />

      {/* The apple and its stalk. */}
      <Circle cx={124} cy={158} r={20} fill={c.apple} />
      <Path d="M124 140 C124 134 126 131 129 129" fill="none" stroke={c.stem} strokeWidth={2.5} strokeLinecap="round" />

      {/* The vegetable at the bottom of the bag. */}
      <Ellipse cx={100} cy={188} rx={24} ry={11} fill={c.veg} />

      {/* The net, drawn last so it sits over everything: handle, rim, then the mesh. */}
      <G fill="none" stroke={c.net} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M62 84 C54 12 146 12 138 84" strokeWidth={4} />
        <Path d="M44 84 H156" strokeWidth={4} />
        <Path
          d="M48 84 C38 128 44 192 100 206 C156 192 162 128 152 84 M45 110 Q100 121 155 110 M44 136 Q100 149 156 136 M49 162 Q100 177 151 162 M64 187 Q100 199 136 187 M72 84 C64 130 70 180 84 203 M100 84 V206 M128 84 C136 130 130 180 116 203"
          strokeWidth={2.5}
        />
      </G>
    </Svg>
  )
}

// Use, in mobile/src/ui/shop-done.tsx, in place of <ShopDoneArt width={150} ink={focus.gold} cutout={focus.bg} />:
//
//   <ShopBagArt
//     width={118}
//     colours={{
//       net: focus.gold,
//       bread: focus.place,
//       cut: focus.bg,
//       leaf: "#8FA486", // no token yet: see the note
//       stalk: focus.label,
//       veg: "#8FA486", // the same missing token
//       orange: c.navActive,
//       apple: focus.danger,
//       stem: focus.place,
//     }}
//   />
