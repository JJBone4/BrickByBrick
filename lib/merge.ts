import type { Prisma } from '@prisma/client'

interface MatchFields {
  itemNo: string
  itemType: string
  name: string | null
  condition: string
  purchasePrice: number | null
  purchaseDate: Date | null
  conditionTags: string[]
}

/**
 * Rows are the "same" when every field except quantity matches (custom name included), including the exact set of
 * condition tags (stored normalized, so order doesn't matter). Rows with legacy free-text notes
 * never merge.
 */
export function sameRowWhere(f: MatchFields): Prisma.CollectionItemWhereInput {
  return {
    itemNo: f.itemNo,
    itemType: f.itemType,
    name: f.name,
    condition: f.condition,
    purchasePrice: f.purchasePrice,
    purchaseDate: f.purchaseDate,
    conditionTags: { equals: f.conditionTags },
    notes: null,
  }
}
