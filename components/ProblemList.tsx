import { CheckIcon, ChevronIcon, CrossIcon } from "@/components/icons";
import { KidAnswer } from "@/components/KidAnswer";
import { card } from "@/components/styles";
import type { SheetReport } from "@/lib/engine";
import { show, toMessage } from "@/lib/engine";

type ReportItem = SheetReport["items"][number];

/** Every checked problem: right or wrong, the correct answer, and a note for each wrong one. */
export function ProblemList({ report }: { report: SheetReport }) {
  return (
    <ol className={`${card} divide-y divide-line overflow-hidden`}>
      {report.items.map((entry, index) => (
        <li key={index}>
          {entry.diagnosis.kind === "correct" ? (
            <div className="flex min-h-14 items-center gap-3 px-4 py-2 sm:px-5">
              <Line entry={entry} />
            </div>
          ) : (
            <WrongProblem entry={entry} />
          )}
        </li>
      ))}
    </ol>
  );
}

function Line({ entry }: { entry: ReportItem }) {
  const { item, diagnosis } = entry;
  const correct = diagnosis.kind === "correct";
  return (
    <>
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
          correct ? "bg-fixed-soft text-fixed" : "bg-accent-soft text-accent"
        }`}
      >
        {correct ? <CheckIcon className="size-4" /> : <CrossIcon className="size-4" />}
        <span className="sr-only">{correct ? "Correct" : "Wrong"}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span className="text-lg tabular-nums">
          {show(item.problem)} = <KidAnswer value={item.answer} className={correct ? "" : "text-accent"} />
        </span>
        {"correct" in diagnosis && !correct && (
          <span className="text-sm whitespace-nowrap text-muted">should be {diagnosis.correct}</span>
        )}
      </span>
    </>
  );
}

function WrongProblem({ entry }: { entry: ReportItem }) {
  const message = toMessage(entry.item.problem, entry.diagnosis);
  return (
    <details className="group">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2 hover:bg-paper sm:px-5 [&::-webkit-details-marker]:hidden">
        <Line entry={entry} />
        <ChevronIcon className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-2 px-4 pt-1 pb-4 leading-7 sm:pr-5 sm:pl-15">
        <p className="font-semibold">{message.headline}</p>
        <p>{message.body}</p>
        {message.say && (
          <p className="text-muted">
            <span className="font-medium text-ink">Say:</span> {message.say}
          </p>
        )}
      </div>
    </details>
  );
}
