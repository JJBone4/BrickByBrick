import { refreshPrices } from '@/lib/refresh'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await refreshPrices()
  return Response.json(result)
}

export async function POST() {
  const result = await refreshPrices()
  return Response.json(result)
}
