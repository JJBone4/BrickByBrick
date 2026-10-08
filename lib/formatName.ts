// BrickLink names look like "Gonk Droid &#40;GNK Power Droid&#41;, Dark Bluish Gray Body and ..."
// We display them as "Gonk Droid (Dark Bluish Gray)": base name plus the primary color.

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' }

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isNaN(n) ? m : String.fromCodePoint(n)
    }
    return ENTITIES[code.toLowerCase()] ?? m
  })
}

const MODIFIERS = 'Trans-Neon|Trans-Dark|Trans-Light|Trans-Medium|Trans|Pearl|Metallic|Chrome|Satin|Glitter|Flat|Speckle|Very Light|Very Dark|Dark|Light|Medium|Bright|Reddish|Sand|Olive|Bluish|Earth|Fabuland|Neon|Warm|Cool'
const BASES = 'Bluish Gray|Gray|Grey|Black|White|Red|Blue|Green|Yellow|Orange|Brown|Tan|Nougat|Pink|Purple|Violet|Lime|Azure|Turquoise|Aqua|Clear|Silver|Gold|Copper|Bronze|Flesh|Lavender|Magenta|Coral|Salmon|Maroon|Ochre|Beige|Rust'
const COLOR = `(?:(?:${MODIFIERS})[- ])*(?:${BASES})`

// "Light and Dark Gray" -> "Gray" (two shades sharing one color word)
const SHARED_COLOR = new RegExp(`^(?:${MODIFIERS})\\s+and\\s+(?:(?:${MODIFIERS})[- ])*(${BASES})\\b`, 'i')
const LEADING_COLOR = new RegExp(`^(${COLOR})\\b`, 'i')

function extractColor(variant: string): string | null {
  const shared = variant.match(SHARED_COLOR)
  if (shared) return shared[1]
  const lead = variant.match(LEADING_COLOR)
  return lead ? lead[1] : null
}

export function formatItemName(raw: string): string {
  const name = decodeEntities(raw)
    .replace(/\(Phase\s+(\d+)\)/gi, '(P$1)')
    .trim()

  // Variant text follows the last top-level " - " or ", " (ignoring anything inside parentheses)
  const topLevel = name.replace(/\([^)]*\)/g, (m) => '\0'.repeat(m.length))
  let sep = topLevel.lastIndexOf(' - ')
  let sepLen = 3
  if (sep === -1) {
    sep = topLevel.lastIndexOf(', ')
    sepLen = 2
  }
  if (sep === -1) return name

  const color = extractColor(name.slice(sep + sepLen))
  if (!color) return name // variant isn't a color (e.g. "Luke Skywalker, Tatooine") — keep it as-is

  // Drop alias parentheticals like "(GNK Power Droid)", but keep phase tags like "(P2)"
  const base = name
    .slice(0, sep)
    .replace(/\s*\(([^)]*)\)/g, (m, inner: string) => (/^P\d+$/.test(inner) ? m : ''))
    .trim()
  return `${base} (${color})`
}

const CATALOG_TYPE: Record<string, string> = { MINIFIG: 'M', SET: 'S' }

export function bricklinkUrl(itemType: string, itemNo: string): string {
  const t = CATALOG_TYPE[itemType.toUpperCase()] ?? 'M'
  return `https://www.bricklink.com/v2/catalog/catalogitem.page?${t}=${encodeURIComponent(itemNo)}`
}
