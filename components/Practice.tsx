"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnswerForm } from "@/components/AnswerForm";
import { CheckIcon, CrossIcon } from "@/components/icons";
import { KidAnswer } from "@/components/KidAnswer";
import { RuleVisual } from "@/components/RuleVisual";
import { SayBubble } from "@/components/SayBubble";
import { Screen } from "@/components/Screen";
import { button, card, textLink } from "@/components/styles";
import type { Bug, Problem } from "@/lib/engine";
import { show } from "@/lib/engine";
import type { Grade } from "@/lib/practice";
import { freshExercise, grade, practiceSet } from "@/lib/practice";
import type { Exercise } from "@/lib/report";

/** One of the problems on screen: unanswered, right, or wrong with feedback. */
interface Slot {
  exercise: Exercise;
  answer: number | null;
  grade: Grade | null;
  /** Swapped in after a wrong answer, so the cursor goes straight to it. */
  retry: boolean;
}

const open = (exercise: Exercise, retry = false): Slot => ({ exercise, answer: null, grade: null, retry });

interface Props {
  /** The rule being practiced. */
  bug: Bug;
  /** The worksheet problem it showed up on; practice problems have the same shape. */
  like: Problem;
  /** Earlier rounds on this rule, so each round brings new problems. */
  round?: number;
  headingProps?: React.ComponentProps<"h1">;
  /** After every answer: one entry per problem, true if it is right so far. */
  onResults?: (results: boolean[]) => void;
  onBack: () => void;
  backLabel: string;
  /** Start another worksheet; left out where that isn't the next step. */
  onRestart?: () => void;
  /** Point to the progress page once the rule is fixed. */
  progressLink?: boolean;
}

/** Three problems where the rule would go wrong. All three right means it is fixed. */
export function Practice(props: Props) {
  const { bug, like, round = 0, headingProps, onResults, onBack, backLabel, onRestart, progressLink } = props;
  const [slots, setSlots] = useState<Slot[]>(() => practiceSet(bug, like, round).map((exercise) => open(exercise)));
  /** Every problem shown so far, so a retry is always a new one. */
  const [shown, setShown] = useState<Problem[]>(() => slots.map((slot) => slot.exercise.problem));

  const right = slots.filter((slot) => slot.grade?.kind === "right").length;
  const fixed = slots.length > 0 && right === slots.length;

  const fixedNote = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!fixed) return;
    fixedNote.current?.scrollIntoView({ block: "center" });
    fixedNote.current?.focus({ preventScroll: true });
  }, [fixed]);

  const answer = (index: number, value: number) => {
    const next = slots.map((slot, i) =>
      i === index ? { ...slot, answer: value, grade: grade(bug, slot.exercise.problem, value) } : slot,
    );
    setSlots(next);
    onResults?.(next.map((slot) => slot.grade?.kind === "right"));
  };

  const retry = (index: number) => {
    // If the engine ever runs out of new problems, the same one can be tried again.
    const next = freshExercise(bug, like, shown) ?? slots[index].exercise;
    setShown([...shown, next.problem]);
    setSlots(slots.map((slot, i) => (i === index ? open(next, true) : slot)));
  };

  return (
    <Screen size="narrow">
      <p className="text-sm font-semibold tracking-wide text-muted uppercase">Practice</p>
      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl" {...headingProps}>
        Practice the fix
      </h1>
      <p className="mt-3 text-lg text-muted">
        Hand the phone to your kid. These are problems like the ones on the worksheet, where the rule &ldquo;
        {bug.title.toLowerCase()}&rdquo; would go wrong. Paper and pencil are welcome.
      </p>

      <p className="mt-6 font-medium tabular-nums" aria-live="polite">
        {right} of {slots.length} right
      </p>
      <ol className="mt-3 space-y-4">
        {slots.map((slot, index) => (
          <li key={show(slot.exercise.problem)} className={`${card} p-5`}>
            {slot.grade === null || slot.answer === null ? (
              <AnswerForm
                problem={slot.exercise.problem}
                autoFocus={slot.retry}
                onAnswer={(value) => answer(index, value)}
              />
            ) : (
              <Answered
                problem={slot.exercise.problem}
                answer={slot.answer}
                grade={slot.grade}
                onRetry={() => retry(index)}
              />
            )}
          </li>
        ))}
      </ol>

      {fixed && (
        <section
          ref={fixedNote}
          tabIndex={-1}
          role="status"
          className="mt-6 rounded-2xl border border-fixed/30 bg-fixed-soft p-5 outline-none sm:p-7"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-fixed">
            Fixed ✓ — we&apos;ll re-check it on the next worksheet.
          </h2>
          <p className="mt-2 leading-7">
            {slots.length} of {slots.length} right on problems where the old rule gives a different answer.
            {progressLink && (
              <>
                {" "}
                <Link href="/progress" className={textLink}>
                  See it in progress
                </Link>
              </>
            )}
          </p>
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
        {onRestart && (
          <button type="button" className={fixed ? button.primary : button.secondary} onClick={onRestart}>
            Check another worksheet
          </button>
        )}
        <button
          type="button"
          className={onRestart ? textLink : fixed ? button.primary : button.secondary}
          onClick={onBack}
        >
          {backLabel}
        </button>
      </div>
    </Screen>
  );
}

interface AnsweredProps {
  problem: Problem;
  answer: number;
  grade: Grade;
  onRetry: () => void;
}

/** A problem after the kid answered: a tick, or what went wrong and a way to try again. */
function Answered({ problem, answer, grade, onRetry }: AnsweredProps) {
  const isRight = grade.kind === "right";
  return (
    <div role="status">
      <p className="flex items-center gap-3 text-2xl tabular-nums">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
            isRight ? "bg-fixed-soft text-fixed" : "bg-accent-soft text-accent"
          }`}
        >
          {isRight ? <CheckIcon className="size-5" /> : <CrossIcon className="size-5" />}
          <span className="sr-only">{isRight ? "Right" : "Not yet"}</span>
        </span>
        <span>
          {show(problem)} = <KidAnswer value={answer} className={isRight ? "text-fixed" : "text-accent"} />
        </span>
      </p>

      {!isRight && (
        <div className="mt-4 space-y-4 leading-7">
          {grade.kind === "same-rule" ? (
            <>
              <div>
                <p className="font-semibold text-accent">Same rule again</p>
                <p className="mt-1">{grade.bug.explain(problem)}</p>
              </div>
              <RuleVisual bug={grade.bug} problem={problem} />
              <SayBubble>{grade.bug.say(problem)}</SayBubble>
            </>
          ) : (
            <>
              <div>
                <p className="font-semibold">{grade.message.headline}</p>
                <p className="mt-1">{grade.message.body}</p>
              </div>
              {grade.message.say && <SayBubble>{grade.message.say}</SayBubble>}
            </>
          )}
          <button type="button" className={button.secondary} onClick={onRetry}>
            Try a fresh problem
          </button>
        </div>
      )}
    </div>
  );
}
