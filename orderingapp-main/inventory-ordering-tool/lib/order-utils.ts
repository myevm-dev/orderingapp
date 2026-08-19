import { inventoryItems, type InventoryItem } from "@/lib/inventory-items"

/** On-hand counts keyed by the stable item id (array index), since vendorItemNumber is not unique. */
export type OnHandMap = Record<number, number>

export interface IndexedItem extends InventoryItem {
  /** Stable unique id = position in the source inventory array. */
  id: number
}

export interface ComputedItem extends IndexedItem {
  par: number
  onHand: number
  toOrder: number
}

const NO_LOCATION = "Unassigned Location"
const NO_TYPE = "Other"

/** Keep forecasted par quantities precise to the nearest hundredth of a case. */
export function roundToHundredth(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function computePar(usagePerGuest: number, guestCount: number): number {
  return roundToHundredth(usagePerGuest * guestCount)
}

/** All real rows (must have a name), each tagged with a stable id. Blank location/type kept via fallback labels. */
export function activeItems(): IndexedItem[] {
  return inventoryItems
    .map((item, id) => ({ ...item, id }))
    .filter((i) => i.name.trim() !== "")
}

export function computeItem(item: IndexedItem, guestCount: number, onHand: OnHandMap): ComputedItem {
  const par = computePar(item.usagePerGuest, guestCount)
  const have = onHand[item.id] ?? 0
  const shortage = roundToHundredth(par - have)
  return {
    ...item,
    par,
    onHand: have,
    // Vendor orders are whole cases, so round only the remaining shortage up.
    toOrder: Math.max(0, Math.ceil(shortage)),
  }
}

export interface TypeGroup {
  type: string
  items: ComputedItem[]
}

export interface LocationGroup {
  location: string
  types: TypeGroup[]
}

/** Group active items by location, then by sub-category type. */
export function groupByLocation(guestCount: number, onHand: OnHandMap): LocationGroup[] {
  const locMap = new Map<string, Map<string, ComputedItem[]>>()

  for (const item of activeItems()) {
    const computed = computeItem(item, guestCount, onHand)
    const location = item.location.trim() || NO_LOCATION
    const type = item.type.trim() || NO_TYPE
    if (!locMap.has(location)) locMap.set(location, new Map())
    const typeMap = locMap.get(location)!
    if (!typeMap.has(type)) typeMap.set(type, [])
    typeMap.get(type)!.push(computed)
  }

  return Array.from(locMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([location, typeMap]) => ({
      location,
      types: Array.from(typeMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([type, items]) => ({ type, items })),
    }))
}
