import { NextRequest } from 'next/server'
import { refreshPrices, needsRefresh } from '@/lib/refresh'

export const dynamic = 'force-dynamic'

// Page loads call this without ?force, so prices are fetched at most every 6 hours.
// The "Refresh Prices" button passes ?force=1. The Vercel cron runs daily, so it's always due.
async function handle(req: NextRequest) {
  const force = req.nextUrl.searchParams.get('force') === '1'
  if (!force && !(await needsRefresh())) {
    return Response.json({ refreshed: 0, errors: [], skipped: true })
  }
  return Response.json(await refreshPrices())
}

export const GET = handle
export const POST = handle
