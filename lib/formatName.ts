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
// Part words after the color are dropped ("Dark Bluish Gray Body" -> "Dark Bluish Gray"), except
// "Head": head color is often what tells variants apart (e.g. SW0188 Black Head vs SW0188A Light Nougat Head)
const LEADING_COLOR = new RegExp(`^(${COLOR})(\\s+Head\\b)?\\b`, 'i')

function extractColor(variant: string): string | null {
  const shared = variant.match(SHARED_COLOR)
  if (shared) return shared[1]
  const lead = variant.match(LEADING_COLOR)
  return lead ? lead[1] + (lead[2] ? ' Head' : '') : null
}

export function formatItemName(raw: string): string {
  const name = decodeEntities(raw)
    .replace(/\(Phase\s+(\d+)\)/gi, '(P$1)')
    .trim()

  // The variant is the first top-level " - " or ", " section (ignoring anything inside parentheses)
  // that starts with a color, e.g. "Snowtrooper, Light Bluish Gray Hips, White Hands" -> "Light Bluish Gray".
  // Sections that aren't colors, like "187th Legion" in "Clone Trooper Commander, 187th Legion - Nougat Head",
  // stay part of the base name.
  const topLevel = name.replace(/\([^)]*\)/g, (m) => '\0'.repeat(m.length))
  let sep = -1
  let color: string | null = null
  for (const m of topLevel.matchAll(/ - |, /g)) {
    color = extractColor(name.slice(m.index + m[0].length))
    if (color) {
      sep = m.index
      break
    }
  }
  if (!color) return name // no color section (e.g. "Luke Skywalker, Tatooine") — keep it as-is

  // Drop alias parentheticals like "(GNK Power Droid)", but keep phase tags like "(P2)"
  const base = name
    .slice(0, sep)
    .replace(/\s*\(([^)]*)\)/g, (m, inner: string) => (/^P\d+$/.test(inner) ? m : ''))
    .trim()
  return `${base} (${color})`
}

/** The name to show for a collection row: the user's custom name, else the formatted BrickLink name, else the ID */
export function displayName(item: { itemNo: string; name?: string | null }, meta?: { name: string } | null): string {
  return item.name || (meta?.name ? formatItemName(meta.name) : item.itemNo)
}

// Link/image helpers moved to itemTypes (they depend on the item type); re-exported for existing imports
export { bricklinkUrl, largeImageUrl } from './itemTypes'
