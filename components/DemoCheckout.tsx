"use client";

import type { ComponentPropsWithRef, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { PlanPicker } from "@/components/PlanPicker";
import { button, card, textLink } from "@/components/styles";
import type { PlanId } from "@/lib/pricing";
import { PLANS, PLAN_NAME, formatPrice } from "@/lib/pricing";
import { updateProgress } from "@/lib/storage";

interface Props {
  planId: PlanId;
  onPlanChange: (planId: PlanId) => void;
  headingProps: ComponentPropsWithRef<"h1">;
  /** Plus is on and the parent is ready to go back to the worksheet. */
  onDone: () => void;
  onBack: () => void;
}

/** Saved as the session id, so a demo upgrade is never mistaken for a Stripe payment. */
export const DEMO_SESSION_ID = "demo-checkout";

/** How long "Processing…" shows. Nothing is being charged; it only makes the step visible. */
const PROCESSING_MS = 1200;

const TEST_CARD = { number: "4242 4242 4242 4242", expiry: "12/34", cvc: "123" };

const field =
  "mt-1 h-12 w-full rounded-xl border border-line bg-card px-4 text-lg tabular-nums placeholder:text-muted/60";

/**
 * The built-in checkout, used when the server has no Stripe key. It walks the same steps
 * as a real one (plan, order summary, card, pay, confirmation), but no payment is made
 * and the card fields are never sent anywhere.
 */
export function DemoCheckout({ planId, onPlanChange, headingProps, onDone, onBack }: Props) {
  const [cardDetails, setCardDetails] = useState(TEST_CARD);
  const [stage, setStage] = useState<"form" | "paying" | "paid">("form");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paidHeading = useRef<HTMLHeadingElement>(null);
  const plan = PLANS[planId];
  const price = formatPrice(plan.cents);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  useEffect(() => {
    if (stage === "paid") paidHeading.current?.focus({ preventScroll: true });
  }, [stage]);

  const pay = (event: FormEvent) => {
    event.preventDefault();
    setStage("paying");
    timer.current = setTimeout(() => {
      updateProgress((saved) => ({
        ...saved,
        plus: { since: new Date().toISOString(), sessionId: DEMO_SESSION_ID },
      }));
      setStage("paid");
    }, PROCESSING_MS);
  };

  if (stage === "paid") {
    return (
      <>
        <p className="inline-block rounded-full bg-fixed-soft px-3 py-1 text-sm font-semibold text-fixed">
          ✓ Demo payment accepted · no real charge
        </p>
        <h1
          ref={paidHeading}
          tabIndex={-1}
          className="mt-4 text-3xl font-semibold tracking-tight text-balance outline-none sm:text-4xl"
        >
          You&apos;re on {PLAN_NAME}
        </h1>
        <p className="mt-3 text-lg text-muted">
          Unlimited worksheets, practice for every rule, and progress through the school year. Plus is saved
          in this browser.
        </p>
        <button type="button" className={`${button.primary} mt-8`} onClick={onDone}>
          Back to your worksheet
        </button>
      </>
    );
  }

  const paying = stage === "paying";
  const input = (key: keyof typeof TEST_CARD, label: string, autoComplete: string) => (
    <label className="block text-sm font-medium text-muted">
      {label}
      <input
        className={field}
        inputMode="numeric"
        autoComplete={autoComplete}
        required
        disabled={paying}
        value={cardDetails[key]}
        onChange={(event) => setCardDetails({ ...cardDetails, [key]: event.target.value })}
      />
    </label>
  );

  return (
    <>
      <p className="rounded-xl border border-check/30 bg-check-soft px-4 py-3 font-medium text-check" role="note">
        Demo checkout — no real payment. Stripe Checkout is wired in /api/checkout and turns on with a
        STRIPE_SECRET_KEY.
      </p>
      <h1 {...headingProps} className={`${headingProps.className ?? ""} mt-6`}>
        Checkout
      </h1>

      <form onSubmit={pay} className="mt-6 space-y-6">
        <PlanPicker planId={planId} onChange={onPlanChange} />

        <section className={`${card} p-5`} aria-label="Order summary">
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Order summary</h2>
          <dl className="mt-3 space-y-2 tabular-nums">
            <div className="flex justify-between gap-4">
              <dt>
                {PLAN_NAME} · {plan.label}
              </dt>
              <dd>{price}</dd>
            </div>
            <div className="flex justify-between gap-4 text-sm text-muted">
              <dt>Renews every {plan.per}. Cancel anytime.</dt>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-3 text-lg font-semibold">
              <dt>Due today</dt>
              <dd>{price}</dd>
            </div>
          </dl>
        </section>

        <fieldset className={`${card} p-5`}>
          <legend className="sr-only">Card details</legend>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">{input("number", "Card number", "cc-number")}</div>
            {input("expiry", "Expiry (MM/YY)", "cc-exp")}
            {input("cvc", "CVC", "cc-csc")}
          </div>
          <p className="mt-3 text-sm text-muted">
            The test card is filled in for you. Whatever is typed here stays on this page and is not sent
            anywhere.
          </p>
        </fieldset>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <button type="submit" className={button.primary} disabled={paying}>
            {paying ? "Processing…" : `Pay ${price}`}
          </button>
          {!paying && (
            <button type="button" className={textLink} onClick={onBack}>
              Back
            </button>
          )}
          <span className="sr-only" role="status">
            {paying ? "Processing the demo payment" : ""}
          </span>
        </div>
      </form>
    </>
  );
}
