'use client'

import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

export interface SalePoint {
  t: number // timestamp (ms)
  price: number
  quantity: number
}

export interface AvgPoint {
  t: number
  avg: number
  units: number
}

interface Props {
  sales: SalePoint[]
  monthly: AvgPoint[]
  purchasePrice: number | null
  domain: [number, number]
}

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(t: number, withDay = true) {
  return new Date(t).toLocaleDateString('en-US', {
    month: 'short',
    ...(withDay && { day: 'numeric' }),
    year: 'numeric',
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const p = payload[0].payload as Partial<SalePoint & AvgPoint>
  const isSale = p.price != null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl text-sm">
      <p className="text-gray-400 mb-1">
        {isSale ? fmtDate(p.t!) : `${fmtDate(p.t!, false)} average`}
      </p>
      <p className="font-medium text-white">{fmt(isSale ? p.price! : p.avg!)}</p>
      <p className="text-xs text-gray-500">
        {isSale ? `qty ${p.quantity}` : `${p.units} unit${p.units !== 1 ? 's' : ''} sold`}
      </p>
    </div>
  )
}

export default function PriceHistoryChart({ sales, monthly, purchasePrice, domain }: Props) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={domain}
          tickFormatter={(t) => new Date(t).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#374151' }}
        />
        <YAxis
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#374151' }}
          tickFormatter={(v) => `$${v.toLocaleString()}`}
          domain={[0, 'auto']}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4B5563' }} />
        <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: 12, paddingTop: 12 }} />
        {purchasePrice != null && (
          <ReferenceLine
            y={purchasePrice}
            stroke="#6B7280"
            strokeDasharray="5 5"
            label={{ value: `Paid ${fmt(purchasePrice)}`, fill: '#9CA3AF', fontSize: 11, position: 'insideTopLeft' }}
          />
        )}
        <Scatter name="Individual sale" data={sales} dataKey="price" fill="#60A5FA" fillOpacity={0.6} />
        <Line
          name="Monthly average"
          data={monthly}
          dataKey="avg"
          type="monotone"
          stroke="#FBBF24"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#FBBF24' }}
          activeDot={{ r: 5, fill: '#FBBF24' }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
