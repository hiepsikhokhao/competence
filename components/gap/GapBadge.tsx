import { gapStatus, GAP_COLORS } from '@/lib/utils'

type Props = { gap: number | null }

export default function GapBadge({ gap }: Props) {
  const status = gapStatus(gap)
  const colors = GAP_COLORS[status]
  const label =
    gap == null ? '—' :
    gap > 0     ? `+${gap}` :
    String(gap)

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors}`}
    >
      {label}
    </span>
  )
}
