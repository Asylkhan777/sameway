import { PLANS, PLAN_NAME, isPlanId } from "@/lib/pricing";
import { stripeClient, stripeConfigured } from "@/lib/stripe";

const fail = (status: number, error: string, message: string) => Response.json({ error, message }, { status });

/** GET → whether a real checkout is available, so the paywall knows which button to show. */
export async function GET() {
  return Response.json({ configured: stripeConfigured() });
}

/**
 * POST { plan: "monthly" | "yearly" } → { url } of a Stripe Checkout page (test mode).
 * The price is built inline from lib/pricing.ts, so nothing is set up in the Stripe dashboard.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "bad-request", "Send JSON: { plan }.");
  }
  const planId = (body as { plan?: unknown } | null)?.plan;
  if (!isPlanId(planId)) return fail(400, "bad-request", 'plan must be "monthly" or "yearly".');

  const stripe = stripeClient();
  if (!stripe) return fail(503, "not-configured", "Checkout isn't set up on this server.");

  const plan = PLANS[planId];
  const site = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: plan.cents,
            recurring: { interval: plan.interval },
            product_data: { name: `${PLAN_NAME} — ${plan.label}` },
          },
        },
      ],
      success_url: `${site}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/check`,
    });
    if (!session.url) throw new Error("Stripe returned no checkout URL");
    return Response.json({ url: session.url });
  } catch (error) {
    console.error("checkout failed:", error instanceof Error ? error.message : error);
    return fail(502, "checkout-failed", "Couldn't start the checkout. Please try again.");
  }
}
