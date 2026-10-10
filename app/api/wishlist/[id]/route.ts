import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { maxPrice } = await req.json()
  const item = await prisma.wishlistItem.update({
    where: { id },
    data: { maxPrice: maxPrice === '' || maxPrice == null ? null : Number(maxPrice) },
  })
  return Response.json(item)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.wishlistItem.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
