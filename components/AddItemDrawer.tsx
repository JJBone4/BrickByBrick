'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Check, Image as ImageIcon } from 'lucide-react'
import { CachedItemData, CollectionEntry } from '@/lib/types'
import { formatItemName, decodeEntities, bricklinkUrl, displayName } from '@/lib/formatName'
import { tagGroups, toggleTag as toggleTagIn } from '@/lib/conditionTags'
import { ITEM_TYPES, typeLabel } from '@/lib/itemTypes'

const ID_PLACEHOLDER: Record<string, string> = {
  MINIFIG: 'e.g. SW0038',
  BIGFIG: 'e.g. SW0071 or 11323pb01c01',
  SET: 'e.g. 75192-1',
}

interface Props {
  open: boolean
  onClose: () => void
  /** Called after a successful save, with a short message to show the user */
  onAdded: (message?: string) => void
  /** When set, the drawer edits this item instead of adding a new one */
  item?: CollectionEntry | null
}

const CONDITIONS = [
  { value: 'N', label: 'New' },
  { value: 'U', label: 'Used' },
]

export default function AddItemDrawer({ open, onClose, onAdded, item }: Props) {
  const isEdit = !!item
  // In edit mode, start from the item's current values
  const [itemNo, setItemNo] = useState(item?.itemNo ?? '')
  const [itemType, setItemType] = useState(item?.itemType ?? 'MINIFIG')
  // Name starts as the BrickLink name and follows the looked-up item until the user types their own
  const [name, setName] = useState(item?.name ?? (item?.meta?.name ? formatItemName(item.meta.name) : ''))
  const [nameEdited, setNameEdited] = useState(!!item?.name)
  const [condition, setCondition] = useState(item?.condition ?? 'U')
  const [quantity, setQuantity] = useState(item ? String(item.quantity) : '1')
  const [purchasePrice, setPurchasePrice] = useState(item?.purchasePrice != null ? String(item.purchasePrice) : '')
  const [purchaseDate, setPurchaseDate] = useState(item?.purchaseDate?.slice(0, 10) ?? '')
  const [conditionTags, setConditionTags] = useState<string[]>(item?.conditionTags ?? [])
  const [preview, setPreview] = useState<CachedItemData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchPreview = useCallback(async () => {
    const no = itemNo.trim().toUpperCase()
    if (!no) {
      setPreview(null)
      return
    }
    setPreviewLoading(true)
    setPreviewError('')
    try {
      const res = await fetch(`/api/bricklink/item/${itemType}/${no}`)
      if (!res.ok) throw new Error('Item not found')
      const data = await res.json()
      setPreview(data)
      if (!nameEdited) setName(formatItemName(data.name))
    } catch {
      setPreview(null)
      setPreviewError('Could not find item on BrickLink')
    } finally {
      setPreviewLoading(false)
    }
  }, [itemNo, itemType, nameEdited])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (itemNo.trim()) fetchPreview()
    }, 600)
    return () => clearTimeout(timer)
  }, [itemNo, itemType, fetchPreview])

  function changeType(type: string) {
    setItemType(type)
    // An ID from one type doesn't mean anything for another, so start the lookup over
    setItemNo('')
    setPreview(null)
    setPreviewError('')
    if (!nameEdited) setName('')
  }

  // The BrickLink name for the typed ID, once it's known
  const typedId = itemNo.trim().toUpperCase()
  const previewMatches = !!preview && preview.itemNo.toUpperCase() === typedId && preview.itemType === itemType
  const bricklinkName = previewMatches
    ? formatItemName(preview.name)
    : item?.meta?.name && item.itemNo === typedId && item.itemType === itemType
      ? formatItemName(item.meta.name)
      : null

  const groups = tagGroups(itemType)
  const availableTags = new Set(groups.flatMap(([, tags]) => tags.map((t) => t.key)))

  function toggleTag(key: string) {
    setConditionTags((prev) => toggleTagIn(prev, key))
  }

  function reset() {
    setItemNo('')
    setItemType('MINIFIG')
    setName('')
    setNameEdited(false)
    setCondition('U')
    setQuantity('1')
    setPurchasePrice('')
    setPurchaseDate('')
    setConditionTags([])
    setPreview(null)
    setPreviewError('')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(isEdit ? `/api/collection/${item.id}` : '/api/collection', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemNo: itemNo.trim().toUpperCase(),
          itemType,
          // Only store a name that differs from BrickLink's, so untouched rows keep following it
          name: name.trim() && name.trim() !== bricklinkName ? name.trim() : null,
          condition,
          quantity: Number(quantity),
          purchasePrice: purchasePrice ? Number(purchasePrice) : null,
          purchaseDate: purchaseDate || null,
          // Only send tags that apply to the selected type (e.g. drop 'Sealed' if switched to a minifig)
          conditionTags: conditionTags.filter((t) => availableTags.has(t)),
        }),
      })
      if (!res.ok) {
        // Server errors (500) may have an empty body, so don't assume JSON
        const d = await res.json().catch(() => ({}))
        throw new Error(
          d.error ||
            `${isEdit ? 'Failed to save changes' : 'Failed to add item'} (server error ${res.status}). Check the terminal running npm run dev.`
        )
      }
      const saved = await res.json()
      const label = displayName(saved, previewMatches ? preview : null)
      const message = isEdit
        ? saved.merged
          ? `Combined with matching row — ${label} count: ${saved.quantity}`
          : `Saved changes to ${label}`
        : saved.merged
          ? `Added to ${label} count: ${saved.quantity}`
          : `Added ${label} to your collection`
      reset()
      onAdded(message)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60" onClick={() => { reset(); onClose() }} />

      {/* Drawer */}
      <div className="w-full max-w-md bg-gray-900 border-l border-gray-700 flex flex-col h-full overflow-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">{isEdit ? 'Edit Item' : 'Add Item'}</h2>
          <button
            onClick={() => { reset(); onClose() }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-5 flex flex-col gap-4">
          {/* Type + Item ID */}
          <div className="flex gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Type
              </label>
              <select
                value={itemType}
                onChange={(e) => changeType(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Item ID
              </label>
              <input
                type="text"
                value={itemNo}
                onChange={(e) => setItemNo(e.target.value)}
                placeholder={ID_PLACEHOLDER[itemType] ?? ID_PLACEHOLDER.MINIFIG}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          {/* Preview: always takes the same space so the form doesn't shift while typing */}
          {(() => {
            // Until the lookup for the typed ID finishes (including the debounce pause), show loading
            const state = !typedId
              ? 'empty'
              : previewLoading
                ? 'loading'
                : previewMatches
                  ? 'found'
                  : previewError
                    ? 'error'
                    : 'loading'
            return (
              <div
                aria-live="polite"
                className="flex items-center gap-3 h-[74px] p-3 bg-gray-800 rounded-lg border border-gray-700"
              >
                {state === 'found' && preview?.imageUrl ? (
                  <img
                    src={preview.imageUrl}
                    alt={formatItemName(preview.name)}
                    className="w-12 h-12 shrink-0 object-contain rounded"
                  />
                ) : (
                  <div
                    className={`w-12 h-12 shrink-0 rounded flex items-center justify-center bg-gray-700/50 text-gray-600 ${
                      state === 'loading' ? 'animate-pulse' : ''
                    }`}
                  >
                    <ImageIcon size={18} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {state === 'found' && preview ? (
                    <>
                      <div className="text-sm font-medium text-white truncate" title={decodeEntities(preview.name)}>
                        {formatItemName(preview.name)}
                      </div>
                      <div className="text-xs text-gray-400">
                        <a
                          href={bricklinkUrl(preview.itemType, preview.itemNo)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-400 hover:underline"
                        >
                          {preview.itemNo}
                        </a>{' · '}{typeLabel(preview.itemType)}
                      </div>
                    </>
                  ) : state === 'loading' ? (
                    <div className="space-y-2 animate-pulse" aria-label="Looking up item">
                      <div className="h-3.5 w-2/3 rounded bg-gray-700" />
                      <div className="h-3 w-1/3 rounded bg-gray-700" />
                    </div>
                  ) : state === 'error' ? (
                    <div className="text-sm text-red-400">{previewError}</div>
                  ) : (
                    <div className="text-sm text-gray-500">Enter an item ID to look it up on BrickLink</div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Name */}
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label htmlFor="item-name" className="block text-xs font-medium text-gray-400">
                Name
              </label>
              {bricklinkName && name.trim() !== bricklinkName && (
                <button
                  type="button"
                  onClick={() => { setName(bricklinkName); setNameEdited(false) }}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  Use BrickLink name
                </button>
              )}
            </div>
            <input
              id="item-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameEdited(true) }}
              placeholder={bricklinkName ?? 'Defaults to the BrickLink name'}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-400"
            />
          </div>

          {/* Condition + Quantity */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Quantity
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          {/* Purchase Price + Date */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Purchase Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          {/* Condition details */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="block text-xs font-medium text-gray-400">
                Condition details <span className="text-gray-600">(check all that apply)</span>
              </label>
              {conditionTags.some((t) => availableTags.has(t)) && (
                <button
                  type="button"
                  onClick={() => setConditionTags([])}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-3">
              {groups.map(([group, tags]) => (
                <fieldset key={group}>
                  <legend className="text-[11px] uppercase tracking-wider text-gray-600 mb-1.5">{group}</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => {
                      const checked = conditionTags.includes(tag.key)
                      return (
                        <button
                          key={tag.key}
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          onClick={() => toggleTag(tag.key)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-colors ${
                            checked
                              ? 'bg-yellow-400/15 border-yellow-400 text-yellow-300'
                              : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                          }`}
                        >
                          {checked && <Check size={12} />}
                          {tag.label}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
            {item?.notes && (
              <p className="text-xs text-gray-500 mt-3">
                <span className="text-gray-600">Earlier notes:</span> {item.notes}
              </p>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-auto pt-2">
            <button
              type="button"
              onClick={() => { reset(); onClose() }}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !itemNo.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-yellow-400 text-gray-900 text-sm font-semibold hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting
                ? (isEdit ? 'Saving...' : 'Adding...')
                : (isEdit ? 'Save Changes' : 'Add to Collection')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
