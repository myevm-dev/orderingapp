import { activeItems, type OnHandMap } from "@/lib/order-utils"
import { DEFAULT_WALK_ORDER, type WalkOrder } from "@/lib/walk-order"

const DRAFT_KEY = "orderingapp:draft:v1"
const WALK_ORDER_KEY = "orderingapp:walk-order:v1"
const SCROLL_KEY = "orderingapp:scroll:v1"

export type Step = 0 | 1 | 2

export interface OrderDraft {
  step: Step
  guestCount: string
  onHand: OnHandMap
  orderAdjustments: Record<number, number>
  openLocations: Record<string, boolean>
}

interface StoredDraft extends Omit<OrderDraft, "onHand" | "orderAdjustments"> {
  savedAt: string
  // Keyed by item name, because the in-app ids are positions in the guide and
  // shift whenever the guide changes.
  onHand: Record<string, number>
  orderAdjustments: Record<string, number>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function byName(values: Record<number, number>) {
  const named: Record<string, number> = {}

  for (const item of activeItems()) {
    if (item.id in values) named[item.name] = values[item.id]
  }

  return named
}

function byId(values: unknown) {
  const mapped: Record<number, number> = {}
  if (!isRecord(values)) return mapped

  for (const item of activeItems()) {
    const value = values[item.name]
    if (typeof value === "number" && Number.isFinite(value)) {
      mapped[item.id] = value
    }
  }

  return mapped
}

function read(key: string): unknown {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function loadDraft(): (OrderDraft & { savedAt: string }) | null {
  const stored = read(DRAFT_KEY)
  if (!isRecord(stored)) return null

  const { step, guestCount, onHand, orderAdjustments, openLocations, savedAt } =
    stored

  return {
    step: step === 1 || step === 2 ? step : 0,
    guestCount: typeof guestCount === "string" ? guestCount : "",
    onHand: byId(onHand),
    orderAdjustments: byId(orderAdjustments),
    openLocations: isRecord(openLocations)
      ? (openLocations as Record<string, boolean>)
      : {},
    savedAt: typeof savedAt === "string" ? savedAt : "",
  }
}

/** Returns the save time, or null if the browser refused to store it. */
export function saveDraft(draft: OrderDraft): string | null {
  const savedAt = new Date().toISOString()
  const stored: StoredDraft = {
    ...draft,
    savedAt,
    onHand: byName(draft.onHand),
    orderAdjustments: byName(draft.orderAdjustments),
  }

  return write(DRAFT_KEY, stored) ? savedAt : null
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
    localStorage.removeItem(SCROLL_KEY)
  } catch {
    // Nothing stored or storage is blocked: either way there's nothing to clear.
  }
}

export function loadScroll() {
  const stored = read(SCROLL_KEY)
  return typeof stored === "number" ? stored : 0
}

export function saveScroll(position: number) {
  write(SCROLL_KEY, position)
}

export function loadWalkOrder(): WalkOrder {
  const stored = read(WALK_ORDER_KEY)
  if (
    !isRecord(stored) ||
    !Array.isArray(stored.locations) ||
    !isRecord(stored.items)
  ) {
    return DEFAULT_WALK_ORDER
  }

  return stored as unknown as WalkOrder
}

export function saveWalkOrder(walkOrder: WalkOrder) {
  return write(WALK_ORDER_KEY, walkOrder)
}
