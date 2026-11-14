"use client";

import { CrossIcon } from "@/components/icons";
import { textLink } from "@/components/styles";
import type { Op } from "@/lib/engine";
import { SYMBOL, toMessage } from "@/lib/engine";
import { MAX_PROBLEMS } from "@/lib/parse";
import type { DraftRow, RowState } from "@/lib/worksheet";
import { emptyRow, readRow } from "@/lib/worksheet";

const OPS: Op[] = ["+", "-", "*"];
const OP_NAME: Record<Op, string> = { "+": "plus", "-": "minus", "*": "times" };
/** The engine's own wording for problems it doesn't diagnose. */
const OUT_OF_SCOPE = toMessage({ op: "+", a: 0, b: 0 }, { kind: "unsupported" });

const field =
  "h-12 min-w-0 rounded-lg border border-line bg-card px-2 text-center tabular-nums placeholder:text-muted/50";
const printed = `${field} text-lg`;
/** The kid's answer is the one handwritten thing on the page. */
const handwritten = `${field} font-hand text-3xl placeholder:font-sans placeholder:text-sm`;

/** What a row that won't be checked says underneath, and how loudly. */
function rowNote(row: DraftRow, state: RowState): { text: string; tone: string } | null {
  switch (state.kind) {
    case "ready":
      return null;
    case "blank":
      return { text: "No answer — this one is skipped.", tone: "text-muted" };
    case "incomplete":
      return row.a === "" && row.b === "" && row.answer === ""
        ? null
        : { text: "Add both numbers to check this one.", tone: "text-check" };
    case "unsupported":
      return { text: `${OUT_OF_SCOPE.headline} — this one is skipped.`, tone: "text-check" };
  }
}

const digits = (value: string, max: number): string => value.replace(/\D/g, "").slice(0, max);

interface Props {
  rows: DraftRow[];
  onChange: (rows: DraftRow[]) => void;
}

/** The editable confirm table: [a] [op] [b] = [kid's answer], one row per problem. */
export function ProblemTable({ rows, onChange }: Props) {
  const update = (id: string, patch: Partial<DraftRow>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const lastOp = rows.at(-1)?.op ?? "-";
  const anyOutOfScope = rows.some((row) => readRow(row).kind === "unsupported");

  return (
    <div>
      <ol className="space-y-2">
        {rows.map((row, index) => {
          const n = index + 1;
          const note = rowNote(row, readRow(row));
          return (
            <li key={row.id}>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="hidden w-6 text-right text-sm text-muted tabular-nums sm:block">{n}</span>
                <input
                  aria-label={`Problem ${n}: first number`}
                  inputMode="numeric"
                  value={row.a}
                  onChange={(event) => update(row.id, { a: digits(event.target.value, 5) })}
                  className={`${printed} flex-1`}
                />
                <select
                  aria-label={`Problem ${n}: operation`}
                  value={row.op}
                  onChange={(event) => update(row.id, { op: event.target.value as Op })}
                  className={`${printed} w-14 shrink-0 px-1`}
                >
                  {OPS.map((op) => (
                    <option key={op} value={op} aria-label={OP_NAME[op]}>
                      {SYMBOL[op]}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={`Problem ${n}: second number`}
                  inputMode="numeric"
                  value={row.b}
                  onChange={(event) => update(row.id, { b: digits(event.target.value, 5) })}
                  className={`${printed} flex-1`}
                />
                <span aria-hidden className="text-lg text-muted">
                  =
                </span>
                <input
                  aria-label={`Problem ${n}: your kid's answer`}
                  inputMode="numeric"
                  value={row.answer}
                  placeholder="blank"
                  onChange={(event) => update(row.id, { answer: digits(event.target.value, 9) })}
                  className={`${handwritten} flex-[1.3]`}
                />
                <button
                  type="button"
                  aria-label={`Delete problem ${n}`}
                  onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-line/60 hover:text-ink"
                >
                  <CrossIcon className="size-4" />
                </button>
              </div>
              {note && <p className={`mt-1 text-sm sm:pl-8 ${note.tone}`}>{note.text}</p>}
            </li>
          );
        })}
      </ol>
      {anyOutOfScope && <p className="mt-3 text-sm text-muted sm:pl-8">{OUT_OF_SCOPE.body}</p>}
      {rows.length < MAX_PROBLEMS && (
        <button
          type="button"
          className={`${textLink} mt-4 text-sm sm:ml-8`}
          onClick={() => onChange([...rows, emptyRow(lastOp)])}
        >
          + Add a problem
        </button>
      )}
    </div>
  );
}
