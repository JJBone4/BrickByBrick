'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import CollectionTable from '@/components/CollectionTable'
import AddItemDrawer from '@/components/AddItemDrawer'
import { CollectionEntry } from '@/lib/types'

export default function CollectionPage() {
  const [items, setItems] = useState<CollectionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/collection')
      const data = await res.json()
      setItems(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
    // Trigger background price refresh on mount
    fetch('/api/refresh').catch(() => {})
  }, [fetchItems])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await fetch('/api/refresh')
      await fetchItems()
    } finally {
      setRefreshing(false)
    }
  }

  const totalValue = items.reduce((sum, item) => {
    return sum + (item.snapshot?.avgPrice ?? 0) * item.quantity
  }, 0)

  const totalCost = items.reduce((sum, item) => {
    return sum + (item.purchasePrice ?? 0) * item.quantity
  }, 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Collection</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} item{items.length !== 1 ? 's' : ''} ·{' '}
            <span className="text-yellow-400 font-medium">
              ${totalValue.toFixed(2)}
            </span>{' '}
            current value
            {totalCost > 0 && (
              <> · <span className="text-gray-400">${totalCost.toFixed(2)} invested</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh Prices'}
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-gray-900 text-sm font-semibold hover:bg-yellow-300 transition-colors"
          >
            <Plus size={16} />
            Add Item
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-20 text-gray-500 animate-pulse">Loading...</div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <CollectionTable items={items} onRefresh={fetchItems} />
        </div>
      )}

      {/* Add Item Drawer */}
      <AddItemDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAdded={fetchItems}
      />
    </div>
  )
}
