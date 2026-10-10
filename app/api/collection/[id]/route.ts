import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureFreshPrices } from '@/lib/refresh'
import { normalizeTags } from '@/lib/conditionTags'
import { sameRowWhere } from '@/lib/merge'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const item = await prisma.collectionItem.findUnique({ where: { id } })
  if (!item) return Response.json({ error: 'Item not found' }, { status: 404 })

  const { itemNo, itemType } = item

  // Backfill on first view
  await ensureFreshPrices(itemNo, itemType)

  const [meta, snapshotN, snapshotU, sales] = await Promise.all([
    prisma.cachedItem.findUnique({ where: { itemNo_itemType: { itemNo, itemType } } }),
    prisma.priceSnapshot.findFirst({ where: { itemNo, itemType, condition: 'N' }, orderBy: { capturedAt: 'desc' } }),
    prisma.priceSnapshot.findFirst({ where: { itemNo, itemType, condition: 'U' }, orderBy: { capturedAt: 'desc' } }),
    prisma.priceSale.findMany({
      where: { itemNo, itemType },
      orderBy: { dateOrdered: 'asc' },
      select: { condition: true, unitPrice: true, quantity: true, dateOrdered: true },
    }),
  ])

  return Response.json({ item, meta, snapshots: { N: snapshotN, U: snapshotU }, sales })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { itemNo, itemType, name, condition, quantity, notes, conditionTags, purchasePrice, purchaseDate } = body

  for (const [field, value] of Object.entries({ itemNo, itemType, condition })) {
    if (value !== undefined && !String(value).trim()) {
      return Response.json({ error: `${field} cannot be empty` }, { status: 400 })
    }
  }

  const updated = await prisma.collectionItem.update({
    where: { id },
    data: {
      ...(itemNo !== undefined && { itemNo: String(itemNo).trim().toUpperCase() }),
      ...(itemType !== undefined && { itemType: String(itemType).toUpperCase() }),
      ...(name !== undefined && { name: name ? String(name).trim() || null : null }),
      ...(condition !== undefined && { condition: String(condition).toUpperCase() }),
      ...(quantity !== undefined && { quantity: Number(quantity) || 1 }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
      ...(conditionTags !== undefined && { conditionTags: normalizeTags(conditionTags) }),
      ...(purchasePrice !== undefined && { purchasePrice: purchasePrice ? Number(purchasePrice) : null }),
      ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }),
    },
  })

  // If the edit made this row identical to another one, combine them: the older row keeps
  // the total quantity (so it holds its place in "Date added" order) and the other is removed
  let item = updated
  let merged = false
  if (updated.notes == null) {
    const twin = await prisma.collectionItem.findFirst({
      where: { ...sameRowWhere(updated), id: { not: updated.id } },
      orderBy: { createdAt: 'asc' },
    })
    if (twin) {
      const [keep, drop] = twin.createdAt <= updated.createdAt ? [twin, updated] : [updated, twin]
      ;[item] = await prisma.$transaction([
        prisma.collectionItem.update({
          where: { id: keep.id },
          data: { quantity: keep.quantity + drop.quantity },
        }),
        prisma.collectionItem.delete({ where: { id: drop.id } }),
      ])
      merged = true
    }
  }

  // If the item ID or type changed, fetch prices for the new item so the table has them right away
  if (itemNo !== undefined || itemType !== undefined) await ensureFreshPrices(item.itemNo, item.itemType)

  return Response.json({ ...item, merged })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.collectionItem.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
