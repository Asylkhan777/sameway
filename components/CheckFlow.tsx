"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PhotoInput } from "@/components/PhotoInput";
import type { ReadFailure } from "@/components/PhotoReading";
import { PhotoReading } from "@/components/PhotoReading";
import { ProblemList } from "@/components/ProblemList";
import { ProblemTable } from "@/components/ProblemTable";
import { button, card, textLink } from "@/components/styles";
import { TypedInput } from "@/components/TypedInput";
import { VerdictCard } from "@/components/VerdictCard";
import type { SheetItem } from "@/lib/engine";
import { SYMBOL, diagnoseSheet } from "@/lib/engine";
import { UnreadableImageError, toJpegDataUrl } from "@/lib/image";
import type { Entry } from "@/lib/parse";
import { readPhoto } from "@/lib/read-photo";
import type { Reading } from "@/lib/reading";
import { interpret, summarize } from "@/lib/report";
import type { DraftRow } from "@/lib/worksheet";
import { readRow, readyItems, toDraftRow } from "@/lib/worksheet";

type Step = "input" | "reading" | "confirm" | "result";

/** How the worksheet tells the child to work, in the reader's words → ours. */
const METHOD_NAME: Record<Reading["method"], string | null> = {
  "area-model": "an area model",
  "partial-products": "partial products",
  "standard-algorithm": "the standard algorithm",
  "base-ten": "base-ten blocks",
  "number-line": "a number line",
  unknown: null,
};

/** Rows back to typed lines, so "Edit as text" keeps what was changed in the table. */
const toText = (rows: DraftRow[]): string =>
  rows
    .filter((row) => row.a !== "" || row.b !== "")
    .map((row) => `${row.a} ${SYMBOL[row.op]} ${row.b} = ${row.answer}`.trimEnd())
    .join("\n");

