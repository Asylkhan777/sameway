"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PhotoInput } from "@/components/PhotoInput";
import type { ReadFailure } from "@/components/PhotoReading";
import { PhotoReading } from "@/components/PhotoReading";
import { Practice } from "@/components/Practice";
import { ProblemTable } from "@/components/ProblemTable";
import { Result } from "@/components/Result";
import { SampleBadge } from "@/components/SampleBadge";
import { SamplePicker } from "@/components/SamplePicker";
import { Screen } from "@/components/Screen";
import { button, card, textLink } from "@/components/styles";
import { TypedInput } from "@/components/TypedInput";
import { checkProblem, settle } from "@/lib/check";
import type { SheetItem } from "@/lib/engine";
import { SYMBOL, diagnoseSheet } from "@/lib/engine";
import { UnreadableImageError, toJpegDataUrl } from "@/lib/image";
import type { Entry } from "@/lib/parse";
import { practiceSet } from "@/lib/practice";
import { recordPractice, recordWorksheet, verdictOf } from "@/lib/progress";
import { readPhoto } from "@/lib/read-photo";
import type { Reading } from "@/lib/reading";
import type { Finding, Solved } from "@/lib/report";
import { interpret } from "@/lib/report";
import { sampleImage } from "@/lib/sample-image";
import type { Sample } from "@/lib/samples";
import { sampleById } from "@/lib/samples";
import type { WorksheetRecord } from "@/lib/storage";
import { updateProgress, useProgress } from "@/lib/storage";
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

/**
 * A sample waits this long for the photo reader, then uses its saved transcription, so a
 * busy reader never holds up a first look at the product.
 */
const SAMPLE_READ_TIMEOUT_MS = 15_000;

