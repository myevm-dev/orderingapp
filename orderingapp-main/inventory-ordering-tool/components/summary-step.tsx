"use client"

import { useMemo, useState } from "react"
import {
  CheckCircle2,
  ClipboardList,
  Minus,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  activeItems,
  computeItem,
  type OnHandMap,
} from "@/lib/order-utils"

export type OrderAdjustmentMap = Record<number, number>

interface SummaryStepProps {
  guestCount: number
  onHand: OnHandMap
  orderAdjustments: OrderAdjustmentMap
  onAdjustOrder: (id: number, amount: number) => void
  onResetOrderAdjustment: (id: number) => void
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

export function SummaryStep({
  guestCount,
  onHand,
  orderAdjustments,
  onAdjustOrder,
  onResetOrderAdjustment,
}: SummaryStepProps) {
  const [showAllItems, setShowAllItems] = useState(false)
  const [search, setSearch] = useState("")

  const allItems = useMemo(
    () =>
      activeItems()
        .map((item) => {
          const computed = computeItem(
            item,
            guestCount,
            onHand,
          )

          const adjustment =
            orderAdjustments[item.id] ?? 0

          const finalToOrder = Math.max(
            0,
            computed.toOrder + adjustment,
          )

          const price = Number(item.price ?? 0)

          const lineTotal =
            finalToOrder * price

          return {
            ...computed,
            adjustment,
            finalToOrder,
            price,
            lineTotal,
          }
        })
        .sort(
          (a, b) =>
            a.location.localeCompare(b.location) ||
            a.type.localeCompare(b.type) ||
            a.name.localeCompare(b.name),
        ),
    [
      guestCount,
      onHand,
      orderAdjustments,
    ],
  )

  const orderItems = allItems.filter(
    (item) => item.finalToOrder > 0,
  )

  const totalUnits = orderItems.reduce(
    (sum, item) =>
      sum + item.finalToOrder,
    0,
  )

  const estimatedOrderTotal =
    orderItems.reduce(
      (sum, item) =>
        sum + item.lineTotal,
      0,
    )

  const visibleItems = useMemo(() => {
    const base = showAllItems
      ? allItems
      : orderItems

    const query = search
      .trim()
      .toLowerCase()

    if (!query) return base

    return base.filter((item) =>
      [
        item.name,
        item.preferredName,
        String(
          item.vendorItemNumber,
        ),
        item.casePack,
        item.location,
        item.type,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    )
  }, [
    allItems,
    orderItems,
    search,
    showAllItems,
  ])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <ClipboardList
                className="h-6 w-6"
                aria-hidden="true"
              />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-card-foreground">
                Order list
              </h2>

              <p className="text-sm text-muted-foreground">
                {guestCount.toLocaleString()}{" "}
                guests ·{" "}
                {orderItems.length} items ·{" "}
                {totalUnits.toLocaleString()}{" "}
                cases to order
              </p>
            </div>
          </div>

          <div className="sm:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Estimated Order Total
            </p>

            <p className="text-2xl font-bold text-primary tabular-nums">
              {formatCurrency(
                estimatedOrderTotal,
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">
              Search order items
            </span>

            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search item name or item number"
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none ring-ring/40 transition focus:border-ring focus:ring-2"
            />
          </label>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setShowAllItems(
                (value) => !value,
              )
            }
            className="sm:shrink-0"
          >
            {showAllItems
              ? `Show order only (${orderItems.length})`
              : `Show all items (${allItems.length})`}
          </Button>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Use + or - to change the
          final order quantity. Show
          all items to manually add
          something with a calculated
          order of 0.
        </p>
      </div>

      {visibleItems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center shadow-sm">
          <CheckCircle2
            className="h-10 w-10 text-primary"
            aria-hidden="true"
          />

          <p className="font-medium text-card-foreground">
            {search
              ? "No matching items"
              : "Nothing to order"}
          </p>

          <p className="text-sm text-muted-foreground">
            {search
              ? "Try another item name or item number."
              : "You have enough on hand to cover the calculated par. You can still show all items and add one manually."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <th
                    scope="col"
                    className="hidden px-4 py-3 font-semibold sm:table-cell"
                  >
                    Item #
                  </th>

                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold"
                  >
                    Item
                  </th>

                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold"
                  >
                    Case Price
                  </th>

                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold"
                  >
                    Order
                  </th>

                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold"
                  >
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {visibleItems.map(
                  (item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="hidden px-4 py-3 align-top font-mono text-muted-foreground tabular-nums sm:table-cell">
                        {
                          item.vendorItemNumber
                        }
                      </td>

                      <td className="px-4 py-3 align-top">
                        <p className="whitespace-normal break-words font-medium leading-snug text-card-foreground">
                          {item.preferredName ||
                            item.name}
                        </p>

                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground sm:hidden">
                          #
                          {
                            item.vendorItemNumber
                          }
                        </p>

                        {item.preferredName &&
                          item.name !==
                            item.preferredName && (
                            <p className="mt-0.5 whitespace-normal break-words text-xs text-muted-foreground">
                              {item.name}
                            </p>
                          )}

                        <p className="mt-1 whitespace-normal break-words text-xs text-muted-foreground">
                          {[
                            item.casePack,
                            item.location.trim() ||
                              "Unassigned Location",
                            item.type.trim() ||
                              "Other",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.usagePerGuest >
                          0
                            ? `Calculated ${item.toOrder} · Par ${item.par.toFixed(2)}`
                            : "No usage-per-guest model · Manual order available"}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-right align-top font-medium tabular-nums">
                        {item.price > 0
                          ? formatCurrency(
                              item.price,
                            )
                          : "—"}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="flex justify-end">
                          <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                onAdjustOrder(
                                  item.id,
                                  -1,
                                )
                              }
                              disabled={
                                item.finalToOrder <=
                                0
                              }
                              aria-label={`Decrease ${item.name} order`}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>

                            <span className="min-w-10 px-1 text-center text-base font-bold text-primary tabular-nums">
                              {
                                item.finalToOrder
                              }
                            </span>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                onAdjustOrder(
                                  item.id,
                                  1,
                                )
                              }
                              aria-label={`Increase ${item.name} order`}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {item.adjustment !==
                          0 && (
                          <div className="mt-1 flex items-center justify-end gap-1 text-xs text-muted-foreground">
                            <span>
                              {item.adjustment >
                              0
                                ? "+"
                                : ""}
                              {
                                item.adjustment
                              }{" "}
                              manual
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                onResetOrderAdjustment(
                                  item.id,
                                )
                              }
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md transition hover:bg-muted hover:text-foreground"
                              aria-label={`Reset ${item.name} to calculated order`}
                              title="Reset to calculated order"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right align-top">
                        <span className="font-semibold text-card-foreground tabular-nums">
                          {item.price > 0
                            ? formatCurrency(
                                item.lineTotal,
                              )
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-border bg-muted/40">
                  <td
                    colSpan={3}
                    className="px-4 py-4 text-right text-sm font-semibold text-card-foreground"
                  >
                    Estimated Order Total
                  </td>

                  <td className="px-4 py-4 text-right font-semibold tabular-nums">
                    {totalUnits.toLocaleString()}{" "}
                    cases
                  </td>

                  <td className="px-4 py-4 text-right text-lg font-bold text-primary tabular-nums">
                    {formatCurrency(
                      estimatedOrderTotal,
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}