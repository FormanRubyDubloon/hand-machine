// The splash page's emblem: an old-fashioned pantry label, one colour, drawn in SVG. "Collca" arches over a
// window with a jar between two sprigs on a dotted mound; the three phrases sit below like label copy.
// Everything is currentColor, except the dots and the jar's label, which are cut out in the panel colour
// (--primary), so it follows the theme. Original drawing; the reference was only for the genre.

/** A leaf pointing along +x from the origin, for placing with translate/rotate. */
const LEAF = "M0 0 C 6 -7, 17 -7, 24 0 C 17 7, 6 7, 0 0 Z"

/** One sprig: a curved stem with leaves either side. `flip` mirrors it for the right-hand side. */
function Sprig({ flip }: { flip?: boolean }) {
  const leaves: [number, number, number][] = [
    [139, 300, -150], [136, 300, -40],
    [133, 274, -145], [134, 272, -45],
    [134, 248, -140], [138, 244, -50],
    [140, 222, -135], [145, 218, -60],
    [149, 199, -120],
  ]
  return (
    <g transform={flip ? "translate(400 0) scale(-1 1)" : undefined}>
      <path d="M142 322 C 130 285, 128 240, 152 196" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
      {leaves.map(([x, y, a], k) => (
        <path key={k} d={LEAF} transform={`translate(${x} ${y}) rotate(${a})`} fill="currentColor" />
      ))}
    </g>
  )
}

/** An eight-petal rosette, centred on (x, y). */
function Rosette({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="none" stroke="currentColor" strokeWidth={1.6}>
      {Array.from({ length: 8 }, (_, k) => (
        <ellipse key={k} cx={0} cy={-8} rx={3.4} ry={7} transform={`rotate(${k * 45})`} />
      ))}
      <circle r={2.6} fill="currentColor" />
    </g>
  )
}

/** A four-point sparkle centred on (x, y). */
function Sparkle({ x, y, r }: { x: number; y: number; r: number }) {
  const q = r * 0.22
  return <path d={`M${x} ${y - r} L${x + q} ${y - q} L${x + r} ${y} L${x + q} ${y + q} L${x} ${y + r} L${x - q} ${y + q} L${x - r} ${y} L${x - q} ${y - q} Z`} fill="currentColor" />
}

// Dots on the mound, in rows, cut out in the panel colour.
const moundDots: [number, number][] = []
for (let row = 0; row < 4; row++) {
  const y = 312 + row * 6
  for (let x = 118 + (row % 2) * 6; x <= 282; x += 12) {
    // Only where the mound is: above its curved top edge (y = 330 - 34·(1 - ((x-200)/90)²)).
    const top = 330 - 34 * (1 - ((x - 200) / 90) ** 2)
    if (y > top + 3 && y < 328) moundDots.push([x, y])
  }
}

// Jar contents: dots in the lower half of the jar.
const jarDots: [number, number][] = []
for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) jarDots.push([180 + col * 10 + (row % 2) * 5, 282 + row * 6])

export function SplashEmblem({ className }: { className?: string }) {
  const cut = "var(--primary)"
  return (
    <svg viewBox="0 0 400 520" className={className} aria-hidden="true" focusable="false">
      <defs>
        <path id="emblem-arch-text" d="M54 262 A 146 146 0 0 1 346 262" />
        <path id="emblem-smile-text" d="M118 452 Q 200 492 282 452" />
      </defs>

      {/* "Collca", the app's name, arched over the window. */}
      <text className="font-serif" fontSize={80} fontWeight={700} letterSpacing={2} fill="currentColor">
        <textPath href="#emblem-arch-text" startOffset="50%" textAnchor="middle">COLLCA</textPath>
      </text>

      {/* The window. */}
      <path d="M108 330 V 240 A 92 92 0 0 1 292 240 V 330" fill="none" stroke="currentColor" strokeWidth={3} />
      <line x1={92} y1={330} x2={308} y2={330} stroke="currentColor" strokeWidth={3} strokeLinecap="round" />

      <Sparkle x={200} y={176} r={9} />
      <Sparkle x={168} y={196} r={5} />
      <Sparkle x={232} y={196} r={5} />

      <Sprig />
      <Sprig flip />

      {/* The mound, dotted. */}
      <path d="M110 330 Q 200 262 290 330 Z" fill="currentColor" />
      {moundDots.map(([x, y], k) => <circle key={k} cx={x} cy={y} r={1.6} fill={cut} />)}

      {/* The jar on the mound. */}
      <g stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round">
        <rect x={180} y={218} width={40} height={11} rx={2} fill="currentColor" />
        <path d="M184 229 V 236 Q 172 238 172 250 V 300 Q 172 308 180 308 H 220 Q 228 308 228 300 V 250 Q 228 238 216 236 V 229" fill={cut} />
        <line x1={186} y1={218} x2={186} y2={229} stroke={cut} strokeWidth={1.4} />
        <line x1={194} y1={218} x2={194} y2={229} stroke={cut} strokeWidth={1.4} />
        <line x1={202} y1={218} x2={202} y2={229} stroke={cut} strokeWidth={1.4} />
        <line x1={210} y1={218} x2={210} y2={229} stroke={cut} strokeWidth={1.4} />
      </g>
      <rect x={181} y={250} width={38} height={22} fill="currentColor" />
      <text x={200} y={265} textAnchor="middle" fontSize={9} fontWeight={700} letterSpacing={1.5} fill={cut}>N°1</text>
      {jarDots.map(([x, y], k) => <circle key={k} cx={x} cy={y} r={2.2} fill="currentColor" />)}

      {/* Label copy. */}
      <Rosette x={66} y={370} />
      <Rosette x={334} y={370} />
      <text x={200} y={376} textAnchor="middle" fontSize={17} fontWeight={600} letterSpacing={4} fill="currentColor">WHAT YOU HAVE</text>
      <text x={200} y={428} textAnchor="middle" fontSize={46} fontWeight={500} letterSpacing={1} fill="currentColor">WHAT TO COOK</text>
      <text fontSize={15} fontWeight={700} letterSpacing={4} fill="currentColor">
        <textPath href="#emblem-smile-text" startOffset="50%" textAnchor="middle">WHAT TO BUY</textPath>
      </text>

      {/* Stamps either side. */}
      <g fill="none" stroke="currentColor" strokeWidth={2}>
        <ellipse cx={62} cy={462} rx={36} ry={22} />
        <ellipse cx={338} cy={462} rx={36} ry={22} />
      </g>
      <g fontSize={11} fontWeight={700} letterSpacing={1.5} textAnchor="middle" fill="currentColor">
        <text x={62} y={459}>WASTE</text>
        <text x={62} y={472}>LESS</text>
        <text x={338} y={459}>COOK</text>
        <text x={338} y={472}>MORE</text>
      </g>

      <text x={200} y={512} textAnchor="middle" fontSize={11} fontWeight={700} letterSpacing={3} fill="currentColor">
        KEPT BY YOU, WITH A HAND FROM CLAUDE
      </text>
    </svg>
  )
}

