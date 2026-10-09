import OAuth from 'oauth-1.0a'
import crypto from 'crypto'
import { toBricklinkType } from './itemTypes'

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
    throw new Error(`BrickLink API error ${res.status}: ${text}`)
  }

  const json = await res.json()
  if (json.meta?.code !== 200) {
    throw new Error(`BrickLink API: ${json.meta?.message ?? 'Unknown error'}`)
  }

  return json.data
}

/** App item type ('MINIFIG' | 'BIGFIG' | 'SET'); mapped to BrickLink's catalog type before each call */
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

export async function getItem(type: BricklinkItemType, no: string): Promise<BricklinkItem> {
  return bricklinkFetch(`/items/${toBricklinkType(type, no)}/${encodeURIComponent(no)}`)
}

export async function getPriceGuide(
  type: BricklinkItemType,
  no: string,
  condition: BricklinkCondition
): Promise<BricklinkPriceGuide> {
  return bricklinkFetch(
    `/items/${toBricklinkType(type, no)}/${encodeURIComponent(no)}/price?guide_type=sold&new_or_used=${condition}&currency_code=USD`
  )
}

/** Set numbers (e.g. "8014-1") of every set an item appears in */
export async function getSupersetSets(type: BricklinkItemType, no: string): Promise<string[]> {
  const groups = (await bricklinkFetch(
    `/items/${toBricklinkType(type, no)}/${encodeURIComponent(no)}/supersets`
  )) as { entries: { item: { no: string; type: string } }[] }[]
  return [...new Set(groups.flatMap((g) => g.entries).filter((e) => e.item.type === 'SET').map((e) => e.item.no))]
}
