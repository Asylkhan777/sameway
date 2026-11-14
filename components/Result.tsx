import { ProblemList } from "@/components/ProblemList";
import { Screen } from "@/components/Screen";
import { button, textLink } from "@/components/styles";
import { VerdictCard } from "@/components/VerdictCard";
import type { SheetReport } from "@/lib/engine";
import type { Finding, Solved } from "@/lib/report";
import { summarize } from "@/lib/report";

interface Props {
  report: SheetReport;
  /** What the sheet shows, including what a check problem has settled so far. */
  finding: Finding;
  /** The last check answer, if it settled nothing. */
  missed: Solved | null;
  /** "Not checked: 1 left blank", or null. */
  skippedNote: string | null;
  /** How many practice problems there are for the rule; 0 hides the button. */
  practiceSize: number;
  headingProps: React.ComponentProps<"h1">;
  onCheck: (answer: number) => void;
  onPractice: () => void;
  onEdit: () => void;
  onRestart: () => void;
}

/** The result screen: the summary line, the verdict card and every problem one by one. */
export function Result(props: Props) {
  const { report, finding, missed, skippedNote, practiceSize, headingProps } = props;
  return (
    <Screen size="narrow">
      <p className="text-sm font-semibold tracking-wide text-muted uppercase">Result</p>
      <h1 {...headingProps}>{summarize(report, finding)}</h1>
      {skippedNote && <p className="mt-2 text-sm text-muted">{skippedNote}</p>}

      <div className="mt-8">
        <VerdictCard
          finding={finding}
          wrong={report.wrong}
          missed={missed}
          onCheck={props.onCheck}
          onPractice={practiceSize > 0 ? props.onPractice : undefined}
          practiceSize={practiceSize}
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold">Problem by problem</h2>
      {report.wrong > 0 && <p className="mt-1 text-sm text-muted">Open a wrong answer to see what happened.</p>}
      <div className="mt-3">
        <ProblemList report={report} />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
        <button type="button" className={button.secondary} onClick={props.onEdit}>
          Edit answers
        </button>
        <button type="button" className={textLink} onClick={props.onRestart}>
          Check another worksheet
        </button>
      </div>
    </Screen>
  );
}
