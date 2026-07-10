'use client'

import { useState } from 'react'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import { CollectionEntry } from '@/lib/types'

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

interface EditState {
  id: string
  quantity: string
  notes: string
}

export default function CollectionTable({ items, onRefresh }: Props) {
  const [editing, setEditing] = useState<EditState | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    try {
      await fetch(`/api/collection/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: Number(editing.quantity),
          notes: editing.notes,
        }),
      })
      setEditing(null)
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(id: string) {
    await fetch(`/api/collection/${id}`, { method: 'DELETE' })
    setConfirmDelete(null)
    onRefresh()
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
            <th className="px-4 py-3 w-20"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {items.map((item) => {
            const isEditing = editing?.id === item.id
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
                      alt={item.meta.name}
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
                  <div className="font-medium text-white">
                    {item.meta?.name ?? item.itemNo}
                  </div>
                  <div className="text-xs text-gray-500">{item.itemNo} · {item.itemType}</div>
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
                  {isEditing ? (
                    <input
                      type="number"
                      min="1"
                      value={editing.quantity}
                      onChange={(e) => setEditing({ ...editing, quantity: e.target.value })}
                      className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm text-right focus:outline-none focus:border-yellow-400"
                    />
                  ) : (
                    <span className="text-gray-200">{item.quantity}</span>
                  )}
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
                  {isEditing ? (
                    <input
                      type="text"
                      value={editing.notes}
                      onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                      placeholder="Notes..."
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-yellow-400"
                    />
                  ) : (
                    <span className="text-gray-400 text-xs line-clamp-2">{item.notes || '—'}</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={saveEdit}
                        disabled={saving}
                        className="p-1.5 rounded text-green-400 hover:bg-green-900/30 transition-colors"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="p-1.5 rounded text-gray-400 hover:bg-gray-700 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : confirmDelete === item.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="px-2 py-1 rounded text-xs bg-red-600 text-white hover:bg-red-500 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="p-1.5 rounded text-gray-400 hover:bg-gray-700 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditing({ id: item.id, quantity: String(item.quantity), notes: item.notes ?? '' })}
                        className="p-1.5 rounded text-gray-400 hover:text-yellow-400 hover:bg-gray-700 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(item.id)}
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
    </div>
  )
}
