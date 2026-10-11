import OAuth from 'oauth-1.0a'
import crypto from 'crypto'
import { bricklinkCandidates, BricklinkType } from './itemTypes'
import { prisma } from './prisma'

const BASE_URL = 'https://api.bricklink.com/api/store/v1'

function createOAuthClient() {
  return new OAuth({
    consumer: {
      key: process.env.BRICKLINK_CONSUMER_KEY!,
      secret: process.env.BRICKLINK_CONSUMER_SECRET!,
    },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto.createHmac('sha1', key).update(base_string).digest('base64')
    },
  })
}

class BricklinkError extends Error {
  constructor(public status: number | undefined, message: string) {
    super(message)
  }
}

async function bricklinkFetch(path: string): Promise<any> {
  const url = `${BASE_URL}${path}`
  const oauth = createOAuthClient()
  const token = {
    key: process.env.BRICKLINK_TOKEN!,
    secret: process.env.BRICKLINK_TOKEN_SECRET!,
  }

  const requestData = { url, method: 'GET' }
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token))

  const res = await fetch(url, {
    headers: {
      Authorization: authHeader.Authorization,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new BricklinkError(res.status, `BrickLink API error ${res.status}: ${text}`)
  }

  const json = await res.json()
  if (json.meta?.code !== 200) {
    throw new BricklinkError(json.meta?.code, `BrickLink API: ${json.meta?.message ?? 'Unknown error'}`)
  }

  return json.data
}

/** App item type ('MINIFIG' | 'BIGFIG' | 'SET' | 'ITEM'); mapped to BrickLink's catalog type before each call */
export type BricklinkItemType = string
export type BricklinkCondition = 'N' | 'U'

export interface BricklinkItem {
  no: string
  name: string
  type: string
  category_id: number
  thumbnail_url: string
  image_url: string
  year_released?: number
}

export interface BricklinkPriceGuide {
  item: { no: string; type: string }
  new_or_used: string
  currency_code: string
  min_price: string
  max_price: string
  avg_price: string
  qty_avg_price: string
  unit_quantity: number
  total_quantity: number
  price_detail: Array<{
    quantity: number
    unit_price: string
    seller_country_code: string
    buyer_country_code: string
    date_ordered: string
    qunatity?: number
  }>
}

// Catalogs confirmed for ITEM numbers this server process, so each is probed at most once
const resolvedCatalogs = new Map<string, BricklinkType>()

/**
 * Call an item endpoint (`suffix` is e.g. "/price?..."). ITEM numbers could be in any catalog, so
 * try each likely one until BrickLink stops answering "not found", and remember which one worked.
 */
async function itemFetch(type: BricklinkItemType, no: string, suffix = ''): Promise<any> {
  const key = `${type.toUpperCase()}|${no.toUpperCase()}`
  let resolved: string | null | undefined = resolvedCatalogs.get(key)
  if (!resolved && type.toUpperCase() === 'ITEM') {
    const cached = await prisma.cachedItem.findUnique({
      where: { itemNo_itemType: { itemNo: no, itemType: type.toUpperCase() } },
      select: { bricklinkType: true },
    })
    resolved = cached?.bricklinkType
  }

  const candidates = bricklinkCandidates(type, no, resolved)
  for (const [i, catalog] of candidates.entries()) {
    try {
      const data = await bricklinkFetch(`/items/${catalog}/${encodeURIComponent(no)}${suffix}`)
      if (candidates.length > 1) resolvedCatalogs.set(key, catalog)
      return data
    } catch (err) {
      // Some catalogs answer an unknown number with 400 "Invalid item sequence number" instead of 404
      const notFound =
        err instanceof BricklinkError && (err.status === 404 || (err.status === 400 && /item sequence/i.test(err.message)))
      if (!notFound) throw err
      if (i === candidates.length - 1) {
        throw candidates.length > 1 ? new Error(`${no} isn't in any BrickLink catalog (${candidates.join(', ')})`) : err
      }
    }
  }
}

export async function getItem(type: BricklinkItemType, no: string): Promise<BricklinkItem> {
  return itemFetch(type, no)
}

export async function getPriceGuide(
  type: BricklinkItemType,
  no: string,
  condition: BricklinkCondition
): Promise<BricklinkPriceGuide> {
  return itemFetch(type, no, `/price?guide_type=sold&new_or_used=${condition}&currency_code=USD`)
}

/** Set numbers (e.g. "8014-1") of every set an item appears in */
export async function getSupersetSets(type: BricklinkItemType, no: string): Promise<string[]> {
  const groups = (await itemFetch(type, no, '/supersets')) as { entries: { item: { no: string; type: string } }[] }[]
  return [...new Set(groups.flatMap((g) => g.entries).filter((e) => e.item.type === 'SET').map((e) => e.item.no))]
}