const newId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

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
  /** Where the rows came from. A sample stays a sample however it is edited. */
  const [source, setSource] = useState<WorksheetRecord["source"]>("typed");
  const [sample, setSample] = useState<Sample | null>(null);
  /** The reader couldn't be reached for a sample, so its saved transcription is in the table. */
  const [savedTranscription, setSavedTranscription] = useState(false);
  /** This worksheet's record in the saved progress: one record however often it is re-checked. */
  const sheet = useRef<{ id: string; at: string } | null>(null);
  /** The practice round in progress: when it started, and how many came before it. */
  const [round, setRound] = useState<{ at: string; before: number } | null>(null);
  const progress = useProgress();

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

  /** Save what this worksheet showed. Called on every check, so the record follows the edits. */
  const save = (items: SheetItem[], found: Finding) => {
    sheet.current ??= { id: newId(), at: new Date().toISOString() };
    const record = { ...sheet.current, source, items, verdict: verdictOf(found) };
    updateProgress((saved) => recordWorksheet(saved, record));
  };

  /** The kid's answer to the check problem: it names a rule, clears it, or leads to one more problem. */
  const answerCheck = (answer: number) => {
    const problem = checkProblem(asked);
    if (!problem) return;
    const settled = settle(report, asked, answer);
    if (settled) save(checked, settled);
    setCheck(
      settled
        ? { ...check, settled, missed: null }
        : { attempt: check.attempt + 1, settled: null, missed: { problem, answer } },
    );
  };

  /** Forget the worksheet in hand, so the next one starts a new record. */
  const newSheet = useCallback((from: WorksheetRecord["source"], picked: Sample | null = null) => {
    sheet.current = null;
    setSource(from);
    setSample(picked);
    setSavedTranscription(false);
    // A sample link (/check?sample=b) has done its job once the sample is left behind.
    if (!picked && window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const restart = () => {
    request.current?.abort();
    newSheet("typed");
    setText("");
    setRows([]);
    setChecked([]);
    setCheck(NOT_CHECKED);
    setRound(null);
    setPhoto(null);
    setMethod("unknown");
    setFailure(null);
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
        newSheet("photo");
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
  }, [newSheet]);

  /**
   * Run a sample worksheet through the same steps as a parent's photo: its image goes to the
   * photo reader. Only if the reader can't be reached is the saved transcription used instead,
   * and the confirm screen says so. The diagnosis is computed live either way.
   */
  const startSample = useCallback(
    async (picked: Sample) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      newSheet("sample", picked);
      setFailure(null);
      setPhoto(null);
      setStep("reading");
      let reading: Reading | null = null;
      try {
        const image = await sampleImage(picked);
        if (controller.signal.aborted) return;
        setPhoto(image);
        reading = await readPhoto(image, controller.signal, SAMPLE_READ_TIMEOUT_MS);
      } catch {
        // Falls through to the saved transcription.
      }
      if (controller.signal.aborted) return;
      if (reading && reading.problems.length > 0) {
        setRows(reading.problems.map((problem) => toDraftRow(problem, problem.confidence === "low")));
        setMethod(reading.method);
      } else {
        setRows(picked.entries.map((entry) => toDraftRow(entry)));
        setMethod("unknown");
        setSavedTranscription(true);
      }
      setStep("confirm");
    },
    [newSheet],
  );

  // A sample card on the landing page links here as /check?sample=b. The URL is only known
  // in the browser, so the sample starts a tick after the first paint. It starts once: coming
  // back to this page with the Back button shows the flow as it was left.
  const linkFollowed = useRef(false);
  useEffect(() => {
    const picked = sampleById(new URLSearchParams(window.location.search).get("sample") ?? "");
    if (!picked || linkFollowed.current) return;
    const timer = setTimeout(() => {
      linkFollowed.current = true;
      void startSample(picked);
    }, 0);
    return () => clearTimeout(timer);
  }, [startSample]);

  /** Leave the reading step for the input step, dropping the photo. */
  const backToInput = (toType: boolean) => {
    request.current?.abort();
    newSheet("typed");
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

  /** Shown above every step of a sample, so it is never mistaken for the visitor's own worksheet. */
  const sampleLabel = sample && (
    <p className="mb-3 flex items-center gap-2 text-sm text-muted">
      <SampleBadge />
      {sample.grade} · {sample.title}
    </p>
  );

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
        <h2 className="mt-12 text-2xl font-semibold tracking-tight">No homework at hand? Try a sample</h2>
        <p className="mt-2 text-muted">Each sample is read and checked the same way your own photo would be.</p>
        <div className="mt-4">
          <SamplePicker onPick={startSample} />
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
        {sampleLabel && <div className="flex justify-center">{sampleLabel}</div>}
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
        {sampleLabel}
        <h1 {...headingProps}>Is this what&apos;s on the page?</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">
          {photo && !savedTranscription && `This is what we read from ${sample ? "the sample" : "your photo"}. `}
          Fix anything that doesn&apos;t match. The last box is your kid&apos;s answer — leave it blank to
          skip a problem.
        </p>
        {savedTranscription && (
          <p className="mt-4 max-w-2xl rounded-xl bg-check-soft px-4 py-3 text-check" role="status">
            Couldn&apos;t reach the reader — using the saved transcription of this sample. The diagnosis is
            still worked out live from the table below.
          </p>
        )}
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
                alt={sample ? "The sample worksheet" : "Your worksheet photo"}
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
                  save(ready, interpret(diagnoseSheet(ready)));
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

  if (step === "practice" && practice && round) {
    const { family } = practice.bug;
    return (
      <Practice
        key={round.at}
        bug={practice.bug}
        like={practice.like}
        round={round.before}
        headingProps={headingProps}
        onResults={(results) => updateProgress((saved) => recordPractice(saved, family, { at: round.at, results }))}
        onBack={() => setStep("result")}
        backLabel="Back to the result"
        onRestart={restart}
        progressLink
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
      sampleLabel={sampleLabel}
      onPractice={() => {
        const before = practice ? (progress?.rules[practice.bug.family]?.practice.length ?? 0) : 0;
        setRound({ at: new Date().toISOString(), before });
        setStep("practice");
      }}
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
