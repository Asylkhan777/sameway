"use client";

import type { ComponentPropsWithRef } from "react";
import { useEffect, useState } from "react";
import { DemoCheckout } from "@/components/DemoCheckout";
import { PlanPicker } from "@/components/PlanPicker";
import { button, textLink } from "@/components/styles";
import type { PlanId } from "@/lib/pricing";
import { BENEFITS, FREE_OWN_WORKSHEETS, PLAN_NAME } from "@/lib/pricing";

interface Props {
  headingProps: ComponentPropsWithRef<"h1">;
  /** Plus was switched on without leaving the page (the built-in demo checkout). */
  onUnlocked: () => void;
  onBack: () => void;
  /** The free worksheets ran out (the paywall), rather than Plus chosen from the pricing links. */
  atLimit?: boolean;
}

/**
 * Shown when another own worksheet is started after the free ones, without Plus.
 * With a Stripe key on the server, the button opens Stripe Checkout in test mode.
 * Without one, it opens the built-in demo checkout, so the flow never dead-ends.
 */
export function Paywall({ headingProps, onUnlocked, onBack, atLimit = true }: Props) {
  const [planId, setPlanId] = useState<PlanId>("yearly");
  /** Is Stripe Checkout available? null until the server has answered. */
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [inCheckout, setInCheckout] = useState(false);
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

  const stripeCheckout = async () => {
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

  if (inCheckout) {
    return (
      <DemoCheckout
        planId={planId}
        onPlanChange={setPlanId}
        headingProps={headingProps}
        onDone={onUnlocked}
        backLabel={atLimit ? "Back to your worksheet" : "Check a worksheet"}
        onBack={() => setInCheckout(false)}
      />
    );
  }

  return (
    <>
      <h1 {...headingProps}>{atLimit ? `Keep going with ${PLAN_NAME}` : `Get ${PLAN_NAME}`}</h1>
      <p className="mt-3 text-lg text-muted">
        {atLimit
          ? `Your ${FREE_OWN_WORKSHEETS} free worksheets are used. Plus covers every homework night after them.`
          : `Your first ${FREE_OWN_WORKSHEETS} worksheets are free. Plus covers every homework night after them.`}{" "}
        The sample worksheets and your progress page stay free.
      </p>

      <div className="mt-8">
        <PlanPicker planId={planId} onChange={setPlanId} />
      </div>

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
        <button
          type="button"
          className={button.primary}
          disabled={configured === null || busy}
          onClick={configured ? stripeCheckout : () => setInCheckout(true)}
        >
          {busy ? "Opening checkout…" : "Continue to checkout"}
        </button>
        <button type="button" className={textLink} onClick={onBack}>
          Not now
        </button>
      </div>
      {error && (
        <p className="mt-4 text-accent" role="alert">
          {error}
        </p>
      )}

      {configured && (
        <p className="mt-6 rounded-xl bg-check-soft px-4 py-3 text-sm text-check">
          <strong>Test mode</strong> — no real money moves. Pay with card{" "}
          <span className="font-semibold whitespace-nowrap tabular-nums">4242 4242 4242 4242</span>, any future
          date, any CVC, any ZIP.
        </p>
      )}
    </>
  );
}
