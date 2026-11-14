import { card } from "@/components/styles";
import type { PlanId } from "@/lib/pricing";
import { PLANS, formatPrice } from "@/lib/pricing";

/** The two plans as a pair of radio cards. */
export function PlanPicker({ planId, onChange }: { planId: PlanId; onChange: (planId: PlanId) => void }) {
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
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
              onChange={() => onChange(plan.id)}
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
  );
}
