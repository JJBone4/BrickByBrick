import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { itemNo, itemType, condition, quantity, notes, purchasePrice, purchaseDate } = body

  for (const [field, value] of Object.entries({ itemNo, itemType, condition })) {
    if (value !== undefined && !String(value).trim()) {
      return Response.json({ error: `${field} cannot be empty` }, { status: 400 })
    }
  }

  const item = await prisma.collectionItem.update({
    where: { id },
    data: {
      ...(itemNo !== undefined && { itemNo: String(itemNo).trim().toUpperCase() }),
      ...(itemType !== undefined && { itemType: String(itemType).toUpperCase() }),
      ...(condition !== undefined && { condition: String(condition).toUpperCase() }),
      ...(quantity !== undefined && { quantity: Number(quantity) || 1 }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
      ...(purchasePrice !== undefined && { purchasePrice: purchasePrice ? Number(purchasePrice) : null }),
      ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }),
    },
  })

  return Response.json(item)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.collectionItem.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
