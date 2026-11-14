"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Screen } from "@/components/Screen";
import { button, textLink } from "@/components/styles";
import { PLAN_NAME } from "@/lib/pricing";
import { updateProgress } from "@/lib/storage";

type State = "checking" | "paid" | "unpaid";

/** Where Stripe Checkout returns to: confirm the payment with the server, then switch Plus on. */
export function UpgradeSuccess() {
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    let live = true;
    const sessionId = new URLSearchParams(window.location.search).get("session_id") ?? "";
    fetch(`/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`)
      .then((response) => response.json())
      .then((data: { ok?: boolean }) => {
        if (!live) return;
        if (data.ok !== true) return setState("unpaid");
        // Keep the first date if this page is reloaded.
        updateProgress((saved) => ({
          ...saved,
          plus: saved.plus?.sessionId === sessionId ? saved.plus : { since: new Date().toISOString(), sessionId },
        }));
        setState("paid");
      })
      .catch(() => live && setState("unpaid"));
    return () => {
      live = false;
    };
  }, []);

  const heading = "text-3xl font-semibold tracking-tight text-balance sm:text-4xl";

  if (state === "checking") {
    return (
      <Screen size="narrow">
        <h1 className={heading}>Confirming your payment…</h1>
        <p className="mt-3 text-lg text-muted" role="status">
          This takes a second.
        </p>
      </Screen>
    );
  }

  if (state === "unpaid") {
    return (
      <Screen size="narrow">
        <h1 className={heading}>We couldn&apos;t confirm that payment</h1>
        <p className="mt-3 text-lg text-muted">
          Nothing was unlocked. If you closed the checkout early, you can start it again from your next
          worksheet.
        </p>
        <Link href="/check" className={`${button.primary} mt-8`}>
          Back to worksheets
        </Link>
      </Screen>
    );
  }

  return (
    <Screen size="narrow">
      <p className="inline-block rounded-full bg-fixed-soft px-3 py-1 text-sm font-semibold text-fixed">
        ✓ Payment confirmed · test mode
      </p>
      <h1 className={`${heading} mt-4`}>You&apos;re on {PLAN_NAME}</h1>
      <p className="mt-3 text-lg text-muted">
        Unlimited worksheets, practice for every rule, and progress through the school year. Plus is saved
        in this browser.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
        <Link href="/check" className={button.primary}>
          Check the next worksheet
        </Link>
        <Link href="/progress" className={textLink}>
          See progress
        </Link>
      </div>
    </Screen>
  );
}
