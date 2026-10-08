// BrickLink minifig IDs start with a theme prefix, e.g. "SW0073A" -> "SW" -> Star Wars.
const THEME_PREFIXES: Record<string, string> = {
  ADV: 'Adventurers',
  AGT: 'Agents',
  ATL: 'Atlantis',
  AVT: 'Avatar',
  CAS: 'Castle',
  CTY: 'City',
  COL: 'Collectible Minifigures',
  DIS: 'Disney',
  DP: 'Dino',
  FRND: 'Friends',
  HOB: 'The Hobbit',
  HP: 'Harry Potter',
  IAJ: 'Indiana Jones',
  IDEA: 'Ideas',
  JW: 'Jurassic World',
  LOR: 'The Lord of the Rings',
  MIN: 'Minecraft',
  MK: 'Monkie Kid',
  NJO: 'Ninjago',
  PI: 'Pirates',
  POC: 'Pirates of the Caribbean',
  SH: 'Super Heroes',
  SIM: 'The Simpsons',
  SP: 'Space',
  SW: 'Star Wars',
  TLM: 'The LEGO Movie',
  TNT: 'Teenage Mutant Ninja Turtles',
  TOY: 'Toy Story',
  TWN: 'Town',
}

export function getTheme(itemNo: string, itemType: string): string {
  const letters = itemNo.match(/^[A-Za-z]+/)?.[0]?.toUpperCase()
  if (!letters) return itemType.toUpperCase() === 'SET' ? 'Sets' : 'Other'

  // Try the longest known prefix first, e.g. "COLSH" -> "COL"
  for (let len = letters.length; len > 0; len--) {
    const theme = THEME_PREFIXES[letters.slice(0, len)]
    if (theme) return theme
  }
  return letters // unknown prefix: show the raw code rather than hiding it
}
