"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, MapPin, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { groupByLocation, itemType } from "@/lib/order-utils"
import { moveEntry, type WalkOrder } from "@/lib/walk-order"

interface WalkOrderEditorProps {
  walkOrder: WalkOrder
  onChange: (walkOrder: WalkOrder) => void
}

const ROW_BUTTON =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"

export function WalkOrderEditor({ walkOrder, onChange }: WalkOrderEditorProps) {
  const [location, setLocation] = useState<string | null>(null)
  const [moving, setMoving] = useState<string | null>(null)

  const groups = useMemo(() => groupByLocation(0, {}, walkOrder), [walkOrder])
  const locationNames = groups.map((group) => group.location)
  const items = groups.find((group) => group.location === location)?.items ?? []
  const itemNames = items.map((item) => item.name)
  const movingItem = items.find((item) => item.name === moving)

  function moveLocation(index: number, before: number) {
    onChange({
      ...walkOrder,
      locations: moveEntry(locationNames, index, before),
    })
  }

  function moveItem(index: number, before: number) {
    if (!location) return

    onChange({
      ...walkOrder,
      items: {
        ...walkOrder.items,
        [location]: moveEntry(itemNames, index, before),
      },
    })
  }

  function placeMovingItem(before: number) {
    moveItem(itemNames.indexOf(moving ?? ""), before)
    setMoving(null)
  }

  function resetLocations() {
    if (window.confirm("Put locations back in the default order?")) {
      onChange({ ...walkOrder, locations: [] })
    }
  }

  function resetItems() {
    if (!location) return

    if (window.confirm(`Put ${location} items back in the default order?`)) {
      const { [location]: _removed, ...rest } = walkOrder.items
      onChange({ ...walkOrder, items: rest })
      setMoving(null)
    }
  }

  if (!location) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-accent/60 p-4">
          <h2 className="font-semibold text-accent-foreground">Walk order</h2>
          <p className="mt-1 text-sm leading-relaxed text-accent-foreground text-pretty">
            Put locations in the order you walk them. Open a location to order
            its items.
          </p>
        </div>

        <ol className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {groups.map((group, index) => (
            <li
              key={group.location}
              className="flex items-center gap-2 border-b border-border p-2 last:border-b-0"
            >
              <button
                type="button"
                onClick={() => setLocation(group.location)}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left transition hover:bg-muted/50"
              >
                <MapPin
                  className="h-5 w-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-snug text-card-foreground">
                    {group.location}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {group.items.length} items
                  </span>
                </span>
                <ChevronRight
                  className="h-5 w-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </button>

              <button
                type="button"
                onClick={() => moveLocation(index, index - 1)}
                disabled={index === 0}
                className={ROW_BUTTON}
                aria-label={`Move ${group.location} up`}
              >
                <ArrowUp className="h-5 w-5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => moveLocation(index, index + 2)}
                disabled={index === groups.length - 1}
                className={ROW_BUTTON}
                aria-label={`Move ${group.location} down`}
              >
                <ArrowDown className="h-5 w-5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>

        <Button
          type="button"
          variant="ghost"
          onClick={resetLocations}
          disabled={walkOrder.locations.length === 0}
          className="w-full"
        >
          Reset location order
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-accent/60 p-4">
        <button
          type="button"
          onClick={() => {
            setLocation(null)
            setMoving(null)
          }}
          className="-ml-1 flex min-h-11 items-center gap-1 text-sm font-medium text-accent-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          All locations
        </button>

        <h2 className="font-semibold text-accent-foreground">{location}</h2>
        <p className="mt-1 text-sm leading-relaxed text-accent-foreground text-pretty">
          Use the arrows for small moves. For a long move, tap Move, scroll, then
          tap Put here on the item it should go above.
        </p>
      </div>

      {movingItem && (
        <div className="sticky top-2 z-10 flex items-center gap-2 rounded-xl border border-primary bg-card p-3 shadow-md">
          <p className="min-w-0 flex-1 text-sm font-medium text-card-foreground">
            Moving {movingItem.preferredName || movingItem.name}
          </p>

          <Button
            type="button"
            variant="outline"
            onClick={() => setMoving(null)}
          >
            <X className="mr-1 h-4 w-4" aria-hidden="true" />
            Cancel
          </Button>
        </div>
      )}

      <ol className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {items.map((item, index) => {
          const isMoving = item.name === moving

          return (
            <li
              key={item.id}
              className={`flex items-center gap-2 border-b border-border p-2 last:border-b-0 ${
                isMoving ? "bg-primary/10" : ""
              }`}
            >
              <span className="w-7 shrink-0 text-center text-xs font-semibold text-muted-foreground tabular-nums">
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="whitespace-normal break-words text-sm font-medium leading-snug text-card-foreground">
                  {item.preferredName || item.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {itemType(item)}
                </p>
              </div>

              {moving ? (
                !isMoving && (
                  <Button
                    type="button"
                    onClick={() => placeMovingItem(index)}
                    className="h-11 shrink-0"
                    aria-label={`Put above ${item.name}`}
                  >
                    Put here
                  </Button>
                )
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMoving(item.name)}
                    className="h-11 shrink-0"
                    aria-label={`Move ${item.name}`}
                  >
                    Move
                  </Button>

                  <button
                    type="button"
                    onClick={() => moveItem(index, index - 1)}
                    disabled={index === 0}
                    className={ROW_BUTTON}
                    aria-label={`Move ${item.name} up`}
                  >
                    <ArrowUp className="h-5 w-5" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => moveItem(index, index + 2)}
                    disabled={index === items.length - 1}
                    className={ROW_BUTTON}
                    aria-label={`Move ${item.name} down`}
                  >
                    <ArrowDown className="h-5 w-5" aria-hidden="true" />
                  </button>
                </>
              )}
            </li>
          )
        })}
      </ol>

      {moving ? (
        <Button
          type="button"
          onClick={() => placeMovingItem(items.length)}
          className="h-11 w-full"
        >
          Put at the end
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          onClick={resetItems}
          disabled={!walkOrder.items[location]}
          className="w-full"
        >
          Reset {location} order
        </Button>
      )}
    </div>
  )
}