/**
 * The intro's illustration, in the same style as the emblem: three arched windows on a shelf, one for each
 * thing Collca does. A jar (what you have), a pot (what to cook) and a basket (what to buy). Drawn in
 * currentColor on the panel colour, like the splash.
 */
/** How far the outer arches move out from their first spacing, to give the rosettes room either side. */
const SPREAD = 22

export function IntroIllustration({ className }: { className?: string }) {
  const cut = "var(--primary)"
  const arch = (cx: number) => `M${cx - 50} 182 V 112 A 50 50 0 0 1 ${cx + 50} 112 V 182`
  const potSteam = [228, 240, 252]
  return (
    <svg viewBox="0 0 480 224" className={className} aria-hidden="true" focusable="false">
      {/* The shelf. */}
      <line x1={22} y1={182} x2={458} y2={182} stroke="currentColor" strokeWidth={3} strokeLinecap="round" />

      {[110 - SPREAD, 240, 370 + SPREAD].map((cx) => (
        <path key={cx} d={arch(cx)} fill="none" stroke="currentColor" strokeWidth={2.5} />
      ))}
      <Rosette x={175 - SPREAD / 2} y={128} />
      <Rosette x={305 + SPREAD / 2} y={128} />

      {/* What you have: a jar. */}
      <g transform={`translate(${-SPREAD} 0)`}>
      <Sparkle x={110} y={86} r={6} />
      <g stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round">
        <rect x={94} y={112} width={32} height={9} rx={1.5} fill="currentColor" />
        <path d="M97 121 V 126 Q 88 128 88 137 V 172 Q 88 178 94 178 H 126 Q 132 178 132 172 V 137 Q 132 128 123 126 V 121" fill={cut} />
      </g>
      <rect x={95} y={138} width={30} height={14} fill="currentColor" />
      {Array.from({ length: 3 }, (_, r) => Array.from({ length: 4 }, (_, c) => (
        <circle key={`${r}-${c}`} cx={96 + c * 9 + (r % 2) * 4} cy={160 + r * 6} r={1.9} fill="currentColor" />
      )))}
      </g>

      {/* What to cook: a pot with its lid, steaming. */}
      {potSteam.map((x) => (
        <path key={x} d={`M${x} 128 q -6 -7 0 -14 q 6 -7 0 -14`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      ))}
      <path d="M212 152 Q 240 132 268 152 Z" fill="currentColor" />
      <circle cx={240} cy={138} r={3.5} fill="currentColor" />
      <line x1={204} y1={153} x2={276} y2={153} stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      <path d="M208 156 H 272 V 168 Q 272 178 262 178 H 218 Q 208 178 208 168 Z" fill="currentColor" />
      <path d="M208 160 H 200 M272 160 H 280" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      <line x1={214} y1={164} x2={266} y2={164} stroke={cut} strokeWidth={1.5} strokeDasharray="2 4" />

      {/* What to buy: a basket, with greens and a loaf. */}
      <g transform={`translate(${SPREAD} 0)`}>
      <Sparkle x={370} y={86} r={6} />
      <path d="M346 150 A 24 24 0 0 1 394 150" fill="none" stroke="currentColor" strokeWidth={2.5} />
      <path d={LEAF} transform="translate(356 150) rotate(-110)" fill="currentColor" />
      <path d={LEAF} transform="translate(360 150) rotate(-70)" fill="currentColor" />
      <rect x={371} y={128} width={11} height={26} rx={5.5} transform="rotate(18 376 141)" fill="currentColor" />
      <path d="M336 150 H 404 L 396 178 H 344 Z" fill="currentColor" />
      {[0, 1].map((r) => (
        <line key={r} x1={340 - r * -2} y1={159 + r * 9} x2={400 - r * 2} y2={159 + r * 9} stroke={cut} strokeWidth={1.4} />
      ))}
      {[356, 370, 384].map((x) => (
        <line key={x} x1={x} y1={151} x2={x - (x - 370) * 0.12} y2={177} stroke={cut} strokeWidth={1.4} />
      ))}
      </g>

      <g fontSize={13} fontWeight={700} letterSpacing={4} textAnchor="middle" fill="currentColor">
        <text x={110 - SPREAD} y={214}>HAVE</text>
        <text x={240} y={214}>COOK</text>
        <text x={370 + SPREAD} y={214}>BUY</text>
      </g>
    </svg>
  )
}
