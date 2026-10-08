import { prisma } from './prisma'
import { getPriceGuide, BricklinkItemType, BricklinkCondition } from './bricklink'

const CONDITIONS: BricklinkCondition[] = ['N', 'U']

/**
 * Fetch BrickLink's sold price guide for one item in both conditions, saving a
 * price snapshot plus every individual sale (duplicates are skipped).
 */
export async function syncItemPrices(itemNo: string, itemType: string): Promise<string[]> {
  const errors: string[] = []

  for (const condition of CONDITIONS) {
    try {
      const guide = await getPriceGuide(itemType as BricklinkItemType, itemNo, condition)

      await prisma.priceSnapshot.create({
        data: {
          itemNo,
          itemType,
          condition,
          avgPrice: parseFloat(guide.avg_price) || 0,
          minPrice: parseFloat(guide.min_price) || 0,
          maxPrice: parseFloat(guide.max_price) || 0,
          qtySold: guide.unit_quantity || 0,
          totalLots: guide.price_detail?.length || 0,
        },
      })

      const sales = (guide.price_detail ?? [])
        .map((s) => ({
          itemNo,
          itemType,
          condition,
          unitPrice: parseFloat(s.unit_price),
          quantity: s.quantity || 1,
          dateOrdered: new Date(s.date_ordered),
          sellerCountry: s.seller_country_code || null,
          buyerCountry: s.buyer_country_code || null,
        }))
        .filter((s) => Number.isFinite(s.unitPrice) && !Number.isNaN(s.dateOrdered.getTime()))

      if (sales.length) {
        await prisma.priceSale.createMany({ data: sales, skipDuplicates: true })
      }
    } catch (err) {
      errors.push(`${itemNo} (${itemType}/${condition}): ${err}`)
    }
  }

  return errors
}

/**
 * Sync an item's prices unless both conditions were snapshotted in the last 6 hours,
 * or if snapshots report sales that never got saved (e.g. an earlier sync failed partway).
 */
export async function ensureFreshPrices(itemNo: string, itemType: string): Promise<void> {
  const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000)
  const [recent, savedSales] = await Promise.all([
    prisma.priceSnapshot.findMany({
      where: { itemNo, itemType, capturedAt: { gte: cutoff } },
      select: { condition: true, totalLots: true },
    }),
    prisma.priceSale.count({ where: { itemNo, itemType } }),
  ])
  const conditionsFresh = new Set(recent.map((r) => r.condition)).size
  const salesMissing = savedSales === 0 && recent.some((r) => r.totalLots > 0)
  if (conditionsFresh < 2 || salesMissing) await syncItemPrices(itemNo, itemType)
}

export async function refreshPrices(): Promise<{ refreshed: number; errors: string[] }> {
  const items = await prisma.collectionItem.findMany({
    select: { itemNo: true, itemType: true },
    distinct: ['itemNo', 'itemType'],
  })

  let refreshed = 0
  const errors: string[] = []

  for (const item of items) {
    const itemErrors = await syncItemPrices(item.itemNo, item.itemType)
    if (itemErrors.length === 0) refreshed++
    errors.push(...itemErrors)
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
