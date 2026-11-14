import Link from "next/link";
import { textLink } from "@/components/styles";
import { FREE_OWN_WORKSHEETS, PLAN_NAME } from "@/lib/pricing";
import type { Progress } from "@/lib/storage";

/** One line at the foot of the progress page: how much of the free tier is used. */
export function PlanNote({ progress }: { progress: Progress }) {
  if (progress.plus) {
    return <p className="mt-10 rounded-xl bg-fixed-soft px-4 py-3 text-fixed">✓ You&apos;re on {PLAN_NAME}</p>;
  }
  const used = Math.min(progress.ownWorksheetsUsed, FREE_OWN_WORKSHEETS);
  return (
    <p className="mt-10 rounded-xl border border-line bg-card px-4 py-3 tabular-nums">
      Free: {used} of {FREE_OWN_WORKSHEETS} worksheets used ·{" "}
      <Link href="/upgrade" className={textLink}>
        Get Plus
      </Link>
    </p>
  );
}
