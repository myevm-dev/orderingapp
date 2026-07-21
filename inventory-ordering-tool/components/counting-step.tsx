"use client"

import { useMemo, useState } from "react"
import { MapPin, Package, ChevronDown } from "lucide-react"
import { groupByLocation, type OnHandMap } from "@/lib/order-utils"

interface CountingStepProps {
  guestCount: number
  onHand: OnHandMap
  onOnHandChange: (vendorItemNumber: number, value: number) => void
}

export function CountingStep({
  guestCount,
  onHand,
  onOnHandChange,
}: CountingStepProps) {
  const groups = useMemo(() => groupByLocation(guestCount, onHand), [guestCount, onHand])
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g, i) => [g.location, i === 0])),
  )

  function toggle(location: string) {
    setOpen((prev) => ({ ...prev, [location]: !prev[location] }))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-accent/60 p-4">
        <p className="text-sm leading-relaxed text-accent-foreground text-pretty">
          Walk each location and enter on-hand cases to the nearest hundredth. The order rounds the
          remaining <span className="font-semibold">par minus on hand</span> up to a whole case.
        </p>
      </div>

      {groups.map((group) => (
        <section key={group.location} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <button
            type="button"
            onClick={() => toggle(group.location)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-muted/50"
            aria-expanded={open[group.location]}
          >
            <span className="flex items-center gap-2 font-semibold text-card-foreground">
              <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
              {group.location}
            </span>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
                open[group.location] ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </button>

          {open[group.location] && (
            <div className="border-t border-border">
              {group.types.map((typeGroup) => (
                <div key={typeGroup.type} className="border-b border-border last:border-b-0">
                  <div className="flex items-center gap-2 bg-muted/40 px-4 py-2">
                    <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {typeGroup.type}
                    </h3>
                  </div>

                  <ul>
                    {typeGroup.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-card-foreground">
                            {item.preferredName || item.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            #{item.vendorItemNumber} · Par {item.par.toFixed(2)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center">
                            <label
                              htmlFor={`onhand-${item.id}`}
                              className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                            >
                              On hand
                            </label>
                            <input
                              id={`onhand-${item.id}`}
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="0.01"
                              value={onHand[item.id] ?? ""}
                              onChange={(e) => {
                                const v = Number.parseFloat(e.target.value)
                                const rounded = Math.round((v + Number.EPSILON) * 100) / 100
                                onOnHandChange(item.id, Number.isFinite(rounded) && rounded > 0 ? rounded : 0)
                              }}
                              placeholder="0"
                              className="w-16 rounded-lg border border-input bg-background px-2 py-1.5 text-center text-base font-semibold text-foreground tabular-nums outline-none ring-ring/40 transition focus:border-ring focus:ring-2"
                            />
                          </div>

                          <div className="flex w-16 flex-col items-center">
                            <span className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Order
                            </span>
                            <span
                              className={`w-full rounded-lg py-1.5 text-center text-base font-bold tabular-nums ${
                                item.toOrder > 0
                                  ? "bg-primary/15 text-primary"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {item.toOrder}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
