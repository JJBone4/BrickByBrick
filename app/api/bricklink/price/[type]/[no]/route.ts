import { NextRequest } from 'next/server'
import { getPriceGuide, BricklinkItemType, BricklinkCondition } from '@/lib/bricklink'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; no: string }> }
) {
  const { type, no } = await params
  const condition = (req.nextUrl.searchParams.get('condition') ?? 'U') as BricklinkCondition

  try {
    const guide = await getPriceGuide(
      type.toUpperCase() as BricklinkItemType,
      no,
      condition
    )
    return Response.json(guide)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 })
  }
}
