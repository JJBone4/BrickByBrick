'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Plus, RefreshCw, ArrowUp, ArrowDown, CheckCircle2, Search, X } from 'lucide-react'
import CollectionTable from '@/components/CollectionTable'
import AddItemDrawer from '@/components/AddItemDrawer'
import { CollectionEntry } from '@/lib/types'
import { getTheme } from '@/lib/themes'
import { formatItemName, decodeEntities } from '@/lib/formatName'

type SortKey = 'added' | 'name' | 'quantity' | 'paid' | 'current'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'added', label: 'Date added' },
  { value: 'name', label: 'Name' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'paid', label: 'Price paid' },
  { value: 'current', label: 'Current price' },
]

function usd(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function sortValue(item: CollectionEntry, key: SortKey): string | number | null {
  switch (key) {
    case 'added': return new Date(item.createdAt).getTime()
    case 'name': return item.meta?.name ? formatItemName(item.meta.name) : item.itemNo
    case 'quantity': return item.quantity
    case 'paid': return item.purchasePrice
    case 'current': return item.snapshot?.avgPrice ?? null
  }
}

export default function CollectionPage() {
  const [items, setItems] = useState<CollectionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [themeFilter, setThemeFilter] = useState('')
  const [conditionFilter, setConditionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('added')
  const [sortAsc, setSortAsc] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(message: string) {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  // `silent` reloads without swapping the table for the loading state
  const fetchItems = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
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
    // Trigger background price refresh on mount; if it actually ran, reload to show the new prices
    fetch('/api/refresh')
      .then((res) => res.json())
      .then((result) => {
        if (!result.skipped) fetchItems(true)
      })
      .catch(() => {})
  }, [fetchItems])

  function handleSaved(message?: string) {
    if (message) showToast(message)
    fetchItems()
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await fetch('/api/refresh?force=1')
      await fetchItems()
    } finally {
      setRefreshing(false)
    }
  }

  // Theme options come from the items in the collection, with a count for each
  const themes = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) {
      const theme = getTheme(item.itemNo, item.itemType)
      counts.set(theme, (counts.get(theme) ?? 0) + 1)
    }
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [items])

  // Search matches the item ID, the display name, or the full BrickLink name
  const query = search.trim().toLowerCase()
  const matchesSearch = (item: CollectionEntry) =>
    !query ||
    item.itemNo.toLowerCase().includes(query) ||
    (!!item.meta?.name &&
      (formatItemName(item.meta.name).toLowerCase().includes(query) ||
        decodeEntities(item.meta.name).toLowerCase().includes(query)))

  const filtered = items.filter(
    (item) =>
      matchesSearch(item) &&
      (!themeFilter || getTheme(item.itemNo, item.itemType) === themeFilter) &&
      (!conditionFilter || item.condition === conditionFilter) &&
      (!statusFilter ||
        (statusFilter === 'retired' && item.meta?.retired === true) ||
        (statusFilter === 'active' && item.meta?.retired === false) ||
        (statusFilter === 'unknown' && item.meta?.retired == null))
  )
  const isFiltered = filtered.length !== items.length

  // Piece counts by type (quantities, not rows), e.g. "12 minifigs / 2 sets"
  const countUnits = (list: CollectionEntry[], type: string) =>
    list.filter((i) => i.itemType === type).reduce((n, i) => n + i.quantity, 0)
  const counts = [
    { type: 'MINIFIG', one: 'minifig', many: 'minifigs', always: true },
    { type: 'BIGFIG', one: 'big fig', many: 'big figs', always: false },
    { type: 'SET', one: 'set', many: 'sets', always: true },
  ]
    // Big figs only appear in the header once you own one
    .filter(({ type, always }) => always || countUnits(items, type) > 0)
    .map(({ type, one, many }) => {
      const total = countUnits(items, type)
      const shown = countUnits(filtered, type)
      return `${isFiltered ? `${shown} of ` : ''}${total} ${total === 1 ? one : many}`
    })

  const sorted = [...filtered].sort((a, b) => {
    const va = sortValue(a, sortKey)
    const vb = sortValue(b, sortKey)
    // Items with no value (e.g. no price yet) always go last
    if (va == null) return vb == null ? 0 : 1
    if (vb == null) return -1
    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : va - (vb as number)
    return sortAsc ? cmp : -cmp
  })

  const totalValue = filtered.reduce((sum, item) => {
    return sum + (item.snapshot?.avgPrice ?? 0) * item.quantity
  }, 0)

  const totalCost = filtered.reduce((sum, item) => {
    return sum + (item.purchasePrice ?? 0) * item.quantity
  }, 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Collection</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {counts.join(' / ')} ·{' '}
            <span className="text-yellow-400 font-medium">
              {usd(totalValue)}
            </span>{' '}
            current value
            {totalCost > 0 && (
              <> · <span className="text-gray-400">{usd(totalCost)} invested</span></>
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

      {/* Filters */}
      {!loading && items.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative w-full sm:w-96">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
              placeholder="Search ID or name..."
              aria-label="Search by item ID or name"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-8 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <select
            value={themeFilter}
            onChange={(e) => setThemeFilter(e.target.value)}
            aria-label="Filter by theme"
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
          >
            <option value="">All themes</option>
            {themes.map(([theme, count]) => (
              <option key={theme} value={theme}>{theme} ({count})</option>
            ))}
          </select>
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            aria-label="Filter by condition"
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
          >
            <option value="">All conditions</option>
            <option value="N">New</option>
            <option value="U">Used</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by retired or active"
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="retired">Retired</option>
            {items.some((i) => i.meta?.retired == null) && <option value="unknown">Unknown</option>}
          </select>
          {(search || themeFilter || conditionFilter || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setThemeFilter(''); setConditionFilter(''); setStatusFilter('') }}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear filters
            </button>
          )}
          <div className="flex items-center gap-1 sm:ml-auto">
            <select
              value={sortKey}
              onChange={(e) => {
                const key = e.target.value as SortKey
                setSortKey(key)
                setSortAsc(key === 'name') // A→Z for names, high→low / newest first for the rest
              }}
              aria-label="Sort by"
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>Sort: {o.label}</option>
              ))}
            </select>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              title={sortAsc ? 'Ascending' : 'Descending'}
              aria-label={sortAsc ? 'Sort ascending' : 'Sort descending'}
              className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
            >
              {sortAsc ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-20 text-gray-500 animate-pulse">Loading...</div>
      ) : items.length > 0 && filtered.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 text-center py-16 text-gray-500">
          No items match your search or filters
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <CollectionTable items={sorted} onRefresh={fetchItems} onSaved={handleSaved} />
        </div>
      )}

      {/* Add Item Drawer */}
      <AddItemDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAdded={handleSaved}
      />

      {/* Toast */}
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
