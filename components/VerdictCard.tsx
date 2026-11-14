import type { ReactNode } from "react";
import { KidAnswer } from "@/components/KidAnswer";
import { card } from "@/components/styles";
import type { Problem } from "@/lib/engine";
import { show, solve } from "@/lib/engine";
import type { Example, Finding } from "@/lib/report";

interface Props {
  finding: Finding;
  /** Wrong answers on the whole sheet. */
  wrong: number;
}

/** The headline diagnosis for a worksheet. Rule names and explanations come from the engine. */
export function VerdictCard({ finding, wrong }: Props) {
  switch (finding.kind) {
    case "all-correct":
      return (
        <Shell tone="fixed" eyebrow="Nothing to fix" title="Every answer on this sheet is right.">
          <p className="text-muted">Check the next worksheet when it comes home.</p>
        </Shell>
      );

    case "no-pattern":
      return (
        <Shell tone="neutral" eyebrow="No repeating rule" title="These mistakes don't share one rule.">
          <p className="text-muted">
            That&apos;s good news: there is no broken method to unlearn. Each wrong answer has its own
            note below.
          </p>
        </Shell>
      );

    case "pattern": {
      const { evidence, example } = finding;
      return (
        <Shell tone="accent" eyebrow="The one rule behind it" title={example.bug.title}>
          <p className="font-medium">
            Explains {evidence.explained} of {wrong} wrong answers
          </p>
          <ExampleBlock example={example} />
          <SayBubble>{example.bug.say(example.problem)}</SayBubble>
          <p className="text-sm text-muted">
            This isn&apos;t carelessness. They&apos;re following a rule that works some of the time.
          </p>
        </Shell>
      );
    }

    case "maybe": {
      const { evidence, example, check } = finding;
      return (
        <Shell tone="check" eyebrow="Possible rule" title={`Possible: ${example.bug.title}`}>
          <p className="font-medium">
            {evidence.explained === 1
              ? "Seen once on this sheet. One more problem will confirm it."
              : `Seen ${evidence.explained} times, but not every time it could have shown up.`}
          </p>
          <ExampleBlock example={example} />
          {check && (
            <Aside title="Confirm it with one problem">
              Ask your kid to solve <Expression problem={check.problem} />. If they write{" "}
              <KidAnswer value={check.buggy} />, it&apos;s this rule. If they write {check.correct}, it was a
              one-off and there is nothing to fix.
            </Aside>
          )}
        </Shell>
      );
    }

    case "tie": {
      const { candidates, probe } = finding;
      return (
        <Shell
          tone="check"
          eyebrow="One quick check"
          title={`${candidates.length === 2 ? "Two" : "A few"} rules fit ${wrong === 1 ? "this answer" : "these answers"} equally — one quick check decides.`}
        >
          {probe ? (
            <Aside title="Ask your kid to solve one problem">
              <p>
                <Expression problem={probe.problem} /> — then look at what they write:
              </p>
              <ul className="mt-3 space-y-2">
                {probe.expected.map((expected) => (
                  <li key={expected.family} className="flex items-baseline gap-3">
                    <span className="w-16 shrink-0 text-right">
                      <KidAnswer value={expected.answers.join(" or ")} />
                    </span>
                    <span>
                      {expected.title}
                      {!expected.applies && (
                        <span className="text-muted"> (this problem doesn&apos;t trip that rule, so they get it right)</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Aside>
          ) : (
            <ul className="list-disc space-y-1 pl-5">
              {candidates.map((candidate) => (
                <li key={candidate.family}>{candidate.bug.title}</li>
              ))}
            </ul>
          )}
        </Shell>
      );
    }
  }
}

const TONES = {
  accent: { border: "border-accent/30", eyebrow: "text-accent" },
  check: { border: "border-check/30", eyebrow: "text-check" },
  fixed: { border: "border-fixed/30", eyebrow: "text-fixed" },
  neutral: { border: "border-line", eyebrow: "text-muted" },
};

function Shell(props: { tone: keyof typeof TONES; eyebrow: string; title: string; children: ReactNode }) {
  const tone = TONES[props.tone];
  return (
    <section className={`${card} ${tone.border} p-5 sm:p-7`}>
      <p className={`text-sm font-semibold tracking-wide uppercase ${tone.eyebrow}`}>{props.eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{props.title}</h2>
      <div className="mt-4 space-y-4 text-base leading-7">{props.children}</div>
    </section>
  );
}

const Expression = ({ problem }: { problem: Problem }) => (
  <strong className="font-semibold whitespace-nowrap tabular-nums">{show(problem)}</strong>
);

/** The child's own problem, what they wrote, and the rule's account of it. */
function ExampleBlock({ example }: { example: Example }) {
  return (
    <div className="rounded-xl bg-accent-soft px-4 py-3">
      <p className="text-lg tabular-nums">
        {show(example.problem)} = <KidAnswer value={example.answer} className="text-accent" />
        <span className="ml-3 text-sm text-muted">should be {solve(example.problem)}</span>
      </p>
      <p className="mt-2">{example.bug.explain(example.problem)}</p>
    </div>
  );
}

function SayBubble({ children }: { children: ReactNode }) {
  return (
    <figure>
      <figcaption className="text-sm font-semibold text-muted">What to say</figcaption>
      <blockquote className="mt-1 rounded-2xl rounded-tl-sm border border-line bg-paper px-4 py-3 text-lg leading-7">
        {children}
      </blockquote>
    </figure>
  );
}

function Aside({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-check-soft px-4 py-3">
      <p className="text-sm font-semibold text-check">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
