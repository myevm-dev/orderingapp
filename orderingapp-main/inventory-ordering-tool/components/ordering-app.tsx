"use client"

import { useEffect, useRef, useState } from "react"
import { ClipboardList, ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { GuestCountStep } from "@/components/guest-count-step"
import { CountingStep } from "@/components/counting-step"
import { SummaryStep, type OrderAdjustmentMap } from "@/components/summary-step"
import { WalkOrderEditor } from "@/components/walk-order-editor"
import {
  clearDraft,
  loadDraft,
  loadScroll,
  loadWalkOrder,
  saveDraft,
  saveScroll,
  saveWalkOrder,
  type Step,
} from "@/lib/order-storage"
import type { OnHandMap } from "@/lib/order-utils"
import { DEFAULT_WALK_ORDER, type WalkOrder } from "@/lib/walk-order"

const STEPS = ["Guests", "Count", "Order"] as const

function formatSavedAt(savedAt: string) {
  return new Date(savedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function OrderingApp() {
  const [restored, setRestored] = useState(false)
  const [step, setStep] = useState<Step>(0)
  const [guestCount, setGuestCount] = useState("")
  const [onHand, setOnHand] = useState<OnHandMap>({})
  const [orderAdjustments, setOrderAdjustments] = useState<OrderAdjustmentMap>({})
  const [openLocations, setOpenLocations] = useState<Record<string, boolean>>({})
  const [walkOrder, setWalkOrder] = useState<WalkOrder>(DEFAULT_WALK_ORDER)
  const [editingWalkOrder, setEditingWalkOrder] = useState(false)
  const [savedAt, setSavedAt] = useState("")
  const [saveFailed, setSaveFailed] = useState(false)
  const skipNextSave = useRef(true)

  const guests = Number.parseInt(guestCount, 10) || 0

  // Saved data only exists in the browser, so it's restored after the first render.
  useEffect(() => {
    const draft = loadDraft()

    if (draft) {
      setStep(draft.step)
      setGuestCount(draft.guestCount)
      setOnHand(draft.onHand)
      setOrderAdjustments(draft.orderAdjustments)
      setOpenLocations(draft.openLocations)
      setSavedAt(draft.savedAt)
    }

    setWalkOrder(loadWalkOrder())
    setRestored(true)
  }, [])

  useEffect(() => {
    if (!restored) return

    // Back where you left off, including how far down the list you were.
    requestAnimationFrame(() => window.scrollTo(0, loadScroll()))

    let timer: ReturnType<typeof setTimeout>
    function handleScroll() {
      clearTimeout(timer)
      timer = setTimeout(() => saveScroll(window.scrollY), 250)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [restored])

  useEffect(() => {
    if (!restored) return

    // The first pass is just the restored data, which is already saved.
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }

    const saved = saveDraft({
      step,
      guestCount,
      onHand,
      orderAdjustments,
      openLocations,
    })

    setSaveFailed(!saved)
    if (saved) setSavedAt(saved)
  }, [restored, step, guestCount, onHand, orderAdjustments, openLocations])

  function goToStep(next: Step) {
    setStep(next)
    window.scrollTo(0, 0)
  }

  function handleOnHandChange(id: number, value: number) {
    setOnHand((prev) => ({ ...prev, [id]: value }))
  }

  function handleAdjustOrder(id: number, amount: number) {
    setOrderAdjustments((prev) => {
      const nextValue = (prev[id] ?? 0) + amount
      if (nextValue === 0) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: nextValue }
    })
  }

  function handleResetOrderAdjustment(id: number) {
    setOrderAdjustments((prev) => {
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function handleWalkOrderChange(next: WalkOrder) {
    setWalkOrder(next)
    setSaveFailed(!saveWalkOrder(next))
  }

  function setEditing(editing: boolean) {
    setEditingWalkOrder(editing)
    window.scrollTo(0, 0)
  }

  function reset() {
    if (
      !window.confirm(
        "Clear this order? This deletes the saved guest count, counts and order changes. Your walk order stays.",
      )
    ) {
      return
    }

    clearDraft()
    skipNextSave.current = true
    setEditingWalkOrder(false)
    setSaveFailed(false)
    setStep(0)
    setGuestCount("")
    setOnHand({})
    setOrderAdjustments({})
    setOpenLocations({})
    setSavedAt("")
    window.scrollTo(0, 0)
  }

  return (
    <main
      className={`mx-auto min-h-screen w-full max-w-2xl px-4 pt-6 sm:pt-10 ${
        step > 0 ? "pb-28" : "pb-16"
      }`}
    >
      <header className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-foreground">Build-to-Par Ordering</h1>
            <p className="text-xs text-muted-foreground">Forecast · Count · Order</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <nav aria-label="Progress" className="mb-6">
        <ol className="flex items-center gap-2">
          {STEPS.map((label, i) => {
            const state = i === step ? "current" : i < step ? "done" : "todo"
            return (
              <li key={label} className="flex flex-1 flex-col gap-1.5">
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    state === "todo" ? "bg-border" : "bg-primary"
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    state === "current"
                      ? "text-foreground"
                      : state === "done"
                        ? "text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  {i + 1}. {label}
                </span>
              </li>
            )
          })}
        </ol>

        {(saveFailed || savedAt) && (
          <div className="mt-3 flex items-center justify-between gap-3">
            {saveFailed ? (
              <p role="alert" className="text-xs font-medium text-destructive">
                Couldn&apos;t save on this device. Keep this page open until the
                order is done.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Saved on this device · {formatSavedAt(savedAt)}
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={reset}
              className="h-11 shrink-0"
            >
              Clear order
            </Button>
          </div>
        )}
      </nav>

      {restored && step === 0 && (
        <GuestCountStep
          guestCount={guestCount}
          onGuestCountChange={setGuestCount}
          onNext={() => goToStep(1)}
        />
      )}

      {step === 1 && editingWalkOrder && (
        <WalkOrderEditor walkOrder={walkOrder} onChange={handleWalkOrderChange} />
      )}

      {step === 1 && !editingWalkOrder && (
        <CountingStep
          guestCount={guests}
          onHand={onHand}
          orderAdjustments={orderAdjustments}
          walkOrder={walkOrder}
          openLocations={openLocations}
          onOpenLocationsChange={setOpenLocations}
          onOnHandChange={handleOnHandChange}
          onAdjustOrder={handleAdjustOrder}
          onEditWalkOrder={() => setEditing(true)}
        />
      )}

      {step === 2 && (
        <SummaryStep
          guestCount={guests}
          onHand={onHand}
          orderAdjustments={orderAdjustments}
          walkOrder={walkOrder}
          onAdjustOrder={handleAdjustOrder}
          onResetOrderAdjustment={handleResetOrderAdjustment}
        />
      )}

      {step > 0 && (
        <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex w-full max-w-2xl gap-3 px-4 py-3">
            {step === 1 && editingWalkOrder && (
              <Button onClick={() => setEditing(false)} size="lg" className="flex-1">
                Done
              </Button>
            )}
            {step === 1 && !editingWalkOrder && (
              <>
                <Button variant="outline" onClick={() => goToStep(0)} size="lg" className="flex-1">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={() => goToStep(2)} size="lg" className="flex-1">
                  Finish
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </>
            )}
            {step === 2 && (
              <>
                <Button variant="outline" onClick={() => goToStep(1)} size="lg" className="flex-1">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back to counts
                </Button>
                <Button variant="secondary" onClick={reset} size="lg" className="flex-1">
                  Start over
                </Button>
              </>
            )}
          </div>
        </footer>
      )}
    </main>
  )
}
