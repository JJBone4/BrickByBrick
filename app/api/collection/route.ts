import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeTags } from '@/lib/conditionTags'
import { ensureFreshPrices } from '@/lib/refresh'
import { sameRowWhere } from '@/lib/merge'

export async function GET() {
  const items = await prisma.collectionItem.findMany({
    orderBy: { createdAt: 'desc' },
  })

  // Attach latest price snapshot and cached metadata for each item
  const enriched = await Promise.all(
    items.map(async (item) => {
      const [snapshot, meta] = await Promise.all([
        prisma.priceSnapshot.findFirst({
          where: { itemNo: item.itemNo, itemType: item.itemType, condition: item.condition },
          orderBy: { capturedAt: 'desc' },
        }),
        prisma.cachedItem.findUnique({
          where: { itemNo_itemType: { itemNo: item.itemNo, itemType: item.itemType } },
        }),
      ])
      return { ...item, snapshot, meta }
    })
  )

  return Response.json(enriched)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { itemNo, itemType, condition, quantity, purchasePrice, purchaseDate, conditionTags } = body

  if (!itemNo || !itemType || !condition) {
    return Response.json({ error: 'itemNo, itemType, and condition are required' }, { status: 400 })
  }

  const data = {
    itemNo: itemNo.trim().toUpperCase(),
    itemType: itemType.toUpperCase(),
    condition: condition.toUpperCase(),
    purchasePrice: purchasePrice ? Number(purchasePrice) : null,
    purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
  }
  const tags = normalizeTags(conditionTags)
  const qty = Number(quantity) || 1

  // If a matching row exists, add to its count instead of creating a duplicate
  const existing = await prisma.collectionItem.findFirst({
    where: sameRowWhere({ ...data, conditionTags: tags }),
    orderBy: { createdAt: 'asc' },
  })
  if (existing) {
    const item = await prisma.collectionItem.update({
      where: { id: existing.id },
      data: { quantity: { increment: qty } },
    })
    return Response.json({ ...item, merged: true })
  }

  const item = await prisma.collectionItem.create({ data: { ...data, conditionTags: tags, quantity: qty } })
  // Fetch prices now so the new row shows a current price as soon as the table reloads
  await ensureFreshPrices(item.itemNo, item.itemType)
  return Response.json({ ...item, merged: false }, { status: 201 })
}
