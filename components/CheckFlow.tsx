"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PhotoInput } from "@/components/PhotoInput";
import type { ReadFailure } from "@/components/PhotoReading";
import { PhotoReading } from "@/components/PhotoReading";
import { Practice } from "@/components/Practice";
import { ProblemTable } from "@/components/ProblemTable";
import { Result } from "@/components/Result";
import { Screen } from "@/components/Screen";
import { button, card, textLink } from "@/components/styles";
import { TypedInput } from "@/components/TypedInput";
import { checkProblem, settle } from "@/lib/check";
import type { SheetItem } from "@/lib/engine";
import { SYMBOL, diagnoseSheet } from "@/lib/engine";
import { UnreadableImageError, toJpegDataUrl } from "@/lib/image";
import type { Entry } from "@/lib/parse";
import { practiceSet } from "@/lib/practice";
import { readPhoto } from "@/lib/read-photo";
import type { Reading } from "@/lib/reading";
import type { Finding, Solved } from "@/lib/report";
import { interpret } from "@/lib/report";
import type { DraftRow } from "@/lib/worksheet";
import { readRow, readyItems, toDraftRow } from "@/lib/worksheet";

type Step = "input" | "reading" | "confirm" | "result" | "practice";

/** Where the one-problem check of a tie or a possible rule stands. */
interface CheckState {
  /** Which check problem is showing; each answer that settles nothing moves to the next. */
  attempt: number;
  /** What the check decided: the confirmed rule, or a one-off. */
  settled: Finding | null;
  /** The last answer, if it settled nothing. */
  missed: Solved | null;
}

const NOT_CHECKED: CheckState = { attempt: 0, settled: null, missed: null };

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

/** The check flow: photo or typing → reading → confirm what's on the page → diagnosis → practice. */
export function CheckFlow() {
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [checked, setChecked] = useState<SheetItem[]>([]);
  const [check, setCheck] = useState<CheckState>(NOT_CHECKED);
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

  // The diagnosis is computed here, in the browser, from exactly the rows that were confirmed.
  const report = useMemo(() => diagnoseSheet(checked), [checked]);
  const asked = useMemo(() => interpret(report, check.attempt), [report, check.attempt]);
  const finding = check.settled ?? asked;
  /** The rule to practice, once one is named, and how many practice problems it has. */
  const practice = useMemo(() => {
    if (finding.kind !== "pattern") return null;
    const { bug, problem } = finding.example;
    return { bug, like: problem, size: practiceSet(bug, problem).length };
  }, [finding]);

  /** The kid's answer to the check problem: it names a rule, clears it, or leads to one more problem. */
  const answerCheck = (answer: number) => {
    const problem = checkProblem(asked);
    if (!problem) return;
    const settled = settle(report, asked, answer);
    setCheck(
      settled
        ? { ...check, settled, missed: null }
        : { attempt: check.attempt + 1, settled: null, missed: { problem, answer } },
    );
  };

  const restart = () => {
    setText("");
    setRows([]);
    setChecked([]);
    setCheck(NOT_CHECKED);
    setPhoto(null);
    setMethod("unknown");
    setStep("input");
  };

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
                  setCheck(NOT_CHECKED);
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

  if (step === "practice" && practice) {
    return (
      <Practice
        bug={practice.bug}
        like={practice.like}
        headingProps={headingProps}
        onBack={() => setStep("result")}
        onRestart={restart}
      />
    );
  }

  return (
    <Result
      report={report}
      finding={finding}
      missed={check.missed}
      skippedNote={skippedNote(rows)}
      practiceSize={practice?.size ?? 0}
      headingProps={headingProps}
      onCheck={answerCheck}
      onPractice={() => setStep("practice")}
      onEdit={() => setStep("confirm")}
      onRestart={restart}
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
