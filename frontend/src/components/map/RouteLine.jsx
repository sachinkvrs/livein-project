export default function RouteLine({ positions = [] }) {
  if (positions.length < 2) return null
  const points = positions.map((p) => `${p.x},${p.y}`).join(' ')
  return (
    <polyline
      points={points}
      fill="none"
      stroke="#06B6A4"
      strokeWidth="0.6"
      strokeDasharray="2 2"
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    />
  )
}
