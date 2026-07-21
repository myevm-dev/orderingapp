"use client"

import { useMemo } from "react"
import { ClipboardList, CheckCircle2 } from "lucide-react"
import { activeItems, computeItem, type OnHandMap } from "@/lib/order-utils"

interface SummaryStepProps {
  guestCount: number
  onHand: OnHandMap
}

export function SummaryStep({ guestCount, onHand }: SummaryStepProps) {
  const orderList = useMemo(
    () =>
      activeItems()
        .map((i) => computeItem(i, guestCount, onHand))
        .filter((i) => i.toOrder > 0)
        .sort((a, b) => a.location.localeCompare(b.location) || a.type.localeCompare(b.type)),
    [guestCount, onHand],
  )

  const totalUnits = orderList.reduce((sum, i) => sum + i.toOrder, 0)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <ClipboardList className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Order list</h2>
            <p className="text-sm text-muted-foreground">
              {guestCount.toLocaleString()} guests · {orderList.length} items ·{" "}
              {totalUnits.toLocaleString()} units to order
            </p>
          </div>
        </div>
      </div>

      {orderList.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center shadow-sm">
          <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden="true" />
          <p className="font-medium text-card-foreground">Nothing to order</p>
          <p className="text-sm text-muted-foreground">
            You have enough on hand to cover par for every item.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Item #
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Item
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Order
                </th>
              </tr>
            </thead>
            <tbody>
              {orderList.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 align-top font-mono text-muted-foreground tabular-nums">
                    {item.vendorItemNumber}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-card-foreground">{item.preferredName || item.name}</p>
                    {item.preferredName && item.name !== item.preferredName && (
                      <p className="text-xs text-muted-foreground">{item.name}</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[item.location.trim() || "Unassigned Location", item.type.trim() || "Other"].join(" · ")}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <span className="inline-block min-w-9 rounded-lg bg-primary/15 px-2 py-1 text-base font-bold text-primary tabular-nums">
                      {item.toOrder}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
