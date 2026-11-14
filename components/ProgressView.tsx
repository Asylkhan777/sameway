"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Practice } from "@/components/Practice";
import { RuleCard, formatDay } from "@/components/RuleCard";
import { SampleBadge } from "@/components/SampleBadge";
import { Screen } from "@/components/Screen";
import { button, card, textLink } from "@/components/styles";
import { buildDemo } from "@/lib/demo";
import { nextHomeworkNight, weeklyReminder } from "@/lib/ics";
import {
  practiceTarget,
  recheckedSinceFixed,
  recordPractice,
  setChildName,
  worksheetSummary,
} from "@/lib/progress";
import type { Progress } from "@/lib/storage";
import { updateProgress, useProgress } from "@/lib/storage";

/** The practice round in progress: which rule, when it started, and how many came before it. */
interface Round {
  family: string;
  at: string;
  before: number;
}

function downloadReminder() {
  const ics = weeklyReminder(nextHomeworkNight(), window.location.origin);
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "sameway-homework-night.ics";
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * The progress page: every rule found so far and where it stands, the worksheets behind them,
 * and what to do next. The demo swaps in Maya's three weeks; it lives in memory only, so the
 * visitor's own progress is never touched and is back the moment the demo is closed.
 */
export function ProgressView() {
  const saved = useProgress();
  const [demo, setDemo] = useState<Progress | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const nameId = useId();

  const progress = demo ?? saved;
  const inDemo = demo !== null;
  const change = (apply: (progress: Progress) => Progress) => {
    if (inDemo) setDemo((current) => current && apply(current));
    else updateProgress(apply);
  };

  // Each view starts at the top: the list, a practice round, the demo.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [round, inDemo]);

  const banner = inDemo && (
    <div role="status" className="border-b border-check/30 bg-check-soft">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <SampleBadge>DEMO</SampleBadge>
        <p className="flex-1 text-sm">
          <span className="font-semibold">3 weeks with Maya.</span> Sample data · 3 weeks compressed. Every
          status below is worked out from her worksheets and practice answers.
        </p>
        <button
          type="button"
          className={`${textLink} text-sm`}
          onClick={() => {
            setDemo(null);
            setRound(null);
          }}
        >
          Exit demo
        </button>
      </div>
    </div>
  );

  const target = round && progress ? practiceTarget(progress.worksheets, round.family) : null;
  if (round && target) {
    return (
      <>
        {banner}
        <Practice
          key={round.at}
          bug={target.bug}
          like={target.like}
          round={round.before}
          onResults={(results) => change((p) => recordPractice(p, round.family, { at: round.at, results }))}
          onBack={() => setRound(null)}
          backLabel="Back to progress"
        />
      </>
    );
  }

  const name = progress?.child.name;
  const rules = Object.entries(progress?.rules ?? {}).sort(([, x], [, y]) => (x.lastSeen < y.lastSeen ? 1 : -1));
  const worksheets = [...(progress?.worksheets ?? [])].reverse();
  const count = (status: string) => rules.filter(([, rule]) => rule.status === status).length;

  return (
    <>
      {banner}
      <Screen size="narrow">
        <p className="text-sm font-semibold tracking-wide text-muted uppercase">Progress</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {name ? `${name}’s math rules` : "Your kid’s math rules"}
        </h1>
        <p className="mt-3 text-lg text-muted">
          Each rule SameWay finds on a worksheet is tracked here until it is fixed, and re-checked on every
          worksheet after that.
        </p>

        {!inDemo && (
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-dashed border-line px-4 py-3 text-sm">
            <span className="flex-1 text-muted">See what three weeks of homework nights look like.</span>
            <button type="button" className={`${textLink} text-sm`} onClick={() => setDemo(buildDemo())}>
              Demo: 3 weeks with Maya
            </button>
          </p>
        )}

        {progress === null ? (
          <div className="min-h-64" aria-busy />
        ) : worksheets.length === 0 ? (
          <section className={`${card} mt-8 p-5 sm:p-7`}>
            <h2 className="text-xl font-semibold tracking-tight">Nothing here yet</h2>
            <p className="mt-2 leading-7 text-muted">
              Check a worksheet, and the rule behind the wrong answers shows up here as Found. Practice moves
              it to Practicing, and getting all three practice problems right makes it Fixed.
            </p>
            <Link href="/check" className={`${button.primary} mt-5`}>
              Check a worksheet
            </Link>
          </section>
        ) : (
          <>
            <section className="mt-10">
              <h2 className="text-2xl font-semibold tracking-tight">Rules</h2>
              {rules.length === 0 ? (
                <p className="mt-2 text-muted">No repeating rule on the worksheets so far. Nothing to fix.</p>
              ) : (
                <>
                  <p className="mt-1 text-muted tabular-nums">
                    {count("fixed")} fixed · {count("practicing")} practicing · {count("found")} found
                  </p>
                  <ul className="mt-4 space-y-4">
                    {rules.map(([family, rule]) => (
                      <RuleCard
                        key={family}
                        rule={rule}
                        rechecked={recheckedSinceFixed(progress.worksheets, family, rule)}
                        onPractice={
                          practiceTarget(progress.worksheets, family)
                            ? () =>
                                setRound({ family, at: new Date().toISOString(), before: rule.practice.length })
                            : undefined
                        }
                      />
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section className={`${card} graph-paper mt-10 p-5 sm:p-7`}>
              <h2 className="text-xl font-semibold tracking-tight">Next homework night</h2>
              <p className="mt-2 leading-7">Snap the next worksheet — we&apos;ll check the fix stuck.</p>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Link href="/check" className={button.primary}>
                  Check the next worksheet
                </Link>
                <button type="button" className={textLink} onClick={downloadReminder}>
                  Add a weekly reminder to my calendar
                </button>
              </div>
            </section>

            <section className="mt-10">
              <h2 className="text-2xl font-semibold tracking-tight">Worksheets</h2>
              <ol className={`${card} mt-4 divide-y divide-line`}>
                {worksheets.map((sheet) => {
                  const rule = sheet.verdict.family ? progress.rules[sheet.verdict.family] : undefined;
                  return (
                    <li key={sheet.id} className="flex gap-4 px-4 py-3 sm:px-5">
                      <span className="w-14 shrink-0 font-medium tabular-nums">{formatDay(sheet.at)}</span>
                      <span className="min-w-0">
                        <span className="block">{worksheetSummary(sheet)}</span>
                        {rule && <span className="block text-sm text-muted">{rule.title}</span>}
                        {sheet.source === "sample" && (
                          <span className="mt-1 block">
                            <SampleBadge />
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          </>
        )}

        {!inDemo && progress !== null && (
          <div className="mt-10">
            <label htmlFor={nameId} className="font-medium">
              Your kid&apos;s first name <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id={nameId}
              value={nameDraft ?? name ?? ""}
              onChange={(event) => {
                setNameDraft(event.target.value);
                updateProgress((p) => setChildName(p, event.target.value));
              }}
              maxLength={40}
              autoComplete="off"
              className="mt-2 block h-12 w-full max-w-xs rounded-xl border border-line bg-card px-4 text-lg"
            />
            <p className="mt-2 text-sm text-muted">
              Only used on this page. It stays in this browser, like everything else here.
            </p>
          </div>
        )}
      </Screen>
    </>
  );
}
