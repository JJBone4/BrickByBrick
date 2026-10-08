'use client'

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { CachedItemData, CollectionEntry } from '@/lib/types'
import { formatItemName, decodeEntities, bricklinkUrl } from '@/lib/formatName'

interface Props {
  open: boolean
  onClose: () => void
  onAdded: () => void
  /** When set, the drawer edits this item instead of adding a new one */
  item?: CollectionEntry | null
}

const ITEM_TYPES = ['MINIFIG', 'SET']
const CONDITIONS = [
  { value: 'N', label: 'New' },
  { value: 'U', label: 'Used' },
]

export default function AddItemDrawer({ open, onClose, onAdded, item }: Props) {
  const isEdit = !!item
  // In edit mode, start from the item's current values
  const [itemNo, setItemNo] = useState(item?.itemNo ?? '')
  const [itemType, setItemType] = useState(item?.itemType ?? 'MINIFIG')
  const [condition, setCondition] = useState(item?.condition ?? 'U')
  const [quantity, setQuantity] = useState(item ? String(item.quantity) : '1')
  const [purchasePrice, setPurchasePrice] = useState(item?.purchasePrice != null ? String(item.purchasePrice) : '')
  const [purchaseDate, setPurchaseDate] = useState(item?.purchaseDate?.slice(0, 10) ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
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
    } catch {
      setPreview(null)
      setPreviewError('Could not find item on BrickLink')
    } finally {
      setPreviewLoading(false)
    }
  }, [itemNo, itemType])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (itemNo.trim()) fetchPreview()
    }, 600)
    return () => clearTimeout(timer)
  }, [itemNo, itemType, fetchPreview])

  function reset() {
    setItemNo('')
    setItemType('MINIFIG')
    setCondition('U')
    setQuantity('1')
    setPurchasePrice('')
    setPurchaseDate('')
    setNotes('')
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
          condition,
          quantity: Number(quantity),
          purchasePrice: purchasePrice ? Number(purchasePrice) : null,
          purchaseDate: purchaseDate || null,
          notes: notes.trim() || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || (isEdit ? 'Failed to save changes' : 'Failed to add item'))
      }
      reset()
      onAdded()
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
          {/* Item ID */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Item ID
              </label>
              <input
                type="text"
                value={itemNo}
                onChange={(e) => setItemNo(e.target.value)}
                placeholder="e.g. SW0038"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Type
              </label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview */}
          {previewLoading && (
            <div className="text-sm text-gray-400 animate-pulse">Looking up item...</div>
          )}
          {previewError && (
            <div className="text-sm text-red-400">{previewError}</div>
          )}
          {preview && (
            <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
              {preview.imageUrl && (
                <img
                  src={preview.imageUrl}
                  alt={formatItemName(preview.name)}
                  className="w-12 h-12 object-contain rounded"
                />
              )}
              <div>
                <div className="text-sm font-medium text-white" title={decodeEntities(preview.name)}>
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
                  </a>{' · '}{preview.itemType}
                </div>
              </div>
            </div>
          )}

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

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Notes (condition, chips, cracks, etc.)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. minor scuff on torso, missing cape..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-400 resize-none"
            />
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
