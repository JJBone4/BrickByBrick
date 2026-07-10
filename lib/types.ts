export interface CollectionEntry {
  id: string
  itemNo: string
  itemType: string
  condition: string
  quantity: number
  purchasePrice: number | null
  purchaseDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  snapshot: PriceSnapshotData | null
  meta: CachedItemData | null
}

export interface PriceSnapshotData {
  id: string
  itemNo: string
  itemType: string
  condition: string
  avgPrice: number
  minPrice: number
  maxPrice: number
  qtySold: number
  totalLots: number
  capturedAt: string
}

export interface CachedItemData {
  itemNo: string
  itemType: string
  name: string
  imageUrl: string | null
  categoryName: string | null
  lastFetched: string
}

export interface InvestmentData {
  totalCostBasis: number
  currentValue: number
  gain: number
  gainPercent: number
  chartData: Array<{ date: string; marketValue: number; costBasis: number }>
}
