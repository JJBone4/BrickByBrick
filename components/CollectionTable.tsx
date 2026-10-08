'use client'

import { useState } from 'react'
import { Trash2, Pencil, X } from 'lucide-react'
import { CollectionEntry } from '@/lib/types'
import { formatItemName, decodeEntities, bricklinkUrl } from '@/lib/formatName'
import AddItemDrawer from '@/components/AddItemDrawer'

interface Props {
  items: CollectionEntry[]
  onRefresh: () => void
}

function fmt(n: number | null | undefined, decimals = 2) {
  if (n == null) return '—'
  return `$${n.toFixed(decimals)}`
}

function gainColor(gain: number | null) {
  if (gain == null) return 'text-gray-400'
  if (gain > 0) return 'text-green-400'
  if (gain < 0) return 'text-red-400'
  return 'text-gray-400'
}

export default function CollectionTable({ items, onRefresh }: Props) {
  const [editing, setEditing] = useState<CollectionEntry | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function deleteItem(id: string) {
    setDeleting(true)
    try {
      await fetch(`/api/collection/${id}`, { method: 'DELETE' })
      setConfirmDelete(null)
      onRefresh()
    } finally {
      setDeleting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <div className="text-4xl mb-3">🧱</div>
        <p className="text-lg font-medium text-gray-400">No items yet</p>
        <p className="text-sm mt-1">Click &ldquo;Add Item&rdquo; to start tracking your collection</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left">
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-16"></th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Condition</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Qty</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Paid</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Current Avg</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Gain/Loss</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {items.map((item) => {
            const avgPrice = item.snapshot?.avgPrice ?? null
            const costPerUnit = item.purchasePrice
            const gain =
              avgPrice != null && costPerUnit != null
                ? (avgPrice - costPerUnit) * item.quantity
                : null
            const gainPct =
              gain != null && costPerUnit != null && costPerUnit > 0
                ? ((avgPrice! - costPerUnit) / costPerUnit) * 100
                : null

            return (
              <tr key={item.id} className="hover:bg-gray-800/30 transition-colors">
                {/* Thumbnail */}
                <td className="px-4 py-3">
                  {item.meta?.imageUrl ? (
                    <img
                      src={item.meta.imageUrl}
                      alt={formatItemName(item.meta.name)}
                      className="w-10 h-10 object-contain rounded bg-white p-0.5"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center text-gray-600 text-xs">
                      ?
                    </div>
                  )}
                </td>

                {/* Item name + ID */}
                <td className="px-4 py-3">
                  <div
                    className="font-medium text-white"
                    title={item.meta?.name ? decodeEntities(item.meta.name) : undefined}
                  >
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
                    </a>{' · '}{item.itemType}
                  </div>
                </td>

                {/* Condition */}
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    item.condition === 'N'
                      ? 'bg-blue-900/50 text-blue-300'
                      : 'bg-orange-900/50 text-orange-300'
                  }`}>
                    {item.condition === 'N' ? 'New' : 'Used'}
                  </span>
                </td>

                {/* Quantity */}
                <td className="px-4 py-3 text-right">
                  <span className="text-gray-200">{item.quantity}</span>
                </td>

                {/* Paid */}
                <td className="px-4 py-3 text-right text-gray-300">
                  {fmt(item.purchasePrice)}
                </td>

                {/* Current avg */}
                <td className="px-4 py-3 text-right text-gray-200">
                  {fmt(avgPrice)}
                  {item.snapshot && (
                    <div className="text-xs text-gray-600">
                      {new Date(item.snapshot.capturedAt).toLocaleDateString()}
                    </div>
                  )}
                </td>

                {/* Gain/Loss */}
                <td className={`px-4 py-3 text-right font-medium ${gainColor(gain)}`}>
                  {gain != null ? (
                    <>
                      <div>{gain >= 0 ? '+' : ''}{fmt(gain)}</div>
                      {gainPct != null && (
                        <div className="text-xs">
                          {gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%
                        </div>
                      )}
                    </>
                  ) : '—'}
                </td>

                {/* Notes */}
                <td className="px-4 py-3 max-w-xs">
                  <span className="text-gray-400 text-xs line-clamp-2">{item.notes || '—'}</span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  {confirmDelete === item.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => deleteItem(item.id)}
                        disabled={deleting}
                        className="px-2 py-1 rounded text-xs bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
                      >
                        {deleting ? 'Deleting...' : 'Delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        title="Cancel"
                        aria-label="Cancel delete"
                        className="p-1.5 rounded text-gray-400 hover:bg-gray-700 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditing(item)}
                        title="Edit"
                        aria-label="Edit item"
                        className="p-1.5 rounded text-gray-400 hover:text-yellow-400 hover:bg-gray-700 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(item.id)}
                        title="Delete"
                        aria-label="Delete item"
                        className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {editing && (
        <AddItemDrawer
          key={editing.id}
          open
          item={editing}
          onClose={() => setEditing(null)}
          onAdded={onRefresh}
        />
      )}
    </div>
  )
}
