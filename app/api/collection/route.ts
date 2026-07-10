import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

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
  const { itemNo, itemType, condition, quantity, purchasePrice, purchaseDate, notes } = body

  if (!itemNo || !itemType || !condition) {
    return Response.json({ error: 'itemNo, itemType, and condition are required' }, { status: 400 })
  }

  const item = await prisma.collectionItem.create({
    data: {
      itemNo: itemNo.trim().toUpperCase(),
      itemType: itemType.toUpperCase(),
      condition: condition.toUpperCase(),
      quantity: Number(quantity) || 1,
      purchasePrice: purchasePrice ? Number(purchasePrice) : null,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      notes: notes?.trim() || null,
    },
  })

  return Response.json(item, { status: 201 })
}
