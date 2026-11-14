import { CheckIcon } from "@/components/icons";
import { button, card } from "@/components/styles";
import type { RuleRecord, RuleStatus } from "@/lib/storage";

const STATUS: Record<RuleStatus, { label: string; step: number; pill: string; bar: string }> = {
  found: { label: "Found", step: 1, pill: "bg-accent-soft text-accent", bar: "bg-accent" },
  practicing: { label: "Practicing", step: 2, pill: "bg-check-soft text-check", bar: "bg-check" },
  fixed: { label: "Fixed", step: 3, pill: "bg-fixed-soft text-fixed", bar: "bg-fixed" },
};

const STEPS = ["Found", "Practicing", "Fixed"];

const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
export const formatDay = (iso: string): string => DAY.format(new Date(iso));

interface Props {
  rule: RuleRecord;
  /** Later worksheets that could have tripped a fixed rule and didn't. */
  rechecked: number;
  /** Starts a practice round; left out when the rule's worksheet can't be found. */
  onPractice?: () => void;
}

/** One rule and where it stands: found → practicing → fixed. */
export function RuleCard({ rule, rechecked, onPractice }: Props) {
  const status = STATUS[rule.status];
  const last = rule.practice[rule.practice.length - 1];
  return (
    <li className={`${card} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <h3 className="text-xl font-semibold tracking-tight text-balance">{rule.title}</h3>
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${status.pill}`}>
          {rule.status === "fixed" && <CheckIcon className="size-4" />}
          {status.label}
        </span>
      </div>

      {/* The same status as a track. The pill above says it in words. */}
      <ol aria-hidden className="mt-4 grid grid-cols-3 gap-1.5 text-xs text-muted">
        {STEPS.map((label, index) => (
          <li key={label}>
            <span className={`block h-1.5 rounded-full ${index < status.step ? status.bar : "bg-line"}`} />
            <span className={`mt-1 block ${index === status.step - 1 ? "font-semibold text-ink" : ""}`}>{label}</span>
          </li>
        ))}
      </ol>

      {rule.cameBack && <p className="mt-4 font-medium text-accent">It came back — one more round.</p>}
      {rechecked > 0 && (
        <p className="mt-4 font-medium text-fixed">
          Re-checked on {rechecked} later {rechecked === 1 ? "worksheet" : "worksheets"}: still fixed.
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
        <Fact label="First seen" value={formatDay(rule.firstSeen)} />
        <Fact label="Last seen" value={formatDay(rule.lastSeen)} />
        <Fact label="Worksheets" value={String(rule.seenOn)} />
        <Fact
          label="Last practice"
          value={
            last
              ? `${last.results.filter(Boolean).length} of ${last.results.length} right · ${formatDay(last.at)}`
              : "Not yet"
          }
        />
      </dl>

      {onPractice && (
        <button
          type="button"
          className={`${rule.status === "fixed" ? button.secondary : button.primary} mt-5 w-full sm:w-auto`}
          onClick={onPractice}
        >
          {rule.practice.length === 0 ? "Practice the fix" : "Practice again"}
        </button>
      )}
    </li>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  );
}
