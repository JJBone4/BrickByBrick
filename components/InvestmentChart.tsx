'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { InvestmentData } from '@/lib/types'

interface Props {
  data: InvestmentData
}

type Range = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'
const RANGES: { value: Range; label: string; days: number | null }[] = [
  { value: '1W', label: '1W', days: 7 },
  { value: '1M', label: '1M', days: 30 },
  { value: '3M', label: '3M', days: 91 },
  { value: '6M', label: '6M', days: 182 },
  { value: '1Y', label: '1Y', days: 365 },
  { value: 'ALL', label: 'All', days: null },
]

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl text-sm">
      <p className="text-gray-400 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span style={{ color: p.color }}>●</span>
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-medium text-white">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function InvestmentChart({ data }: Props) {
  const { gain, gainPercent, totalCostBasis, currentValue, chartData } = data
  const [range, setRange] = useState<Range>('ALL')
  const [now] = useState(() => Date.now()) // captured once so the range cutoff is stable across renders

  // Only the selected window of daily snapshots (dates are YYYY-MM-DD, so string compare works)
  const days = RANGES.find((r) => r.value === range)!.days
  const cutoff = days == null ? '' : new Date(now - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const visible = chartData.filter((p) => p.date >= cutoff)
  const first = visible[0]
  const last = visible[visible.length - 1]
  const periodChange = first && last && visible.length > 1 ? last.marketValue - first.marketValue : null
  const periodPct = periodChange != null && first.marketValue > 0 ? (periodChange / first.marketValue) * 100 : null

  const gainPositive = gain >= 0

  const summaryCards = [
    { label: 'Total Invested', value: fmt(totalCostBasis), sub: 'cost basis' },
    {
      label: 'Current Value',
      value: fmt(currentValue),
      sub: 'market avg price',
    },
    {
      label: 'Total Gain/Loss',
      value: `${gainPositive ? '+' : ''}${fmt(gain)}`,
      sub: `${gainPositive ? '+' : ''}${gainPercent.toFixed(1)}%`,
      highlight: gainPositive ? 'text-green-400' : gain < 0 ? 'text-red-400' : 'text-gray-400',
    },
    {
      label: 'Return',
      value: `${gainPositive ? '+' : ''}${gainPercent.toFixed(1)}%`,
      sub: 'vs cost basis',
      highlight: gainPositive ? 'text-green-400' : gain < 0 ? 'text-red-400' : 'text-gray-400',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              {card.label}
            </div>
            <div className={`text-xl font-bold ${card.highlight ?? 'text-white'}`}>
              {card.value}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Line Chart */}
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
          No price history yet. Prices are refreshed automatically every 6 hours.
        </div>
      ) : (
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-400">Portfolio Value Over Time</h3>
              <p className="text-xs mt-0.5">
                {periodChange != null ? (
                  <span className={periodChange > 0 ? 'text-green-400' : periodChange < 0 ? 'text-red-400' : 'text-gray-400'}>
                    {periodChange >= 0 ? '+' : '-'}{fmt(Math.abs(periodChange))}
                    {periodPct != null && ` (${periodPct >= 0 ? '+' : ''}${periodPct.toFixed(1)}%)`}
                  </span>
                ) : (
                  <span className="text-gray-500">Not enough snapshots in this period</span>
                )}
                <span className="text-gray-500">
                  {' '}{range === 'ALL' ? 'since first snapshot' : `over the last ${RANGES.find((r) => r.value === range)!.label}`}
                </span>
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-gray-700 p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    range === r.value ? 'bg-yellow-400 text-gray-900' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={visible} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) =>
                  new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(range === '1Y' || range === 'ALL' ? { year: '2-digit' } : {}) })
                }
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#374151' }}
              />
              <YAxis
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#374151' }}
                tickFormatter={(v) => `$${v.toLocaleString()}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ color: '#9CA3AF', fontSize: 12, paddingTop: 12 }}
              />
              <Line
                type="monotone"
                dataKey="costBasis"
                name="Cost Basis"
                stroke="#6B7280"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="marketValue"
                name="Market Value"
                stroke="#FBBF24"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#FBBF24' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
