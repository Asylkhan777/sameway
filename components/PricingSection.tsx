import Link from "next/link";
import { button, card } from "@/components/styles";
import { FREE_OWN_WORKSHEETS, PLANS, PLAN_NAME, formatPrice } from "@/lib/pricing";

const tick = (
  <span aria-hidden className="font-semibold text-fixed">
    ✓
  </span>
);

/** The two tiers on the landing page. "Get Plus" opens the same checkout as the paywall. */
export function PricingSection() {
  const { monthly, yearly } = PLANS;
  return (
    <section id="pricing" className="mx-auto w-full max-w-5xl scroll-mt-6 px-4 pt-12 sm:px-6 sm:pt-16">
      <h2 className="text-2xl font-semibold tracking-tight">Pricing</h2>
      <div className="mt-4 grid max-w-3xl gap-4 sm:grid-cols-2">
        <div className={`${card} flex flex-col p-6`}>
          <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">Free</h3>
          <p className="mt-2 text-3xl font-semibold tracking-tight">$0</p>
          <ul className="mt-4 flex-1 space-y-2">
            <li className="flex gap-3">
              {tick}
              {FREE_OWN_WORKSHEETS} of your own worksheets
            </li>
            <li className="flex gap-3">{tick}All sample worksheets</li>
            <li className="flex gap-3">{tick}The full flow: diagnosis, what to say, practice</li>
          </ul>
          <Link href="/check" className={`${button.secondary} mt-6`}>
            Check a worksheet
          </Link>
        </div>
        <div className={`${card} flex flex-col border-ink p-6 ring-1 ring-ink`}>
          <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">{PLAN_NAME}</h3>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
            {formatPrice(monthly.cents)}
            <span className="text-base font-normal text-muted"> / {monthly.per}</span>
          </p>
          <p className="text-muted tabular-nums">
            or {formatPrice(yearly.cents)} / {yearly.per}
          </p>
          <ul className="mt-4 flex-1 space-y-2">
            <li className="flex gap-3">{tick}Unlimited worksheets</li>
            <li className="flex gap-3">{tick}Practice for every rule, until it&apos;s fixed</li>
            <li className="flex gap-3">{tick}Progress through the school year</li>
          </ul>
          <Link href="/upgrade" className={`${button.primary} mt-6`}>
            Get Plus
          </Link>
        </div>
      </div>
    </section>
  );
}
