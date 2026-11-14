import Link from "next/link";
import { CheckIcon, CrossIcon } from "@/components/icons";
import { KidAnswer } from "@/components/KidAnswer";
import { SampleBadge } from "@/components/SampleBadge";
import { SamplePicker } from "@/components/SamplePicker";
import { SiteHeader } from "@/components/SiteHeader";
import { button, card, textLink } from "@/components/styles";
import { diagnoseSheet, show } from "@/lib/engine";
import { interpret, summarize } from "@/lib/report";
import { SAMPLES } from "@/lib/samples";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="graph-paper border-b border-line">
          <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                See exactly why your kid got it wrong.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
                Snap their math homework. SameWay finds the one rule they&apos;re getting wrong, shows it
                the way their teacher does, and checks that it&apos;s fixed.
              </p>
              <a href="#samples" className={`${button.primary} mt-8`}>
                Try a sample worksheet
              </a>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Link href="/check" className={button.secondary}>
                  Upload homework photo
                </Link>
                <Link href="/check#type" className={button.secondary}>
                  Type it in
                </Link>
              </div>
              <p className="mt-4 text-sm text-muted">No sign-up · Grades 2–4 · + − ×</p>
            </div>
            <SamplePreview />
          </div>
        </section>

        <section id="samples" className="mx-auto w-full max-w-5xl scroll-mt-6 px-4 pt-12 sm:px-6 sm:pt-16">
          <h2 className="text-2xl font-semibold tracking-tight">Try a sample worksheet</h2>
          <p className="mt-2 max-w-2xl text-lg text-muted">
            No homework at hand? Pick one. It is read and checked the same way your own photo would be,
            and you can change any answer to see the diagnosis change.
          </p>
          <div className="mt-6">
            <SamplePicker />
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 pt-12 sm:px-6 sm:pt-16">
          <h2 className="text-2xl font-semibold tracking-tight">It keeps track until it&apos;s fixed</h2>
          <p className="mt-2 max-w-2xl text-lg leading-8 text-muted">
            Every rule goes from found, to practicing, to fixed — and each later worksheet re-checks the
            ones already fixed.{" "}
            <Link href="/progress" className={textLink}>
              See the progress page
            </Link>
          </p>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Why you can trust it</h2>
          <ul className="mt-3 max-w-2xl space-y-3 text-lg leading-8 text-muted">
            <li>
              Every mistake pattern is a tested rule in code, not a guess. Validated on 1.2M grade 2–4
              problems. When an answer doesn&apos;t match a known rule, SameWay says so.
            </li>
            <li>We don&apos;t store your photos — they&apos;re only used to read the numbers.</li>
          </ul>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-muted sm:px-6">
          SameWay · Grades 2–4 · + − ×
        </div>
      </footer>
    </>
  );
}

/** A sample worksheet and its diagnosis, computed by the engine when the page is built. */
function SamplePreview() {
  const sample = SAMPLES[0];
  const report = diagnoseSheet(
    sample.entries.flatMap((e) =>
      e.answer === null ? [] : [{ problem: { op: e.op, a: e.a, b: e.b }, answer: e.answer }],
    ),
  );
  const finding = interpret(report);

  return (
    <figure className={`${card} p-5 shadow-sm sm:p-6`}>
      <figcaption className="flex items-center gap-2 text-sm text-muted">
        <SampleBadge />
        {sample.grade} · {sample.title}
      </figcaption>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-lg tabular-nums">
        {report.items.map(({ item, diagnosis }, index) => {
          const correct = diagnosis.kind === "correct";
          return (
            <li key={index} className="flex items-center gap-2 whitespace-nowrap">
              <span className={correct ? "text-fixed" : "text-accent"}>
                {correct ? <CheckIcon className="size-4" /> : <CrossIcon className="size-4" />}
                <span className="sr-only">{correct ? "Correct" : "Wrong"}</span>
              </span>
              <span>
                {show(item.problem)} = <KidAnswer value={item.answer} className={correct ? "" : "text-accent"} />
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 border-t border-line pt-4">
        <p className="text-sm text-muted">{summarize(report, finding)}</p>
        {finding.kind === "pattern" && (
          <>
            <p className="mt-1 text-xl font-semibold tracking-tight">{finding.example.bug.title}</p>
            <p className="mt-2 leading-7 text-muted">{finding.example.bug.explain(finding.example.problem)}</p>
          </>
        )}
      </div>
    </figure>
  );
}
