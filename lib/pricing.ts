import type { Progress } from "@/lib/storage";

/** Everything about what SameWay costs lives here: the UI and the checkout both read it. */

export const PLAN_NAME = "SameWay Plus";

/** Own (non-sample) worksheets that get the full flow before Plus is needed. */
export const FREE_OWN_WORKSHEETS = 1;

export type PlanId = "monthly" | "yearly";

export interface Plan {
  id: PlanId;
  label: string;
  /** Price in US cents, as Stripe wants it. */
  cents: number;
  /** Stripe billing interval. */
  interval: "month" | "year";
  /** What follows the price: "$9.99 / month". */
  per: string;
  note: string;
}

export const PLANS: Record<PlanId, Plan> = {
  monthly: {
    id: "monthly",
    label: "Monthly",
    cents: 999,
    interval: "month",
    per: "month",
    note: "Cancel anytime.",
  },
  yearly: {
    id: "yearly",
    label: "School year",
    cents: 5900,
    interval: "year",
    per: "school year",
    note: "About half the monthly price.",
  },
};

export const BENEFITS = [
  "Unlimited worksheets, every homework night",
  "Practice for every rule we find, until it's fixed",
  "Progress through the school year: fixed rules are re-checked on later worksheets",
];

export const isPlanId = (value: unknown): value is PlanId => value === "monthly" || value === "yearly";

/** "$9.99" or "$59". */
export const formatPrice = (cents: number): string =>
  `$${cents % 100 === 0 ? cents / 100 : (cents / 100).toFixed(2)}`;

/** True when starting another own worksheet needs Plus. Samples and the demo never do. */
export const needsPlus = (progress: Pick<Progress, "plus" | "ownWorksheetsUsed">): boolean =>
  progress.plus === null && progress.ownWorksheetsUsed >= FREE_OWN_WORKSHEETS;
