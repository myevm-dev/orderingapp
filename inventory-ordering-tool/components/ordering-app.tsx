"use client"

import { useState } from "react"
import { ClipboardList, ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { GuestCountStep } from "@/components/guest-count-step"
import { CountingStep } from "@/components/counting-step"
import { SummaryStep } from "@/components/summary-step"
import type { OnHandMap } from "@/lib/order-utils"

type Step = 0 | 1 | 2

const STEPS = ["Guests", "Count", "Order"] as const

export function OrderingApp() {
  const [step, setStep] = useState<Step>(0)
  const [guestCount, setGuestCount] = useState("")
  const [onHand, setOnHand] = useState<OnHandMap>({})

  const guests = Number.parseInt(guestCount, 10) || 0

  function handleOnHandChange(id: number, value: number) {
    setOnHand((prev) => ({ ...prev, [id]: value }))
  }

  function reset() {
    setStep(0)
    setGuestCount("")
    setOnHand({})
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
      </nav>

      {step === 0 && (
        <GuestCountStep
          guestCount={guestCount}
          onGuestCountChange={setGuestCount}
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <CountingStep
          guestCount={guests}
          onHand={onHand}
          onOnHandChange={handleOnHandChange}
        />
      )}

      {step === 2 && <SummaryStep guestCount={guests} onHand={onHand} />}

      {step > 0 && (
        <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex w-full max-w-2xl gap-3 px-4 py-3">
            {step === 1 && (
              <>
                <Button variant="outline" onClick={() => setStep(0)} size="lg" className="flex-1">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={() => setStep(2)} size="lg" className="flex-1">
                  Finish
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </>
            )}
            {step === 2 && (
              <>
                <Button variant="outline" onClick={() => setStep(1)} size="lg" className="flex-1">
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
