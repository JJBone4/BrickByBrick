'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import PriceHistoryChart, { SalePoint, AvgPoint } from '@/components/PriceHistoryChart'
import { ItemDetail } from '@/lib/types'
import { formatItemName, decodeEntities, bricklinkUrl, largeImageUrl } from '@/lib/formatName'
import ImageLightbox from '@/components/ImageLightbox'
import { getTheme } from '@/lib/themes'
import ConditionTagList from '@/components/ConditionTagList'

type Range = '3M' | '6M' | '1Y' | 'ALL'
const RANGES: { value: Range; label: string; months: number | null }[] = [
  { value: '3M', label: '3M', months: 3 },
  { value: '6M', label: '6M', months: 6 },
  { value: '1Y', label: '1Y', months: 12 },
  { value: 'ALL', label: 'All', months: null },
]

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function signed(n: number, f: (n: number) => string) {
  return `${n >= 0 ? '+' : ''}${f(n)}`
}

function gainColor(n: number | null) {
  if (n == null || n === 0) return 'text-gray-400'
  return n > 0 ? 'text-green-400' : 'text-red-400'
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-bold ${color ?? 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<ItemDetail | null>(null)
  const [error, setError] = useState('')
  const [condition, setCondition] = useState<'N' | 'U' | null>(null)
  const [range, setRange] = useState<Range>('6M')
  const [zoomed, setZoomed] = useState(false)
  // Captured once so range filtering is stable across renders
  const [now] = useState(() => Date.now())

  useEffect(() => {
    fetch(`/api/collection/${id}`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load item')
        setData(json)
      })
      .catch((err: Error) => setError(err.message))
  }, [id])

  const activeCondition = condition ?? (data?.item.condition as 'N' | 'U') ?? 'U'

  const chart = useMemo(() => {
    if (!data) return null
    const months = RANGES.find((r) => r.value === range)!.months
    const start = months == null ? -Infinity : new Date(now).setMonth(new Date(now).getMonth() - months)

    const sales: SalePoint[] = data.sales
      .filter((s) => s.condition === activeCondition)
      .map((s) => ({ t: new Date(s.dateOrdered).getTime(), price: s.unitPrice, quantity: s.quantity }))
      .filter((s) => s.t >= start)

    // Quantity-weighted average per calendar month, plotted mid-month
    const buckets = new Map<string, { total: number; units: number; t: number }>()
    for (const s of sales) {
      const d = new Date(s.t)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const b = buckets.get(key) ?? { total: 0, units: 0, t: new Date(d.getFullYear(), d.getMonth(), 15).getTime() }
      b.total += s.price * s.quantity
      b.units += s.quantity
      buckets.set(key, b)
    }
    const monthly: AvgPoint[] = [...buckets.values()]
      .map((b) => ({ t: b.t, avg: b.total / b.units, units: b.units }))
      .sort((a, b) => a.t - b.t)

    const units = sales.reduce((n, s) => n + s.quantity, 0)
    const avg = units ? sales.reduce((n, s) => n + s.price * s.quantity, 0) / units : null
    const prices = sales.map((s) => s.price)
    const last = sales.length ? sales[sales.length - 1] : null
    const change =
      monthly.length >= 2 ? ((monthly[monthly.length - 1].avg - monthly[0].avg) / monthly[0].avg) * 100 : null

    const first = sales.length ? sales[0].t : now
    const domain: [number, number] = [Number.isFinite(start) ? start : first, now]

    return {
      sales,
      monthly,
      domain,
      stats: {
        avg,
        units,
        count: sales.length,
        high: prices.length ? Math.max(...prices) : null,
        low: prices.length ? Math.min(...prices) : null,
        last,
        change,
      },
    }
  }, [data, activeCondition, range, now])

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <BackLink />
        <div className="text-center py-20 text-red-400">{error}</div>
      </div>
    )
  }

  if (!data || !chart) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <BackLink />
        <div className="text-center py-20 text-gray-500 animate-pulse">Loading price history...</div>
      </div>
    )
  }

  const { item, meta, snapshots } = data
  const { stats } = chart

  // "Your position" uses BrickLink's 6-month average for the condition you own, matching the collection table
  const marketPrice = snapshots[item.condition as 'N' | 'U']?.avgPrice ?? null
  const totalCost = item.purchasePrice != null ? item.purchasePrice * item.quantity : null
  const marketValue = marketPrice != null ? marketPrice * item.quantity : null
  const gain = totalCost != null && marketValue != null ? marketValue - totalCost : null
  const gainPct = gain != null && totalCost ? (gain / totalCost) * 100 : null
  const rangeLabel = range === 'ALL' ? 'all time' : `last ${RANGES.find((r) => r.value === range)!.label}`

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <BackLink />

      {zoomed && meta?.imageUrl && (
        <ImageLightbox
          src={largeImageUrl(item.itemType, item.itemNo)}
          fallbackSrc={meta.imageUrl}
          alt={`${formatItemName(meta.name)} · ${item.itemNo}`}
          onClose={() => setZoomed(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        {meta?.imageUrl ? (
          <button
            onClick={() => setZoomed(true)}
            title="Enlarge image"
            aria-label="Enlarge image"
            className="shrink-0 rounded-lg cursor-zoom-in hover:ring-2 hover:ring-yellow-400 transition-shadow"
          >
            <img
              src={largeImageUrl(item.itemType, item.itemNo)}
              onError={(e) => { if (e.currentTarget.src !== meta.imageUrl) e.currentTarget.src = meta.imageUrl! }}
              alt={formatItemName(meta.name)}
              className="w-20 h-20 object-contain rounded-lg bg-white p-1"
            />
          </button>
        ) : (
          <div className="w-20 h-20 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 shrink-0">?</div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white" title={meta?.name ? decodeEntities(meta.name) : undefined}>
            {meta?.name ? formatItemName(meta.name) : item.itemNo}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-400 mt-1">
            <a
              href={bricklinkUrl(item.itemType, item.itemNo)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-blue-400 hover:underline"
            >
              {item.itemNo} <ExternalLink size={12} />
            </a>
            <span>·</span>
            <span>{getTheme(item.itemNo, item.itemType)}</span>
            <span>·</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              item.condition === 'N' ? 'bg-blue-900/50 text-blue-300' : 'bg-orange-900/50 text-orange-300'
            }`}>
              {item.condition === 'N' ? 'New' : 'Used'}
            </span>
          </div>
          {meta?.name && (
            <p className="text-xs text-gray-500 mt-1">{decodeEntities(meta.name)}</p>
          )}
        </div>
      </div>

      {/* Your position */}
      <section>
        <h2 className="text-sm font-medium text-gray-400 mb-3">Your position</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Quantity" value={String(item.quantity)} sub={item.purchaseDate ? `bought ${new Date(item.purchaseDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}` : undefined} />
          <Stat label="Cost basis" value={fmt(totalCost)} sub={item.purchasePrice != null ? `${fmt(item.purchasePrice)} each` : 'no price entered'} />
          <Stat label="Market value" value={fmt(marketValue)} sub={marketPrice != null ? `${fmt(marketPrice)} each · 6-mo avg` : 'no price data'} />
          <Stat
            label="Gain/Loss"
            value={gain != null ? signed(gain, fmt) : '—'}
            sub={gainPct != null ? signed(gainPct, (n) => `${n.toFixed(1)}%`) : undefined}
            color={gainColor(gain)}
          />
        </div>
        <div className="mt-3">
          <ConditionTagList tags={item.conditionTags} notes={item.notes} />
        </div>
      </section>

      {/* Price history */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-gray-400">Price history · BrickLink sales</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Toggle
              options={[{ value: 'N', label: 'New' }, { value: 'U', label: 'Used' }]}
              value={activeCondition}
              onChange={(v) => setCondition(v as 'N' | 'U')}
            />
            <Toggle options={RANGES} value={range} onChange={(v) => setRange(v as Range)} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Stat label="Avg sale" value={fmt(stats.avg)} sub={rangeLabel} />
          <Stat
            label="Last sale"
            value={fmt(stats.last?.price)}
            sub={stats.last ? new Date(stats.last.t).toLocaleDateString() : undefined}
          />
          <Stat label="High / Low" value={stats.high != null ? `${fmt(stats.high)}` : '—'} sub={stats.low != null ? `low ${fmt(stats.low)}` : undefined} />
          <Stat label="Units sold" value={String(stats.units)} sub={`${stats.count} sale${stats.count !== 1 ? 's' : ''}`} />
          <Stat
            label="Trend"
            value={stats.change != null ? signed(stats.change, (n) => `${n.toFixed(1)}%`) : '—'}
            sub={stats.change != null ? 'first vs last month avg' : 'needs 2+ months of sales'}
            color={gainColor(stats.change)}
          />
        </div>

        {chart.sales.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500 text-sm text-center">
            No {activeCondition === 'N' ? 'new' : 'used'} sales recorded on BrickLink for this period.
          </div>
        ) : (
          <PriceHistoryChart
            sales={chart.sales}
            monthly={chart.monthly}
            purchasePrice={activeCondition === item.condition ? item.purchasePrice : null}
            domain={chart.domain}
          />
        )}
        <p className="text-xs text-gray-600">
          BrickLink shares about 6 months of sales at a time. Sales are saved on every price refresh, so history beyond that builds up over time.
        </p>
      </section>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href="/collection"
      className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
    >
      <ArrowLeft size={16} />
      Back to collection
    </Link>
  )
}

function Toggle({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-gray-700 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            value === o.value ? 'bg-yellow-400 text-gray-900' : 'text-gray-400 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