/** The check flow: photo or typing → reading → confirm what's on the page → see the diagnosis. */
export function CheckFlow() {
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [checked, setChecked] = useState<SheetItem[]>([]);
  /** The resized photo as a data URL. It lives in memory only and is gone on reload. */
  const [photo, setPhoto] = useState<string | null>(null);
  const [method, setMethod] = useState<Reading["method"]>("unknown");
  const [failure, setFailure] = useState<ReadFailure | null>(null);
  const request = useRef<AbortController | null>(null);

  // Move focus to the new step's heading so keyboard and screen-reader users follow along.
  // When the parent comes to the input step to type, the cursor goes in the text box instead.
  const heading = useRef<HTMLHeadingElement>(null);
  const typedBox = useRef<HTMLTextAreaElement>(null);
  const toTyping = useRef(false);
  const shown = useRef({ step, failure });
  useEffect(() => {
    const focusTypedBox = () => {
      typedBox.current?.focus({ preventScroll: true });
      typedBox.current?.scrollIntoView({ block: "center" });
    };
    const moved = shown.current.step !== step || shown.current.failure !== failure;
    shown.current = { step, failure };
    if (!moved) {
      // First paint: leave the page alone, unless a "Type it in" link (/check#type) led here.
      if (window.location.hash === "#type") focusTypedBox();
      return;
    }
    if (step === "input" && toTyping.current) {
      toTyping.current = false;
      focusTypedBox();
      return;
    }
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [step, failure]);

  useEffect(() => () => request.current?.abort(), []);

  /** Read a photo: a file that was just picked, or the prepared data URL when trying again. */
  const read = useCallback(async (source: Blob | string) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setFailure(null);
    setStep("reading");
    try {
      let image: string;
      if (typeof source === "string") {
        image = source;
      } else {
        setPhoto(null);
        image = await toJpegDataUrl(source);
        if (controller.signal.aborted) return;
        setPhoto(image);
      }
      const reading = await readPhoto(image, controller.signal);
      if (controller.signal.aborted) return;
      if (reading.problems.length === 0) {
        setFailure("empty");
        return;
      }
      setRows(reading.problems.map((problem) => toDraftRow(problem, problem.confidence === "low")));
      setMethod(reading.method);
      setStep("confirm");
    } catch (error) {
      if (controller.signal.aborted) return;
      setFailure(error instanceof UnreadableImageError ? "unreadable-file" : "reader");
    }
  }, []);

  /** Leave the reading step for the input step, dropping the photo. */
  const backToInput = (toType: boolean) => {
    request.current?.abort();
    setPhoto(null);
    setFailure(null);
    toTyping.current = toType;
    setStep("input");
  };

  const headingProps = {
    ref: heading,
    tabIndex: -1,
    className: "text-3xl font-semibold tracking-tight text-balance outline-none sm:text-4xl",
  };

  if (step === "input") {
    return (
      <Screen>
        <h1 {...headingProps}>Check a worksheet</h1>
        <p className="mt-3 text-lg text-muted">
          Snap your kid&apos;s math homework, or type it in. We&apos;ll find the rule behind the wrong answers.
        </p>
        <div className="mt-8">
          <PhotoInput onPhoto={read} />
          <p className="mt-3 text-sm text-muted">
            We don&apos;t store your photos — they&apos;re only used to read the numbers.
          </p>
        </div>
        <h2 id="type" className="mt-12 scroll-mt-6 text-2xl font-semibold tracking-tight">
          Or type it in
        </h2>
        <div className="mt-4">
          <TypedInput
            text={text}
            onTextChange={setText}
            boxRef={typedBox}
            onContinue={(entries: Entry[]) => {
              setRows(entries.map((entry) => toDraftRow(entry)));
              setStep("confirm");
            }}
          />
        </div>
      </Screen>
    );
  }

  if (step === "reading") {
    return (
      <Screen size="narrow">
        <PhotoReading
          photo={photo}
          failure={failure}
          headingProps={headingProps}
          onRetry={() => (photo ? read(photo) : backToInput(false))}
          onAnotherPhoto={() => backToInput(false)}
          onType={() => backToInput(true)}
          onCancel={() => backToInput(false)}
        />
      </Screen>
    );
  }

  if (step === "confirm") {
    const ready = readyItems(rows);
    const unsure = rows.filter((row) => row.unsure).length;
    const methodName = METHOD_NAME[method];
    return (
      <Screen size={photo ? "wide" : "narrow"}>
        <h1 {...headingProps}>Is this what&apos;s on the page?</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">
          {photo && "This is what we read from your photo. "}
          Fix anything that doesn&apos;t match. The last box is your kid&apos;s answer — leave it blank to
          skip a problem.
        </p>
        {unsure > 0 && (
          <p className="mt-4 max-w-2xl rounded-xl bg-check-soft px-4 py-3 text-check">
            {unsure === 1 ? "1 row was" : `${unsure} rows were`} hard to read and{" "}
            {unsure === 1 ? "is" : "are"} marked below. Please double-check {unsure === 1 ? "it" : "them"} against
            the page.
          </p>
        )}
        <div className={photo ? "mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]" : "mt-8"}>
          {photo && (
            <figure className="lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- an in-memory data URL; nothing to optimize */}
              <img
                src={photo}
                alt="Your worksheet photo"
                className={`${card} max-h-72 w-full object-contain lg:max-h-[70vh]`}
              />
              {methodName && (
                <figcaption className="mt-2 text-sm text-muted">This worksheet asks for {methodName}.</figcaption>
              )}
            </figure>
          )}
          <div>
            <ProblemTable rows={rows} onChange={setRows} />
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
                  toTyping.current = true;
                  setStep("input");
                }}
              >
                Edit as text
              </button>
            </div>
          </div>
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
        setPhoto(null);
        setMethod("unknown");
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
    <Screen size="narrow">
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

const SCREEN_WIDTH = { narrow: "max-w-2xl", medium: "max-w-4xl", wide: "max-w-5xl" };

function Screen({ size = "medium", children }: { size?: keyof typeof SCREEN_WIDTH; children: React.ReactNode }) {
  return (
    <main className={`mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-12 ${SCREEN_WIDTH[size]}`}>
      {children}
    </main>
  );
}
