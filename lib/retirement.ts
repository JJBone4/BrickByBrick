import { prisma } from './prisma'
import { getSupersetSets, getItem } from './bricklink'

// Retired/Active status: an item is Active if any set it came in is still on sale, Retired once
// every one of those sets has retired. Set membership comes from BrickLink; retirement dates come
// from Brickset (https://brickset.com/tools/webservices/requestkey), which needs BRICKSET_API_KEY.

const RECHECK_AFTER = 7 * 24 * 60 * 60 * 1000 // retirement changes rarely; recheck weekly
const BRICKSET_URL = 'https://brickset.com/api/v3.asmx/getSets'

interface BricksetSet {
  number: string
  numberVariant: number
  year?: number
  released?: boolean
  availability?: string
  exitDate?: string
  LEGOCom?: Record<string, { dateLastAvailable?: string } | undefined>
}

/** true = retired, false = still on sale, null = can't tell */
function setRetired(s: BricksetSet, now: number): boolean | null {
  if (s.released === false) return false // announced but not out yet
  if (s.exitDate) return new Date(s.exitDate).getTime() < now
  const lastDates = Object.values(s.LEGOCom ?? {})
    .map((r) => r?.dateLastAvailable)
    .filter((d): d is string => !!d)
    .map((d) => new Date(d).getTime())
  if (lastDates.length) return Math.max(...lastDates) < now
  if (/retired/i.test(s.availability ?? '')) return true
  // No dates at all: sets this old are long gone from shelves
  if (s.year && s.year <= new Date(now).getFullYear() - 3) return true
  return null
}

async function fetchBricksetSets(setNumbers: string[], apiKey: string): Promise<Map<string, BricksetSet>> {
  const result = new Map<string, BricksetSet>()
  // getSets accepts a comma-separated list. Send it as a POST body: with ~200 sets a GET URL gets
  // too long and Brickset answers 404 with an empty body. Each call counts toward the daily limit.
  for (let i = 0; i < setNumbers.length; i += 400) {
    const batch = setNumbers.slice(i, i + 400)
    const res = await fetch(BRICKSET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        apiKey,
        userHash: '',
        params: JSON.stringify({ setNumber: batch.join(','), pageSize: 500, extendedData: 0 }),
      }),
      cache: 'no-store',
    })
    const text = await res.text()
    let json: { status?: string; message?: string; sets?: BricksetSet[] }
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error(`Brickset: HTTP ${res.status} with ${text ? 'non-JSON' : 'empty'} response`)
    }
    if (json.status !== 'success') throw new Error(`Brickset: ${json.message ?? res.status}`)
    for (const s of json.sets ?? []) result.set(`${s.number}-${s.numberVariant}`.toUpperCase(), s)
  }
  return result
}

/**
 * Update retirement status for items not checked in the last week. Quietly does nothing without
 * a Brickset key. Returns errors instead of throwing so it never breaks a price refresh.
 */
export async function updateRetirement(items: { itemNo: string; itemType: string }[]): Promise<string[]> {
  const apiKey = process.env.BRICKSET_API_KEY
  if (!apiKey || items.length === 0) return []

  const errors: string[] = []
  const cutoff = new Date(Date.now() - RECHECK_AFTER)
  const due = await prisma.cachedItem.findMany({
    where: {
      OR: items.map(({ itemNo, itemType }) => ({ itemNo, itemType })),
      AND: [{ OR: [{ retiredCheckedAt: null }, { retiredCheckedAt: { lt: cutoff } }] }],
    },
    select: { itemNo: true, itemType: true },
  })
  if (due.length === 0) return []

  // Which sets each item appeared in (BrickLink)
  const setsByItem = new Map<string, string[]>()
  for (const item of due) {
    try {
      setsByItem.set(`${item.itemNo}|${item.itemType}`, await getSupersetSets(item.itemType, item.itemNo))
    } catch (err) {
      errors.push(`${item.itemNo}: ${err}`)
    }
  }

  // Retirement dates for all of those sets in as few Brickset calls as possible
  // BrickLink lists Advent Calendar days as their own sets ("75418-4" = day 4) but Brickset only has
  // the calendar itself ("75418-1"), so also request each set's "-1" parent to fall back on
  const parentSet = (n: string) => n.replace(/-\d+$/, '-1')
  const allSets = [
    ...new Set([...setsByItem.values()].flat().flatMap((n) => [n.toUpperCase(), parentSet(n.toUpperCase())])),
  ]
  let bricksetSets: Map<string, BricksetSet>
  try {
    bricksetSets = await fetchBricksetSets(allSets, apiKey)
  } catch (err) {
    return [...errors, String(err)]
  }

  const now = Date.now()
  for (const [key, sets] of setsByItem) {
    const [itemNo, itemType] = key.split('|')
    const statuses = sets.map((n) => {
      const s = bricksetSets.get(n.toUpperCase()) ?? bricksetSets.get(parentSet(n.toUpperCase()))
      return s ? setRetired(s, now) : null
    })
    let retired = statuses.includes(false) ? false : statuses.includes(true) ? true : null

    // Not in any set (promos, DVDs, books): judge by the figure's own release year
    if (retired === null && sets.length === 0) {
      try {
        const { year_released } = await getItem(itemType, itemNo)
        if (year_released && year_released <= new Date(now).getFullYear() - 3) retired = true
      } catch {
        // leave unknown
      }
    }

    await prisma.cachedItem.update({
      where: { itemNo_itemType: { itemNo, itemType } },
      data: { retired, retiredCheckedAt: new Date() },
    })
  }
  return errors
}
