import { prisma } from './prisma'
import { getPriceGuide, BricklinkItemType, BricklinkCondition } from './bricklink'

export async function refreshPrices(): Promise<{ refreshed: number; errors: string[] }> {
  const items = await prisma.collectionItem.findMany({
    select: { itemNo: true, itemType: true, condition: true },
    distinct: ['itemNo', 'itemType', 'condition'],
  })

  let refreshed = 0
  const errors: string[] = []

  for (const item of items) {
    try {
      const guide = await getPriceGuide(
        item.itemType as BricklinkItemType,
        item.itemNo,
        item.condition as BricklinkCondition
      )

      await prisma.priceSnapshot.create({
        data: {
          itemNo: item.itemNo,
          itemType: item.itemType,
          condition: item.condition,
          avgPrice: parseFloat(guide.avg_price) || 0,
          minPrice: parseFloat(guide.min_price) || 0,
          maxPrice: parseFloat(guide.max_price) || 0,
          qtySold: guide.unit_quantity || 0,
          totalLots: guide.price_detail?.length || 0,
        },
      })
      refreshed++
    } catch (err) {
      errors.push(`${item.itemNo} (${item.itemType}/${item.condition}): ${err}`)
    }
  }

  return { refreshed, errors }
}

export async function needsRefresh(): Promise<boolean> {
  const SIX_HOURS = 6 * 60 * 60 * 1000
  const cutoff = new Date(Date.now() - SIX_HOURS)

  const items = await prisma.collectionItem.findMany({
    select: { itemNo: true, itemType: true, condition: true },
    distinct: ['itemNo', 'itemType', 'condition'],
  })

  if (items.length === 0) return false

  for (const item of items) {
    const recent = await prisma.priceSnapshot.findFirst({
      where: {
        itemNo: item.itemNo,
        itemType: item.itemType,
        condition: item.condition,
        capturedAt: { gte: cutoff },
      },
    })
    if (!recent) return true
  }

  return false
}
