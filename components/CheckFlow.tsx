"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ProblemList } from "@/components/ProblemList";
import { ProblemTable } from "@/components/ProblemTable";
import { button, textLink } from "@/components/styles";
import { TypedInput } from "@/components/TypedInput";
import { VerdictCard } from "@/components/VerdictCard";
import type { SheetItem } from "@/lib/engine";
import { SYMBOL, diagnoseSheet } from "@/lib/engine";
import type { Entry } from "@/lib/parse";
import { interpret, summarize } from "@/lib/report";
import type { DraftRow } from "@/lib/worksheet";
import { readRow, readyItems, toDraftRow } from "@/lib/worksheet";

type Step = "input" | "confirm" | "result";

/** Rows back to typed lines, so "Edit as text" keeps what was changed in the table. */
const toText = (rows: DraftRow[]): string =>
  rows
    .filter((row) => row.a !== "" || row.b !== "")
    .map((row) => `${row.a} ${SYMBOL[row.op]} ${row.b} = ${row.answer}`.trimEnd())
    .join("\n");

/** The check flow: type the worksheet → confirm what's on the page → see the diagnosis. */
export function CheckFlow() {
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [checked, setChecked] = useState<SheetItem[]>([]);

  // Move focus to the new step's heading so keyboard and screen-reader users follow along.
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [step]);

  const headingProps = {
    ref: heading,
    tabIndex: -1,
    className: "text-3xl font-semibold tracking-tight text-balance outline-none sm:text-4xl",
  };

  if (step === "input") {
    return (
      <Screen>
        <h1 {...headingProps}>Type in the worksheet</h1>
        <p className="mt-3 text-lg text-muted">
          Write each problem with the answer your kid gave. We&apos;ll find the rule behind the wrong ones.
        </p>
        <div className="mt-8">
          <TypedInput
            text={text}
            onTextChange={setText}
            onContinue={(entries: Entry[]) => {
              setRows(entries.map(toDraftRow));
              setStep("confirm");
            }}
          />
        </div>
      </Screen>
    );
  }

  if (step === "confirm") {
    const ready = readyItems(rows);
    return (
      <Screen narrow>
        <h1 {...headingProps}>Is this what&apos;s on the page?</h1>
        <p className="mt-3 text-lg text-muted">
          Fix anything that doesn&apos;t match. The last box is your kid&apos;s answer — leave it blank to
          skip a problem.
        </p>
        <div className="mt-8">
          <ProblemTable rows={rows} onChange={setRows} />
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <button
            type="button"
            className={button.primary}
            disabled={ready.length === 0}
            onClick={() => {
              setChecked(ready);
              setStep("result");
            }}
          >
            {ready.length === 0
              ? "Check problems"
              : `Check ${ready.length} ${ready.length === 1 ? "problem" : "problems"}`}
          </button>
          <button
            type="button"
            className={textLink}
            onClick={() => {
              setText(toText(rows));
              setStep("input");
            }}
          >
            Edit as text
          </button>
        </div>
      </Screen>
    );
  }

  return (
    <Result
      checked={checked}
      headingProps={headingProps}
      onEdit={() => setStep("confirm")}
      onRestart={() => {
        setText("");
        setRows([]);
        setChecked([]);
        setStep("input");
      }}
      skippedNote={skippedNote(rows)}
    />
  );
}

/** "1 left blank · 1 not covered yet", or null when every row was checked. */
function skippedNote(rows: DraftRow[]): string | null {
  const states = rows.map((row) => readRow(row).kind);
  const count = (kind: string) => states.filter((s) => s === kind).length;
  const parts = [
    count("blank") > 0 && `${count("blank")} left blank`,
    count("unsupported") > 0 && `${count("unsupported")} not covered yet`,
    count("incomplete") > 0 && `${count("incomplete")} incomplete`,
  ].filter(Boolean);
  return parts.length > 0 ? `Not checked: ${parts.join(" · ")}` : null;
}

interface ResultProps {
  checked: SheetItem[];
  skippedNote: string | null;
  headingProps: React.ComponentProps<"h1">;
  onEdit: () => void;
  onRestart: () => void;
}

function Result({ checked, skippedNote, headingProps, onEdit, onRestart }: ResultProps) {
  // The diagnosis is computed here, in the browser, from exactly the rows that were confirmed.
  const report = useMemo(() => diagnoseSheet(checked), [checked]);
  const finding = useMemo(() => interpret(report), [report]);

  return (
    <Screen narrow>
      <p className="text-sm font-semibold tracking-wide text-muted uppercase">Result</p>
      <h1 {...headingProps}>{summarize(report, finding)}</h1>
      {skippedNote && <p className="mt-2 text-sm text-muted">{skippedNote}</p>}

      <div className="mt-8">
        <VerdictCard finding={finding} wrong={report.wrong} />
      </div>

      <h2 className="mt-10 text-lg font-semibold">Problem by problem</h2>
      {report.wrong > 0 && <p className="mt-1 text-sm text-muted">Open a wrong answer to see what happened.</p>}
      <div className="mt-3">
        <ProblemList report={report} />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
        <button type="button" className={button.secondary} onClick={onEdit}>
          Edit answers
        </button>
        <button type="button" className={textLink} onClick={onRestart}>
          Check another worksheet
        </button>
      </div>
    </Screen>
  );
}

function Screen({ narrow = false, children }: { narrow?: boolean; children: React.ReactNode }) {
  return (
    <main className={`mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-12 ${narrow ? "max-w-2xl" : "max-w-4xl"}`}>
      {children}
    </main>
  );
}
