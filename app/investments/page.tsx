'use client'

import { useState, useEffect } from 'react'
import InvestmentChart from '@/components/InvestmentChart'
import { InvestmentData } from '@/lib/types'

export default function InvestmentsPage() {
  const [data, setData] = useState<InvestmentData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/investments')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl font-bold text-white mb-6">Investment Overview</h1>
      {loading ? (
        <div className="text-center py-20 text-gray-500 animate-pulse">Loading...</div>
      ) : data ? (
        <InvestmentChart data={data} />
      ) : (
        <div className="text-center py-20 text-gray-500">Failed to load investment data</div>
      )}
    </div>
  )
}
