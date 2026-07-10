import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await prisma.collectionItem.findMany({
    select: {
      itemNo: true,
      itemType: true,
      condition: true,
      quantity: true,
      purchasePrice: true,
      purchaseDate: true,
    },
  })

  const totalCostBasis = items.reduce(
    (sum, i) => sum + (i.purchasePrice ?? 0) * i.quantity,
    0
  )

  // Get latest snapshot per unique item+condition
  const uniqueKeys = Array.from(
    new Set(items.map((i) => `${i.itemNo}|${i.itemType}|${i.condition}`))
  )

  const latestSnapshots = await Promise.all(
    uniqueKeys.map(async (key) => {
      const [itemNo, itemType, condition] = key.split('|')
      const snap = await prisma.priceSnapshot.findFirst({
        where: { itemNo, itemType, condition },
        orderBy: { capturedAt: 'desc' },
      })
      return { itemNo, itemType, condition, snap }
    })
  )

  const snapshotMap = new Map(
    latestSnapshots.map((s) => [`${s.itemNo}|${s.itemType}|${s.condition}`, s.snap])
  )

  const currentValue = items.reduce((sum, i) => {
    const snap = snapshotMap.get(`${i.itemNo}|${i.itemType}|${i.condition}`)
    return sum + (snap?.avgPrice ?? 0) * i.quantity
  }, 0)

  // Build chart data: portfolio value over time from snapshots
  const allSnapshots = await prisma.priceSnapshot.findMany({
    orderBy: { capturedAt: 'asc' },
  })

  // Group snapshots by day, calculate portfolio value at each day
  const dayMap = new Map<string, Map<string, number>>()
  for (const snap of allSnapshots) {
    const day = snap.capturedAt.toISOString().slice(0, 10)
    if (!dayMap.has(day)) dayMap.set(day, new Map())
    const key = `${snap.itemNo}|${snap.itemType}|${snap.condition}`
    // Keep latest snapshot for this key on this day
    dayMap.get(day)!.set(key, snap.avgPrice)
  }

  // Build running best-known price map for each day
  const runningPrices = new Map<string, number>()
  const chartData = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, dayPrices]) => {
      // Update running prices
      dayPrices.forEach((price, key) => runningPrices.set(key, price))

      // Calculate total portfolio value using known quantities
      const portfolioValue = items.reduce((sum, item) => {
        const key = `${item.itemNo}|${item.itemType}|${item.condition}`
        const price = runningPrices.get(key) ?? 0
        return sum + price * item.quantity
      }, 0)

      return { date: day, marketValue: portfolioValue, costBasis: totalCostBasis }
    })

  return Response.json({
    totalCostBasis,
    currentValue,
    gain: currentValue - totalCostBasis,
    gainPercent: totalCostBasis > 0 ? ((currentValue - totalCostBasis) / totalCostBasis) * 100 : 0,
    chartData,
  })
}
