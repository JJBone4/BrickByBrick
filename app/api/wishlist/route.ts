import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getItem } from '@/lib/bricklink'
import { ensureFreshPrices } from '@/lib/refresh'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await prisma.wishlistItem.findMany({ orderBy: { createdAt: 'desc' } })

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
  const { itemNo: rawNo, itemType: rawType, condition: rawCondition, maxPrice } = await req.json()
  if (!rawNo?.trim() || !rawType || !rawCondition) {
    return Response.json({ error: 'Item ID, type, and condition are required' }, { status: 400 })
  }
  const itemNo = String(rawNo).trim().toUpperCase()
  const itemType = String(rawType).toUpperCase()
  const condition = String(rawCondition).toUpperCase()

  const existing = await prisma.wishlistItem.findUnique({
    where: { itemNo_itemType_condition: { itemNo, itemType, condition } },
  })
  if (existing) {
    return Response.json({ error: 'That item is already on your wish list' }, { status: 409 })
  }

  // Make sure it exists on BrickLink, and cache its name/image for display
  try {
    const bl = await getItem(itemType, itemNo)
    const meta = {
      name: bl.name,
      imageUrl: bl.thumbnail_url || bl.image_url || null,
      categoryName: String(bl.category_id),
      lastFetched: new Date(),
    }
    await prisma.cachedItem.upsert({
      where: { itemNo_itemType: { itemNo, itemType } },
      create: { itemNo, itemType, ...meta },
      update: meta,
    })
  } catch {
    return Response.json({ error: `Couldn't find ${itemNo} on BrickLink` }, { status: 404 })
  }

  const item = await prisma.wishlistItem.create({
    data: { itemNo, itemType, condition, maxPrice: maxPrice ? Number(maxPrice) : null },
  })
  await ensureFreshPrices(itemNo, itemType) // price + retirement status right away
  return Response.json(item, { status: 201 })
}
