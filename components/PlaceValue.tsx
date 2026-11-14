import type { Problem, Visual } from "@/lib/engine";
import { SYMBOL, addTrace, digitCount, place, show, solve, subtractTrace, toDigits, unit } from "@/lib/engine";

interface Props {
  problem: Problem;
  visual: Extract<Visual, { kind: "place-value" }>;
}

/** What a column shows above its top digit: the regrouped values, oldest first. */
interface Column {
  top: number | null;
  bottom: number | null;
  answer: number | null;
  /** The top digit was crossed out and replaced by these, in order (subtraction). */
  rewrites: number[];
  /** A 1 carried in from the column to the right (addition). */
  carried: boolean;
}

const HEADERS = ["O", "T", "H", "Th", "TTh"];
const COL = 54;
const LEFT = 38;
const HEADER = 24;
const MARK = 23;
const ROW = 44;

/** Lay the correct method out column by column, ones first, plus the trades in words. */
function work(problem: Problem): { columns: Column[]; trades: string[] } | null {
  const { op, a, b } = problem;
  if (op === "*" || (op === "-" && b > a)) return null;
  const answer = solve(problem);
  const n = Math.max(digitCount(a), digitCount(b), digitCount(answer));
  const digit = (value: number, i: number) => (i < digitCount(value) ? toDigits(value)[i] : null);
  const columns: Column[] = Array.from({ length: n }, (_, i) => ({
    top: digit(a, i),
    bottom: digit(b, i),
    answer: digit(answer, i),
    rewrites: [],
    carried: false,
  }));

  if (op === "-") {
    const trace = subtractTrace(a, b);
    if (!trace) return null;
    trace.columns.forEach((column, i) => (columns[i].rewrites = column.top.slice(1)));
    return { columns, trades: trace.trades.map((k) => `1 ${unit(k)} → 10 ${place(k - 1)}`) };
  }

  const trades: string[] = [];
  addTrace(a, b).forEach((column, i) => {
    if (column.carry === 0) return;
    trades.push(`10 ${place(i - 1)} → 1 ${unit(i)}`);
    // A carry into a column with no digits is simply written in the answer.
    columns[i].carried = columns[i].top !== null || columns[i].bottom !== null;
  });
  return { columns, trades };
}

/**
 * The problem written in columns on a place-value grid, worked the correct way:
 * crossed-out digits and their new values for subtraction, the carried 1 for addition.
 * The columns where the child's rule goes wrong are highlighted.
 */
export function PlaceValue({ problem, visual }: Props) {
  const worked = work(problem);
  if (!worked) return null;
  const { columns, trades } = worked;
  const n = columns.length;
  const markRows = Math.max(0, ...columns.map((c) => (c.carried ? 1 : c.rewrites.length)));

  const width = LEFT + n * COL + 6;
  const topBase = HEADER + markRows * MARK + 38; // baseline of the top number
  const bottomBase = topBase + ROW;
  const ruleY = bottomBase + 12;
  const answerBase = ruleY + 36;
  const height = answerBase + 12;
  /** Centre of the column for place i (0 = ones, drawn rightmost). */
  const x = (i: number) => LEFT + (n - 1 - i) * COL + COL / 2;

  const description =
    `${show(problem)} in columns` +
    (trades.length > 0 ? `, regrouping: ${trades.join(", ")}` : "") +
    `. Answer ${solve(problem)}.`;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={description}
        className="mx-auto block h-auto w-full tabular-nums"
        style={{ maxWidth: width }}
      >
        {visual.columns
          .filter((i) => i >= 0 && i < n)
          .map((i) => (
            <rect
              key={i}
              x={x(i) - COL / 2 + 3}
              y={HEADER - 2}
              width={COL - 6}
              height={height - HEADER}
              rx={8}
              strokeWidth={2}
              strokeDasharray="6 4"
              className="fill-accent-soft stroke-accent"
            />
          ))}

        {columns.map((column, i) => {
          const history = column.top === null ? [] : [column.top, ...column.rewrites];
          return (
            <g key={i}>
              <text x={x(i)} y={14} textAnchor="middle" className="fill-muted text-[12px] font-semibold tracking-wide">
                {HEADERS[i]}
              </text>
              {history.map((value, step) => {
                const crossed = step < history.length - 1;
                if (step === 0) return <Digit key={step} x={x(i)} y={topBase} value={value} crossed={crossed} />;
                return <Mark key={step} x={x(i)} y={topBase - 34 - (step - 1) * MARK} value={value} crossed={crossed} />;
              })}
              {column.carried && <Mark x={x(i)} y={topBase - 34} value={1} crossed={false} />}
              {column.bottom !== null && <Digit x={x(i)} y={bottomBase} value={column.bottom} />}
              {column.answer !== null && <Digit x={x(i)} y={answerBase} value={column.answer} bold />}
            </g>
          );
        })}

        <text x={LEFT / 2} y={bottomBase} textAnchor="middle" className="fill-ink text-[28px]">
          {SYMBOL[problem.op]}
        </text>
        <line x1={4} x2={width - 4} y1={ruleY} y2={ruleY} strokeWidth={2} strokeLinecap="round" className="stroke-ink" />
      </svg>
      {trades.length > 0 && (
        <figcaption className="mt-2 text-center text-base font-medium tabular-nums">{trades.join(" · ")}</figcaption>
      )}
    </figure>
  );
}

/** A digit of the problem or the answer; crossed out once it has been regrouped. */
function Digit(props: { x: number; y: number; value: number; crossed?: boolean; bold?: boolean }) {
  const { x, y, value, crossed = false, bold = false } = props;
  return (
    <>
      <text
        x={x}
        y={y}
        textAnchor="middle"
        className={`text-[30px] ${bold ? "font-semibold" : ""} ${crossed ? "fill-muted" : "fill-ink"}`}
      >
        {value}
      </text>
      {crossed && <Strike x={x} y={y - 10} halfWidth={12} rise={12} />}
    </>
  );
}

/** A small regrouping mark written above a digit: the new value, or a carried 1. */
function Mark({ x, y, value, crossed }: { x: number; y: number; value: number; crossed: boolean }) {
  const halfWidth = String(value).length * 5 + 3;
  return (
    <>
      <text
        x={x}
        y={y}
        textAnchor="middle"
        className={`text-[18px] font-semibold ${crossed ? "fill-muted" : "fill-ink"}`}
      >
        {value}
      </text>
      {crossed && <Strike x={x} y={y - 6} halfWidth={halfWidth} rise={7} />}
    </>
  );
}

const Strike = ({ x, y, halfWidth, rise }: { x: number; y: number; halfWidth: number; rise: number }) => (
  <line
    x1={x - halfWidth}
    y1={y + rise}
    x2={x + halfWidth}
    y2={y - rise}
    strokeWidth={2}
    strokeLinecap="round"
    className="stroke-ink/70"
  />
);
