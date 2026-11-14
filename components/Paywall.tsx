"use client";

import type { ComponentPropsWithRef } from "react";
import { useEffect, useState } from "react";
import { button, card, textLink } from "@/components/styles";
import type { PlanId } from "@/lib/pricing";
import { BENEFITS, PLANS, PLAN_NAME, formatPrice } from "@/lib/pricing";
import { updateProgress } from "@/lib/storage";

interface Props {
  headingProps: ComponentPropsWithRef<"h1">;
  /** Plus was switched on without leaving the page (the simulated upgrade). */
  onUnlocked: () => void;
  onBack: () => void;
}

/**
 * Shown when a second own worksheet is started without Plus. The button opens a Stripe
 * Checkout page in test mode; on a server without a Stripe key it offers a clearly
 * labeled simulated upgrade instead, so the flow never dead-ends.
 */
export function Paywall({ headingProps, onUnlocked, onBack }: Props) {
  const [planId, setPlanId] = useState<PlanId>("yearly");
  /** Is a real checkout available? null until the server has answered. */
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/checkout")
      .then((response) => response.json())
      .then((data: { configured?: boolean }) => live && setConfigured(data.configured === true))
      .catch(() => live && setConfigured(false));
    return () => {
      live = false;
    };
  }, []);

  const checkout = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !data.url) throw new Error(data.message);
      window.location.assign(data.url);
    } catch (problem) {
      setError((problem instanceof Error && problem.message) || "Couldn't start the checkout. Please try again.");
      setBusy(false);
    }
  };

  const simulate = () => {
    updateProgress((saved) => ({
      ...saved,
      plus: { since: new Date().toISOString(), sessionId: "simulated" },
    }));
    onUnlocked();
  };

  return (
    <>
      <h1 {...headingProps}>Keep going with {PLAN_NAME}</h1>
      <p className="mt-3 text-lg text-muted">
        Your first worksheet was free. Plus covers every homework night after it. The sample worksheets
        and your progress page stay free.
      </p>

      <fieldset className="mt-8 grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Choose a plan</legend>
        {Object.values(PLANS).map((plan) => {
          const chosen = plan.id === planId;
          return (
            <label
              key={plan.id}
              className={`${card} cursor-pointer p-5 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ink ${
                chosen ? "border-ink ring-1 ring-ink" : "hover:border-ink/40"
              }`}
            >
              <input
                type="radio"
                name="plan"
                value={plan.id}
                checked={chosen}
                onChange={() => setPlanId(plan.id)}
                className="sr-only"
              />
              <span className="flex items-center justify-between gap-2 text-sm font-medium text-muted">
                {plan.label}
                {chosen && <span className="text-ink">✓ Selected</span>}
              </span>
              <span className="mt-1 block text-3xl font-semibold tracking-tight tabular-nums">
                {formatPrice(plan.cents)}
                <span className="text-base font-normal text-muted"> / {plan.per}</span>
              </span>
              <span className="mt-1 block text-sm text-muted">{plan.note}</span>
            </label>
          );
        })}
      </fieldset>

      <ul className="mt-6 space-y-2">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex gap-3">
            <span aria-hidden className="font-semibold text-fixed">
              ✓
            </span>
            {benefit}
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
        {configured === false ? (
          <button type="button" className={button.primary} onClick={simulate}>
            Simulate upgrade (demo)
          </button>
        ) : (
          <button type="button" className={button.primary} disabled={configured === null || busy} onClick={checkout}>
            {busy ? "Opening checkout…" : "Continue to checkout"}
          </button>
        )}
        <button type="button" className={textLink} onClick={onBack}>
          Not now
        </button>
      </div>
      {error && (
        <p className="mt-4 text-accent" role="alert">
          {error}
        </p>
      )}

      {/* Which note applies is known once the server has answered. */}
      {configured === false ? (
        <p className="mt-6 rounded-xl bg-check-soft px-4 py-3 text-sm text-check">
          Demo mode — no payment provider is connected on this server, so the button above switches Plus
          on without a payment.
        </p>
      ) : configured === null ? null : (
        <p className="mt-6 rounded-xl bg-check-soft px-4 py-3 text-sm text-check">
          <strong>Test mode</strong> — no real money moves. Pay with card{" "}
          <span className="font-semibold whitespace-nowrap tabular-nums">4242 4242 4242 4242</span>, any future
          date, any CVC, any ZIP.
        </p>
      )}
    </>
  );
}
