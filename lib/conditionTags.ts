import type { AppItemType } from './itemTypes'

// Checkbox options describing an item's condition. The `key` is what's stored in the
// database, so keep keys stable; labels can be reworded freely.

export interface ConditionTag {
  key: string
  label: string
  group: string
  appliesTo: AppItemType[]
  /** Opposite tag that gets unchecked when this one is checked */
  opposite?: string
}

const BOTH: ConditionTag['appliesTo'] = ['MINIFIG', 'BIGFIG', 'SET']
const FIGS: ConditionTag['appliesTo'] = ['MINIFIG', 'BIGFIG']

export const CONDITION_TAGS: ConditionTag[] = [
  // Minifig damage
  { key: 'chip', label: 'Chip', group: 'Damage', appliesTo: BOTH },
  { key: 'minor-crack', label: 'Minor crack', group: 'Damage', appliesTo: BOTH },
  { key: 'large-crack', label: 'Large crack', group: 'Damage', appliesTo: BOTH },
  { key: 'teeth-marks', label: 'Teeth marks', group: 'Damage', appliesTo: BOTH },
  { key: 'stress-marks', label: 'Stress marks', group: 'Damage', appliesTo: BOTH },

  // Wear
  { key: 'light-scratches', label: 'Light scratches', group: 'Wear', appliesTo: BOTH },
  { key: 'heavy-scratches', label: 'Heavy scratches', group: 'Wear', appliesTo: BOTH },
  { key: 'print-wear', label: 'Print wear', group: 'Wear', appliesTo: BOTH },
  { key: 'arm-swing-marks', label: 'Arm swing marks', group: 'Wear', appliesTo: FIGS },
  { key: 'fading', label: 'Fading', group: 'Wear', appliesTo: BOTH },
  { key: 'yellowing', label: 'Yellowing', group: 'Wear', appliesTo: BOTH },
  { key: 'dirty', label: 'Dirty / needs cleaning', group: 'Wear', appliesTo: BOTH },

  // Minifig fit
  { key: 'firm-arms', label: 'Firm arms', group: 'Fit', appliesTo: FIGS, opposite: 'loose-arms' },
  { key: 'loose-arms', label: 'Loose arms', group: 'Fit', appliesTo: FIGS, opposite: 'firm-arms' },
  { key: 'firm-hands', label: 'Firm hands', group: 'Fit', appliesTo: FIGS, opposite: 'loose-hands' },
  { key: 'loose-hands', label: 'Loose hands', group: 'Fit', appliesTo: FIGS, opposite: 'firm-hands' },
  { key: 'firm-legs', label: 'Firm legs', group: 'Fit', appliesTo: FIGS, opposite: 'loose-legs' },
  { key: 'loose-legs', label: 'Loose legs', group: 'Fit', appliesTo: FIGS, opposite: 'firm-legs' },
  { key: 'firm-head', label: 'Firm head', group: 'Fit', appliesTo: FIGS, opposite: 'loose-head' },
  { key: 'loose-head', label: 'Loose head', group: 'Fit', appliesTo: FIGS, opposite: 'firm-head' },

  // Minifig completeness
  { key: 'with-accessories', label: 'With accessories', group: 'Completeness', appliesTo: FIGS },
  { key: 'missing-accessory', label: 'Missing accessory', group: 'Completeness', appliesTo: FIGS },
  { key: 'missing-part', label: 'Missing part', group: 'Completeness', appliesTo: FIGS },
  { key: 'non-original-part', label: 'Non-original part', group: 'Completeness', appliesTo: FIGS },
  { key: 'wrong-head', label: 'Wrong head', group: 'Completeness', appliesTo: FIGS },
  { key: 'wrong-body', label: 'Wrong body', group: 'Completeness', appliesTo: FIGS },
  { key: 'wrong-legs', label: 'Wrong legs', group: 'Completeness', appliesTo: FIGS },

  // Set box & contents
  { key: 'sealed', label: 'Sealed', group: 'Box', appliesTo: ['SET'] },
  { key: 'box-damage', label: 'Box damage', group: 'Box', appliesTo: ['SET'] },
  { key: 'no-box', label: 'No box', group: 'Box', appliesTo: ['SET'] },
  { key: 'no-instructions', label: 'No instructions', group: 'Contents', appliesTo: ['SET'] },
  { key: 'missing-pieces', label: 'Missing pieces', group: 'Contents', appliesTo: ['SET'] },
  { key: 'missing-minifigs', label: 'Missing minifigs', group: 'Contents', appliesTo: ['SET'] },
  { key: 'stickers-applied', label: 'Stickers applied', group: 'Contents', appliesTo: ['SET'] },
]

const BY_KEY = new Map(CONDITION_TAGS.map((t) => [t.key, t]))

/** Checking `key` toggles it on/off; turning it on also removes its opposite (e.g. Firm vs Loose arms) */
export function toggleTag(tags: string[], key: string): string[] {
  if (tags.includes(key)) return tags.filter((t) => t !== key)
  const opposite = BY_KEY.get(key)?.opposite
  return [...tags.filter((t) => t !== opposite), key]
}

export function tagLabel(key: string): string {
  return BY_KEY.get(key)?.label ?? key
}

/** Tags available for an item type, grouped for display */
export function tagGroups(itemType: string): [string, ConditionTag[]][] {
  const groups = new Map<string, ConditionTag[]>()
  for (const tag of CONDITION_TAGS) {
    if (!tag.appliesTo.includes(itemType.toUpperCase() as AppItemType)) continue
    groups.set(tag.group, [...(groups.get(tag.group) ?? []), tag])
  }
  return [...groups.entries()]
}

/**
 * Canonical form for storage and matching: known keys only, no duplicates, in list order.
 * Two rows with the same tags in any order compare equal after this.
 */
export function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  const set = new Set(tags.filter((t): t is string => typeof t === 'string' && BY_KEY.has(t)))
  return CONDITION_TAGS.filter((t) => set.has(t.key)).map((t) => t.key)
}
