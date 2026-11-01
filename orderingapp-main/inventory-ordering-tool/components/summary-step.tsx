"use client"

import { useMemo, useState } from "react"
import {
  CheckCircle2,
  ClipboardList,
  Download,
  Minus,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  activeItems,
  computeItem,
  formatCurrency,
  formatMcLaneNumber,
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

export function SummaryStep({
  guestCount,
  onHand,
  orderAdjustments,
  onAdjustOrder,
  onResetOrderAdjustment,
}: SummaryStepProps) {
  const [showAllItems, setShowAllItems] = useState(false)
  const [search, setSearch] = useState("")
  const [pdfStatus, setPdfStatus] = useState<
    "idle" | "working" | "failed"
  >("idle")

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

          const price = Number(
            item.price ?? 0,
          )

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
            a.location.localeCompare(
              b.location,
            ) ||
            a.type.localeCompare(
              b.type,
            ) ||
            a.name.localeCompare(
              b.name,
            ),
        ),
    [
      guestCount,
      onHand,
      orderAdjustments,
    ],
  )

  const orderItems = allItems.filter(
    (item) =>
      item.finalToOrder > 0,
  )

  const totalUnits =
    orderItems.reduce(
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

  const spendingBreakdown = useMemo(() => {
    return orderItems.reduce(
      (totals, item) => {
        const name =
          item.name.toLowerCase()

        const location =
          item.location
            .trim()
            .toLowerCase()

        /*
         * Classification priority:
         *
         * 1. Packaging
         *    Anything with "paper" in the item name.
         *
         * 2. Operating Expenses
         *    Anything located in Chemicals or Smallwares.
         *
         * 3. Food
         *    Everything else.
         */

        if (name.includes("paper")) {
          totals.packaging +=
            item.lineTotal
        } else if (
          location === "chemicals" ||
          location === "smallwares"
        ) {
          totals.operatingExpenses +=
            item.lineTotal
        } else {
          totals.food +=
            item.lineTotal
        }

        return totals
      },
      {
        food: 0,
        operatingExpenses: 0,
        packaging: 0,
      },
    )
  }, [orderItems])

  const visibleItems = useMemo(() => {
    const base = showAllItems
      ? allItems
      : orderItems

    const query = search
      .trim()
      .toLowerCase()

    if (!query) {
      return base
    }

    return base.filter((item) =>
      [
        item.name,
        item.preferredName,
        String(
          item.vendorItemNumber,
        ),
        formatMcLaneNumber(
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

  async function handleDownloadPdf() {
    setPdfStatus("working")

    try {
      // Loaded on demand so the PDF library isn't part of the initial page.
      const { downloadOrderPdf } = await import(
        "@/lib/order-pdf"
      )

      downloadOrderPdf({
        guestCount,
        lines: orderItems,
        total: estimatedOrderTotal,
      })
      setPdfStatus("idle")
    } catch (error) {
      console.error(error)
      setPdfStatus("failed")
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
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
                cases
              </p>
            </div>
          </div>

          {/* Spending breakdown */}
          <div className="w-full sm:w-[290px]">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  Food
                </span>

                <span className="font-semibold text-card-foreground tabular-nums">
                  {formatCurrency(
                    spendingBreakdown.food,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  Operating Expenses
                </span>

                <span className="font-semibold text-card-foreground tabular-nums">
                  {formatCurrency(
                    spendingBreakdown.operatingExpenses,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  Packaging
                </span>

                <span className="font-semibold text-card-foreground tabular-nums">
                  {formatCurrency(
                    spendingBreakdown.packaging,
                  )}
                </span>
              </div>
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <div className="flex items-end justify-between gap-4">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total Order Cost
                </span>

                <span className="text-2xl font-bold text-primary tabular-nums">
                  {formatCurrency(
                    estimatedOrderTotal,
                  )}
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleDownloadPdf}
              disabled={
                orderItems.length === 0 ||
                pdfStatus === "working"
              }
              className="mt-3 w-full"
            >
              <Download
                className="mr-1 h-4 w-4"
                aria-hidden="true"
              />
              Download order PDF
            </Button>

            {pdfStatus === "failed" && (
              <p
                role="alert"
                className="mt-2 text-xs text-destructive"
              >
                Couldn&apos;t create the PDF. Check
                your connection and try again.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
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
              placeholder="Search item name or McLane number"
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-base text-foreground outline-none ring-ring/40 transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 sm:text-sm"
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
            className="w-full sm:w-auto sm:shrink-0"
          >
            {showAllItems
              ? `Show order only (${orderItems.length})`
              : `Show all items (${allItems.length})`}
          </Button>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Use + or - to change the
          final order quantity.
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
              ? "Try another item name or McLane number."
              : "You have enough on hand to cover the calculated par. You can still show all items and add one manually."}
          </p>
        </div>
      ) : (
        <>
          {/* MOBILE */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:hidden">
            <div className="border-b border-border bg-muted/50 px-4 py-2">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Item</span>
                <span>Order</span>
              </div>
            </div>

            <div>
              {visibleItems.map(
                (item) => (
                  <div
                    key={item.id}
                    className="border-b border-border p-4 last:border-b-0"
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-normal break-words text-base font-semibold leading-snug text-card-foreground">
                          {item.preferredName ||
                            item.name}
                        </p>

                        <p className="mt-1 font-mono text-sm font-semibold tracking-wide text-muted-foreground tabular-nums">
                          {formatMcLaneNumber(
                            item.vendorItemNumber,
                          )}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <div className="flex items-center overflow-hidden rounded-lg border border-border bg-background">
                          <button
                            type="button"
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
                            className="flex h-11 w-10 items-center justify-center text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label={`Decrease ${item.name} order`}
                          >
                            <Minus
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </button>

                          <span className="flex h-11 min-w-11 items-center justify-center bg-primary/10 px-2 text-center text-lg font-bold text-primary tabular-nums">
                            {
                              item.finalToOrder
                            }
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              onAdjustOrder(
                                item.id,
                                1,
                              )
                            }
                            className="flex h-11 w-10 items-center justify-center text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            aria-label={`Increase ${item.name} order`}
                          >
                            <Plus
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        {item.adjustment !==
                          0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
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
                      </div>

                      {item.price > 0 && (
                        <div className="text-right">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Total
                          </p>

                          <p className="font-semibold text-card-foreground tabular-nums">
                            {formatCurrency(
                              item.lineTotal,
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>

            <div className="border-t-2 border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Cases
                  </p>

                  <p className="font-semibold text-card-foreground tabular-nums">
                    {totalUnits.toLocaleString()}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Estimated Total
                  </p>

                  <p className="text-xl font-bold text-primary tabular-nums">
                    {formatCurrency(
                      estimatedOrderTotal,
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* DESKTOP */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold"
                  >
                    McLane #
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
                      <td className="px-4 py-3 align-top font-mono font-semibold text-muted-foreground tabular-nums">
                        {formatMcLaneNumber(
                          item.vendorItemNumber,
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <p className="whitespace-normal break-words font-medium leading-snug text-card-foreground">
                          {item.preferredName ||
                            item.name}
                        </p>

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
                            ? `Calculated ${item.toOrder} · Par ${item.par.toFixed(
                                2,
                              )}`
                            : "Manual order item"}
                        </p>
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
                    colSpan={2}
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
        </>
      )}
    </div>
  )
}