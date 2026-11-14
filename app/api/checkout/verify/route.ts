import { stripeClient } from "@/lib/stripe";

/**
 * GET ?session_id=cs_test_… → { ok } — did this Checkout Session complete?
 * Stripe is asked every time: there is no webhook and no database to remember it.
 */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return Response.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const stripe = stripeClient();
  if (!stripe) return Response.json({ ok: false, error: "not-configured" }, { status: 503 });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return Response.json({ ok: session.status === "complete" });
  } catch {
    // An unknown or foreign session id.
    return Response.json({ ok: false, error: "not-found" }, { status: 404 });
  }
}
