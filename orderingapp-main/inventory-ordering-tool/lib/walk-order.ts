/** The route through the store: location order, plus item order inside each location. */
export interface WalkOrder {
  locations: string[]
  /** Item keys in walk order, by location. Locations left out keep the default order. */
  items: Record<string, string[]>
}

export const DEFAULT_WALK_ORDER: WalkOrder = { locations: [], items: {} }

const DEFAULT_LOCATION_ORDER = [
  "Server Line",
  "Dessert",
  "Soda",
  "Dry Storage",
  "Inside Cooler",
  "Walkin",
  "Freezer",
  "Inside Freezer",
  "Chemicals",
  "Smallwares",
]

function compareDefaultLocations(a: string, b: string) {
  const aIndex = DEFAULT_LOCATION_ORDER.indexOf(a)
  const bIndex = DEFAULT_LOCATION_ORDER.indexOf(b)

  if (aIndex === -1 && bIndex === -1) return a.localeCompare(b)
  if (aIndex === -1) return 1
  if (bIndex === -1) return -1
  return aIndex - bIndex
}

/**
 * Put entries in their saved order. Anything the saved order doesn't know about,
 * like an item added to the guide later, keeps its current order at the end.
 */
export function sortBySavedOrder<T>(
  entries: T[],
  saved: string[] | undefined,
  keyOf: (entry: T) => string,
): T[] {
  if (!saved?.length) return entries

  const rank = new Map(saved.map((key, index) => [key, index]))
  const position = (entry: T) => rank.get(keyOf(entry)) ?? saved.length

  return [...entries].sort((a, b) => position(a) - position(b))
}

export function sortLocations(locations: string[], walkOrder: WalkOrder) {
  return sortBySavedOrder(
    [...locations].sort(compareDefaultLocations),
    walkOrder.locations,
    (location) => location,
  )
}

/** Move one entry so it lands directly above the entry currently at `before`. */
export function moveEntry<T>(list: T[], from: number, before: number): T[] {
  const next = [...list]
  const [entry] = next.splice(from, 1)
  next.splice(from < before ? before - 1 : before, 0, entry)
  return next
}
