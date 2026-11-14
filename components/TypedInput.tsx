"use client";

import { useId } from "react";
import { CheckIcon } from "@/components/icons";
import { KidAnswer } from "@/components/KidAnswer";
import { button, textLink } from "@/components/styles";
import { SYMBOL } from "@/lib/engine";
import type { Entry } from "@/lib/parse";
import { MAX_PROBLEMS, formatEntry, parseWorksheet } from "@/lib/parse";
import { SAMPLES } from "@/lib/samples";

const EXAMPLE = SAMPLES[0].entries.map(formatEntry).join("\n");

interface Props {
  text: string;
  onTextChange: (text: string) => void;
  onContinue: (entries: Entry[]) => void;
}

/** Type a worksheet, one problem per line, with a live preview of how it is read. */
export function TypedInput({ text, onTextChange, onContinue }: Props) {
  const id = useId();
  const lines = parseWorksheet(text);
  const entries = lines.flatMap((line) => (line.ok ? [line.entry] : [])).slice(0, MAX_PROBLEMS);
  const unreadable = lines.filter((line) => !line.ok).length;
  const tooMany = lines.filter((line) => line.ok).length > MAX_PROBLEMS;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor={id} className="font-medium">
            One problem per line, with your kid&apos;s answer
          </label>
          <button type="button" className={`${textLink} shrink-0 text-sm`} onClick={() => onTextChange(EXAMPLE)}>
            Insert example
          </button>
        </div>
        <textarea
          id={id}
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          rows={8}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder={"52-18=46\n23x45=815\n23 × 45 = 815"}
          className="mt-2 block w-full resize-y rounded-xl border border-line bg-card px-4 py-3 text-lg leading-8 tabular-nums placeholder:text-muted/60"
        />
        <p className="mt-2 text-sm text-muted">
          Copy the answers exactly as written, even the wrong ones. Use + − or x.
        </p>
      </div>

      <div aria-live="polite">
        <p className="font-medium">How we read it</p>
        {lines.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-line px-4 py-6 text-sm text-muted">
            Start typing and each problem shows up here.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-card text-lg tabular-nums">
            {lines.map((line, index) => (
              <li key={index} className="flex min-h-12 items-center gap-3 px-4 py-2">
                {line.ok ? (
                  <>
                    <CheckIcon className="size-4 shrink-0 text-muted" />
                    <span>
                      {line.entry.a} {SYMBOL[line.entry.op]} {line.entry.b} ={" "}
                      {line.entry.answer === null ? (
                        <span className="text-sm text-muted">blank</span>
                      ) : (
                        <KidAnswer value={line.entry.answer} />
                      )}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-check">
                    Can&apos;t read &ldquo;{line.text}&rdquo;. Write it like 52-18=46.
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {tooMany && (
          <p className="mt-2 text-sm text-muted">Only the first {MAX_PROBLEMS} problems are used.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 md:col-span-2">
        <button
          type="button"
          className={button.primary}
          disabled={entries.length === 0}
          onClick={() => onContinue(entries)}
        >
          {entries.length === 0
            ? "Continue"
            : `Continue with ${entries.length} ${entries.length === 1 ? "problem" : "problems"}`}
        </button>
        {unreadable > 0 && entries.length > 0 && (
          <p className="text-sm text-muted">
            {unreadable === 1 ? "1 line" : `${unreadable} lines`} we can&apos;t read will be left out.
          </p>
        )}
      </div>
    </div>
  );
}
