interface Props {
  retired: boolean | null | undefined
}

/** Retired / Active badge; unknown status (no Brickset key or no data) shows a dash */
export default function StatusBadge({ retired }: Props) {
  if (retired == null) {
    return <span className="text-gray-500 text-xs" title="Retirement status unknown">—</span>
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        retired ? 'bg-purple-900/50 text-purple-300' : 'bg-green-900/50 text-green-300'
      }`}
      title={retired ? 'Every set this came in has retired' : 'Still available in at least one set'}
    >
      {retired ? 'Retired' : 'Active'}
    </span>
  )
}
