'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Trash2, CheckCircle2, X } from 'lucide-react'
import { WishlistEntry } from '@/lib/types'
import { ITEM_TYPES, typeLabel } from '@/lib/itemTypes'
import { formatItemName, decodeEntities, bricklinkUrl, largeImageUrl } from '@/lib/formatName'
import StatusBadge from '@/components/StatusBadge'
import ImageLightbox from '@/components/ImageLightbox'

const ID_PLACEHOLDER: Record<string, string> = {
  MINIFIG: 'e.g. SW0038',
  BIGFIG: 'e.g. SW0071 or 11323pb01c01',
  SET: 'e.g. 75192-1',
}

function usd(n: number | null | undefined) {
  if (n == null) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const inputClass =
  'bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400'

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Add form
  const [itemType, setItemType] = useState('MINIFIG')
  const [itemNo, setItemNo] = useState('')
  const [condition, setCondition] = useState('U')
  const [maxPrice, setMaxPrice] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [zoomed, setZoomed] = useState<WishlistEntry | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(message: string) {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/wishlist')
      // Server errors (500) may have an empty body, so check before parsing
      if (!res.ok) throw new Error(`Couldn't load your wish list (server error ${res.status}). Check the terminal running npm run dev.`)
      setItems(await res.json())
      setLoadError('')
    } catch (err) {
      setLoadError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setError('')
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemNo, itemType, condition, maxPrice: maxPrice || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Failed to add (server error ${res.status})`)
      setItemNo('')
      setMaxPrice('')
      showToast(`Added ${data.itemNo} to your wish list`)
      await fetchItems()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setAdding(false)
    }
  }

  async function saveTarget(id: string, value: string) {
    await fetch(`/api/wishlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxPrice: value }),
    })
    fetchItems()
  }

  async function remove(id: string) {
    await fetch(`/api/wishlist/${id}`, { method: 'DELETE' })
    setConfirmDelete(null)
    fetchItems()
  }

  const totalCost = items.reduce((sum, i) => sum + (i.snapshot?.avgPrice ?? 0), 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Wish List</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {items.length} item{items.length !== 1 ? 's' : ''} ·{' '}
          <span className="text-yellow-400 font-medium">{usd(totalCost)}</span> to buy them all at current prices
          <span className="text-gray-600"> · not counted in your portfolio</span>
        </p>
      </div>

      {/* Add bar */}
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
          <select value={itemType} onChange={(e) => setItemType(e.target.value)} className={inputClass}>
            {ITEM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-400 mb-1">Item ID</label>
          <input
            value={itemNo}
            onChange={(e) => setItemNo(e.target.value)}
            placeholder={ID_PLACEHOLDER[itemType]}
            required
            className={`w-full ${inputClass}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Condition wanted</label>
          <select value={condition} onChange={(e) => setCondition(e.target.value)} className={inputClass}>
            <option value="U">Used</option>
            <option value="N">New</option>
          </select>
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-gray-400 mb-1">Target price ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="optional"
            className={`w-full ${inputClass}`}
          />
        </div>
        <button
          type="submit"
          disabled={adding || !itemNo.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-gray-900 text-sm font-semibold hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={16} />
          {adding ? 'Adding...' : 'Add to Wish List'}
        </button>
      </form>
      {error && (
        <div className="mb-4 text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-20 text-gray-500 animate-pulse">Loading...</div>
      ) : loadError ? (
        <div className="bg-gray-900 rounded-xl border border-red-900 text-center py-16 text-red-400 text-sm px-4">
          {loadError}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">⭐</div>
          <p className="text-lg font-medium text-gray-400">Your wish list is empty</p>
          <p className="text-sm mt-1">Add a minifig, big fig, or set ID above to start tracking it</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 w-16"></th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Condition</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Current Avg</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Target</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {items.map((item) => {
                const avg = item.snapshot?.avgPrice ?? null
                const atTarget = avg != null && item.maxPrice != null && avg <= item.maxPrice
                return (
                  <tr key={item.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      {item.meta?.imageUrl ? (
                        <button
                          onClick={() => setZoomed(item)}
                          aria-label="Enlarge image"
                          className="block rounded cursor-zoom-in hover:ring-2 hover:ring-yellow-400 transition-shadow"
                        >
                          <img
                            src={item.meta.imageUrl}
                            alt={formatItemName(item.meta.name)}
                            className="w-10 h-10 object-contain rounded bg-white p-0.5"
                          />
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-800" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white" title={item.meta?.name ? decodeEntities(item.meta.name) : undefined}>
                        {item.meta?.name ? formatItemName(item.meta.name) : item.itemNo}
                      </div>
                      <div className="text-xs text-gray-500">
                        <a
                          href={bricklinkUrl(item.itemType, item.itemNo)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-400 hover:underline"
                        >
                          {item.itemNo}
                        </a>{' · '}{typeLabel(item.itemType)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        item.condition === 'N' ? 'bg-blue-900/50 text-blue-300' : 'bg-orange-900/50 text-orange-300'
                      }`}>
                        {item.condition === 'N' ? 'New' : 'Used'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className={atTarget ? 'text-green-400 font-medium' : 'text-gray-200'}>{usd(avg)}</div>
                      {atTarget && <div className="text-xs text-green-500">at or below target</div>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* Edit in place: saves when you leave the field or press Enter */}
                      <input
                        key={`${item.id}-${item.maxPrice}`}
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={item.maxPrice ?? ''}
                        placeholder="—"
                        aria-label="Target price"
                        onBlur={(e) => {
                          if (e.target.value !== String(item.maxPrice ?? '')) saveTarget(item.id, e.target.value)
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                        className="w-24 bg-transparent border border-transparent hover:border-gray-700 focus:border-yellow-400 rounded px-2 py-1 text-right text-gray-200 placeholder-gray-600 focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge retired={item.meta?.retired} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {confirmDelete === item.id ? (
                          <>
                            <button
                              onClick={() => remove(item.id)}
                              className="px-2 py-1 rounded text-xs bg-red-600 text-white hover:bg-red-500 transition-colors"
                            >
                              Remove
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              aria-label="Cancel remove"
                              className="p-1.5 rounded text-gray-400 hover:bg-gray-700 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(item.id)}
                            title="Remove from wish list"
                            aria-label="Remove from wish list"
                            className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {zoomed?.meta?.imageUrl && (
        <ImageLightbox
          src={largeImageUrl(zoomed.itemType, zoomed.itemNo)}
          fallbackSrc={zoomed.meta.imageUrl}
          alt={`${formatItemName(zoomed.meta.name)} · ${zoomed.itemNo}`}
          onClose={() => setZoomed(null)}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 shadow-xl text-sm text-white"
        >
          <CheckCircle2 size={16} className="text-green-400 shrink-0" />
          {toast}
        </div>
      )}
    </div>
  )
}
