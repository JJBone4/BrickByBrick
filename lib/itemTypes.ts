// The app's item types and how each maps onto BrickLink's catalog. Client-safe (no secrets).
//
// Big figs are catalogued by BrickLink either as minifigs (Jabba: sw0071) or as parts (Rancor:
// 11323pb01c01), so a BIGFIG item uses whichever catalog its ID belongs to. Minifig IDs are a theme
// prefix of 2+ letters followed by digits; part numbers start with a digit (or a single letter, e.g. x223).

export type AppItemType = 'MINIFIG' | 'BIGFIG' | 'SET'
export type BricklinkType = 'MINIFIG' | 'PART' | 'SET'

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
]

const BY_VALUE = new Map(ITEM_TYPES.map((t) => [t.value, t]))

function info(itemType: string): ItemTypeInfo {
  return BY_VALUE.get(itemType.toUpperCase() as AppItemType) ?? ITEM_TYPES[0]
}

export function typeLabel(itemType: string): string {
  return info(itemType).label
}

const MINIFIG_ID = /^[a-z]{2,}\d/i

export function toBricklinkType(itemType: string, itemNo: string): BricklinkType {
  const t = info(itemType)
  if (t.value === 'BIGFIG' && MINIFIG_ID.test(itemNo.trim())) return 'MINIFIG'
  return t.bricklink
}

const CATALOG_PARAM: Record<BricklinkType, string> = { MINIFIG: 'M', PART: 'P', SET: 'S' }

export function bricklinkUrl(itemType: string, itemNo: string): string {
  return `https://www.bricklink.com/v2/catalog/catalogitem.page?${CATALOG_PARAM[toBricklinkType(itemType, itemNo)]}=${encodeURIComponent(itemNo)}`
}

/** BrickLink's large catalog image (the stored imageUrl is often a small thumbnail) */
export function largeImageUrl(itemType: string, itemNo: string): string {
  const no = encodeURIComponent(itemNo.toLowerCase())
  switch (toBricklinkType(itemType, itemNo)) {
    case 'PART': return `https://img.bricklink.com/ItemImage/PL/${no}.png` // no color needed
    case 'SET': return `https://img.bricklink.com/ItemImage/SN/0/${no}.png`
    default: return `https://img.bricklink.com/ItemImage/MN/0/${no}.png`
  }
}
