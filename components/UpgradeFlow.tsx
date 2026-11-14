"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Paywall } from "@/components/Paywall";
import { Screen } from "@/components/Screen";
import { button } from "@/components/styles";
import { PLAN_NAME } from "@/lib/pricing";
import { useProgress } from "@/lib/storage";

const headingProps = { className: "text-3xl font-semibold tracking-tight text-balance outline-none sm:text-4xl" };

/** Plus chosen from the header or the pricing section: the same plans and checkout as the paywall. */
export function UpgradeFlow() {
  const router = useRouter();
  const progress = useProgress();
  // Decided on arrival only: paying here shows the checkout's own confirmation instead.
  const [arrivedWithPlus, setArrivedWithPlus] = useState<boolean | null>(null);
  if (progress && arrivedWithPlus === null) setArrivedWithPlus(progress.plus !== null);

  if (arrivedWithPlus) {
    return (
      <Screen size="narrow">
        <p className="inline-block rounded-full bg-fixed-soft px-3 py-1 text-sm font-semibold text-fixed">
          ✓ Active
        </p>
        <h1 className={`${headingProps.className} mt-4`}>You&apos;re on {PLAN_NAME}</h1>
        <p className="mt-3 text-lg text-muted">Unlimited worksheets, saved in this browser.</p>
        <Link href="/check" className={`${button.primary} mt-8`}>
          Check a worksheet
        </Link>
      </Screen>
    );
  }

  return (
    <Screen size="narrow">
      <Paywall
        atLimit={false}
        headingProps={headingProps}
        onUnlocked={() => router.push("/check")}
        onBack={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      />
    </Screen>
  );
}
