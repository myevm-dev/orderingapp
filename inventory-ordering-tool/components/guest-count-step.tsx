"use client"

import { Users, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { activeItems } from "@/lib/order-utils"

interface GuestCountStepProps {
  guestCount: string
  onGuestCountChange: (value: string) => void
  onNext: () => void
}

export function GuestCountStep({ guestCount, onGuestCountChange, onNext }: GuestCountStepProps) {
  const count = Number.parseInt(guestCount, 10)
  const valid = Number.isFinite(count) && count > 0
  const itemCount = activeItems().length

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229 && valid) {
      onNext()
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Users className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-card-foreground text-balance">
          How many guests are forecasted?
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
          Enter your forecasted guest count. We&apos;ll multiply it by each item&apos;s usage per guest
          to calculate a build-to-par number for all {itemCount} tracked items.
        </p>
      </div>

      <div className="mx-auto mt-6 max-w-xs">
        <label htmlFor="guest-count" className="mb-2 block text-sm font-medium text-card-foreground">
          Forecasted guest count
        </label>
        <input
          id="guest-count"
          type="number"
          inputMode="numeric"
          min={1}
          value={guestCount}
          onChange={(e) => onGuestCountChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. 250"
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-center text-2xl font-semibold text-foreground tabular-nums outline-none ring-ring/40 transition focus:border-ring focus:ring-2"
          autoFocus
        />
      </div>

      <Button onClick={onNext} disabled={!valid} className="mt-6 w-full" size="lg">
        Calculate build-to-par
        <ArrowRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  )
}
