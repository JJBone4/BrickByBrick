// The app's item types and how each maps onto BrickLink's catalog. Client-safe (no secrets).
//
// Big figs are catalogued by BrickLink either as minifigs (Jabba: sw0071) or as parts (Rancor:
// 11323pb01c01), so a BIGFIG item uses whichever catalog its ID belongs to. Minifig IDs are a theme
// prefix of 2+ letters followed by digits; part numbers start with a digit (or a single letter, e.g. x223).
//
// An ITEM can be any BrickLink catalog number (parts, gear, books, ...). Its catalog can't be told from
// the ID alone, so the server tries likely catalogs in order and stores the one that answers
// (CachedItem.bricklinkType). Client helpers take that resolved catalog when it's known.

export type AppItemType = 'MINIFIG' | 'BIGFIG' | 'SET' | 'ITEM'
export type BricklinkType = 'MINIFIG' | 'PART' | 'SET' | 'GEAR' | 'BOOK'

interface ItemTypeInfo {
  value: AppItemType
  label: string
  plural: string
  bricklink: BricklinkType // default catalog (BIGFIG switches to MINIFIG for minifig-style IDs)
}

export const ITEM_TYPES: ItemTypeInfo[] = [
  { value: 'MINIFIG', label: 'Minifig', plural: 'Minifigs', bricklink: 'MINIFIG' },
  { value: 'BIGFIG', label: 'Big fig', plural: 'Big figs', bricklink: 'PART' },
  { value: 'SET', label: 'Set', plural: 'Sets', bricklink: 'SET' },
  { value: 'ITEM', label: 'Item', plural: 'Items', bricklink: 'PART' },
]

const BY_VALUE = new Map(ITEM_TYPES.map((t) => [t.value, t]))

function info(itemType: string): ItemTypeInfo {
  return BY_VALUE.get(itemType.toUpperCase() as AppItemType) ?? ITEM_TYPES[0]
}

export function typeLabel(itemType: string): string {
  return info(itemType).label
}

const MINIFIG_ID = /^[a-z]{2,}\d/i
const SET_ID = /^\d+-\d+$/
const ALL_CATALOGS: BricklinkType[] = ['PART', 'GEAR', 'MINIFIG', 'SET', 'BOOK']

/**
 * Catalogs an ID could belong to, most likely first. Every type but ITEM has exactly one.
 * `resolved` is the catalog BrickLink already confirmed for this item, if any.
 */
export function bricklinkCandidates(itemType: string, itemNo: string, resolved?: string | null): BricklinkType[] {
  const t = info(itemType)
  const no = itemNo.trim()
  if (t.value === 'BIGFIG' && MINIFIG_ID.test(no)) return ['MINIFIG']
  if (t.value !== 'ITEM') return [t.bricklink]
  if (resolved && ALL_CATALOGS.includes(resolved as BricklinkType)) return [resolved as BricklinkType]
  const first: BricklinkType = MINIFIG_ID.test(no) ? 'MINIFIG' : SET_ID.test(no) ? 'SET' : 'PART'
  return [first, ...ALL_CATALOGS.filter((c) => c !== first)]
}

/** Best-guess catalog for an ID (exact for every type but an unresolved ITEM) */
export function toBricklinkType(itemType: string, itemNo: string, resolved?: string | null): BricklinkType {
  return bricklinkCandidates(itemType, itemNo, resolved)[0]
}

const CATALOG_PARAM: Record<BricklinkType, string> = { MINIFIG: 'M', PART: 'P', SET: 'S', GEAR: 'G', BOOK: 'B' }

export function bricklinkUrl(itemType: string, itemNo: string, resolved?: string | null): string {
  return `https://www.bricklink.com/v2/catalog/catalogitem.page?${CATALOG_PARAM[toBricklinkType(itemType, itemNo, resolved)]}=${encodeURIComponent(itemNo)}`
}

/** BrickLink's large catalog image (the stored imageUrl is often a small thumbnail) */
export function largeImageUrl(itemType: string, itemNo: string, resolved?: string | null): string {
  const no = encodeURIComponent(itemNo.toLowerCase())
  switch (toBricklinkType(itemType, itemNo, resolved)) {
    case 'PART': return `https://img.bricklink.com/ItemImage/PL/${no}.png` // no color needed
    case 'SET': return `https://img.bricklink.com/ItemImage/SN/0/${no}.png`
    case 'GEAR': return `https://img.bricklink.com/ItemImage/GN/0/${no}.png`
    case 'BOOK': return `https://img.bricklink.com/ItemImage/BN/0/${no}.png`
    default: return `https://img.bricklink.com/ItemImage/MN/0/${no}.png`
  }
}
