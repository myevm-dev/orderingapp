import { inventoryItems, type InventoryItem } from "@/lib/inventory-items"
import {
  sortBySavedOrder,
  sortLocations,
  type WalkOrder,
} from "@/lib/walk-order"

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

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

export function formatMcLaneNumber(value: number | string) {
  return String(value).padStart(6, "0")
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
  items: ComputedItem[]
}

export function itemType(item: Pick<InventoryItem, "type">): string {
  return item.type.trim() || NO_TYPE
}

/** Group active items by location in walk order. Items default to sorting by type. */
export function groupByLocation(
  guestCount: number,
  onHand: OnHandMap,
  walkOrder: WalkOrder,
): LocationGroup[] {
  const byLocation = new Map<string, ComputedItem[]>()

  for (const item of activeItems()) {
    const location = item.location.trim() || NO_LOCATION
    byLocation.set(location, [
      ...(byLocation.get(location) ?? []),
      computeItem(item, guestCount, onHand),
    ])
  }

  return sortLocations(Array.from(byLocation.keys()), walkOrder).map((location) => ({
    location,
    items: sortBySavedOrder(
      [...byLocation.get(location)!].sort((a, b) =>
        itemType(a).localeCompare(itemType(b)),
      ),
      walkOrder.items[location],
      (item) => item.name,
    ),
  }))
}

/** Split a location's items into runs of the same type, keeping their walk order. */
export function groupByTypeRuns(items: ComputedItem[]): TypeGroup[] {
  const runs: TypeGroup[] = []

  for (const item of items) {
    const type = itemType(item)
    const current = runs[runs.length - 1]

    if (current?.type === type) current.items.push(item)
    else runs.push({ type, items: [item] })
  }

  return runs
}
