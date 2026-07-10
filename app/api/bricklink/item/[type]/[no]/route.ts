import { NextRequest } from 'next/server'
import { getItem, BricklinkItemType } from '@/lib/bricklink'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string; no: string }> }
) {
  const { type, no } = await params

  const itemType = type.toUpperCase()

  // Return cached metadata if fresh (< 24h)
  const cached = await prisma.cachedItem.findUnique({
    where: { itemNo_itemType: { itemNo: no, itemType } },
  })
  const DAY = 24 * 60 * 60 * 1000
  if (cached && Date.now() - cached.lastFetched.getTime() < DAY) {
    return Response.json(cached)
  }

  try {
    const item = await getItem(itemType as BricklinkItemType, no)
    const upserted = await prisma.cachedItem.upsert({
      where: { itemNo_itemType: { itemNo: no, itemType } },
      create: {
        itemNo: no,
        itemType,
        name: item.name,
        imageUrl: item.thumbnail_url || item.image_url || null,
        categoryName: String(item.category_id),
        lastFetched: new Date(),
      },
      update: {
        name: item.name,
        imageUrl: item.thumbnail_url || item.image_url || null,
        categoryName: String(item.category_id),
        lastFetched: new Date(),
      },
    })
    return Response.json(upserted)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 })
  }
}
