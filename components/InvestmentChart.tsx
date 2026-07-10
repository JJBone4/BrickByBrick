'use client'

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
          <h3 className="text-sm font-medium text-gray-400 mb-4">Portfolio Value Over Time</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
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
