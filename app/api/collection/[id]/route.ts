import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { quantity, notes, purchasePrice, purchaseDate } = body

  const item = await prisma.collectionItem.update({
    where: { id },
    data: {
      ...(quantity !== undefined && { quantity: Number(quantity) }),
      ...(notes !== undefined && { notes }),
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
