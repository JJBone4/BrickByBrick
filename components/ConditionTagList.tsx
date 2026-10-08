import { tagLabel } from '@/lib/conditionTags'

interface Props {
  tags: string[] | undefined
  notes?: string | null // free-text notes from before condition tags existed
  compact?: boolean
}

export default function ConditionTagList({ tags, notes, compact }: Props) {
  if (!tags?.length && !notes) {
    return compact ? <span className="text-gray-500 text-xs">—</span> : null
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags?.map((key) => (
        <span
          key={key}
          className={`inline-flex items-center rounded-full border border-gray-700 bg-gray-800/60 text-gray-300 ${
            compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
          }`}
        >
          {tagLabel(key)}
        </span>
      ))}
      {notes && (
        <span className={`text-gray-500 ${compact ? 'text-xs line-clamp-1' : 'text-sm'}`} title={notes}>
          {notes}
        </span>
      )}
    </div>
  )
}
