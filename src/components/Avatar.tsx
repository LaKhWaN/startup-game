// Deterministic pixel-art avatar generated from a name string

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

// bg, feature-color, highlight
const PALETTES: [string, string, string][] = [
  ['#e0f2fe', '#0ea5e9', '#38bdf8'],  // sky blue
  ['#ede9fe', '#7c3aed', '#a78bfa'],  // violet
  ['#d1fae5', '#059669', '#34d399'],  // emerald
  ['#fce7f3', '#db2777', '#f472b6'],  // pink
  ['#ffedd5', '#ea580c', '#fb923c'],  // orange
  ['#fee2e2', '#dc2626', '#f87171'],  // red
  ['#e0e7ff', '#4338ca', '#818cf8'],  // indigo
  ['#cffafe', '#0891b2', '#22d3ee'],  // cyan
  ['#ecfccb', '#65a30d', '#a3e635'],  // lime
  ['#fdf4ff', '#a21caf', '#e879f9'],  // fuchsia
]

type EyeStyle   = 0 | 1 | 2 | 3
type MouthStyle = 0 | 1 | 2
type HairStyle  = 0 | 1 | 2 | 3 | 4

interface AvatarProps {
  name: string
  size?: number
}

export function Avatar({ name, size = 40 }: AvatarProps) {
  const h = hash(name)

  const [bg, fg, hi]   = PALETTES[h % PALETTES.length]
  const eyeStyle        = (h % 4)         as EyeStyle
  const mouthStyle      = ((h >> 4) % 3)  as MouthStyle
  const hairStyle       = ((h >> 8) % 5)  as HairStyle
  const hasGlasses      = (h >> 12) % 6 === 0
  const pupilOffset     = (h >> 16) % 3 - 1   // -1, 0, or 1

  const rx = size * 0.22   // corner radius

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Background */}
      <rect width={40} height={40} rx={rx * (40 / size)} fill={bg} />

      {/* ── Hair ── */}
      {hairStyle === 0 && (
        // Short buzz
        <rect x={9} y={5} width={22} height={7} rx={3} fill={fg} opacity={0.55} />
      )}
      {hairStyle === 1 && (
        // Parted — two bumps
        <>
          <ellipse cx={14} cy={7} rx={6} ry={5} fill={fg} opacity={0.55} />
          <ellipse cx={26} cy={7} rx={6} ry={5} fill={fg} opacity={0.55} />
        </>
      )}
      {hairStyle === 2 && (
        // Spiky
        <>
          <rect x={9}  y={4} width={5} height={9} rx={2} fill={fg} opacity={0.55} transform="rotate(-8 11 8)" />
          <rect x={16} y={2} width={5} height={10} rx={2} fill={fg} opacity={0.55} />
          <rect x={23} y={4} width={5} height={9} rx={2} fill={fg} opacity={0.55} transform="rotate(8 25 8)" />
        </>
      )}
      {hairStyle === 3 && (
        // Long sides
        <>
          <rect x={9} y={5} width={22} height={7} rx={3} fill={fg} opacity={0.55} />
          <rect x={7} y={10} width={5} height={14} rx={2} fill={fg} opacity={0.45} />
          <rect x={28} y={10} width={5} height={14} rx={2} fill={fg} opacity={0.45} />
        </>
      )}
      {/* hairStyle === 4 → bald (no hair element) */}

      {/* ── Face area (subtle) ── */}
      <rect x={10} y={12} width={20} height={22} rx={5} fill={hi} opacity={0.07} />

      {/* ── Eyes ── */}
      {eyeStyle === 0 && (
        // Round dots
        <>
          <circle cx={15} cy={20} r={2.2} fill={fg} />
          <circle cx={25} cy={20} r={2.2} fill={fg} />
          {/* tiny highlights */}
          <circle cx={15 + pupilOffset} cy={19} r={0.8} fill={hi} />
          <circle cx={25 + pupilOffset} cy={19} r={0.8} fill={hi} />
        </>
      )}
      {eyeStyle === 1 && (
        // Happy arcs (^_^)
        <>
          <path d="M12,21 Q15,17 18,21" stroke={fg} strokeWidth={2} fill="none" strokeLinecap="round" />
          <path d="M22,21 Q25,17 28,21" stroke={fg} strokeWidth={2} fill="none" strokeLinecap="round" />
        </>
      )}
      {eyeStyle === 2 && (
        // Square pixel eyes
        <>
          <rect x={12} y={17} width={5} height={5} rx={1} fill={fg} />
          <rect x={23} y={17} width={5} height={5} rx={1} fill={fg} />
          <rect x={13} y={18} width={2} height={2} fill={hi} opacity={0.6} />
          <rect x={24} y={18} width={2} height={2} fill={hi} opacity={0.6} />
        </>
      )}
      {eyeStyle === 3 && (
        // Tired half-closed
        <>
          <circle cx={15} cy={20} r={2.2} fill={fg} />
          <circle cx={25} cy={20} r={2.2} fill={fg} />
          <rect x={12} y={17} width={6} height={3} rx={1} fill={bg} />
          <rect x={22} y={17} width={6} height={3} rx={1} fill={bg} />
        </>
      )}

      {/* ── Glasses (optional) ── */}
      {hasGlasses && (
        <g opacity={0.7}>
          <rect x={10} y={16} width={9} height={7} rx={3} fill="none" stroke={fg} strokeWidth={1.2} />
          <rect x={21} y={16} width={9} height={7} rx={3} fill="none" stroke={fg} strokeWidth={1.2} />
          <line x1={19} y1={19.5} x2={21} y2={19.5} stroke={fg} strokeWidth={1.2} />
          <line x1={10} y1={19.5} x2={8}  y2={20}  stroke={fg} strokeWidth={1} />
          <line x1={30} y1={19.5} x2={32} y2={20}  stroke={fg} strokeWidth={1} />
        </g>
      )}

      {/* ── Mouth ── */}
      {mouthStyle === 0 && (
        // Smile
        <path d="M14,29 Q20,34 26,29" stroke={fg} strokeWidth={2} fill="none" strokeLinecap="round" />
      )}
      {mouthStyle === 1 && (
        // Neutral
        <line x1={14} y1={30} x2={26} y2={30} stroke={fg} strokeWidth={2} strokeLinecap="round" />
      )}
      {mouthStyle === 2 && (
        // Frown
        <path d="M14,31 Q20,27 26,31" stroke={fg} strokeWidth={2} fill="none" strokeLinecap="round" />
      )}
    </svg>
  )
}
