import type { Visual } from "@/lib/engine";

type AreaVisual = Extract<Visual, { kind: "area" }>;

interface Props {
  visual: AreaVisual;
  /** Reveal the rectangles one by one. */
  animate?: boolean;
  /** What a highlighted rectangle is: "missing" when it was left out, otherwise "check this". */
  label?: string;
}

/** Room for the part labels on the left and top edges. */
const LEFT = 40;
const TOP = 30;
const PAD = 2;
const MIN_COL = 94;
const MIN_ROW = 84;
/** Delay between two rectangles appearing, in ms. */
const STEP = 150;

/** Sizes proportional to the parts' values, but never below `min`, so 5 stays readable next to 40. */
function spread(values: number[], total: number, min: number): number[] {
  const sum = values.reduce((x, y) => x + y, 0);
  const free = Math.max(0, total - min * values.length);
  return values.map((v) => min + (sum > 0 ? (free * v) / sum : free / values.length));
}

/** Start offsets for a run of sizes: [100, 60] → [0, 100]. */
const offsets = (sizes: number[]): number[] => sizes.map((_, i) => sizes.slice(0, i).reduce((x, y) => x + y, 0));

const fmt = (n: number): string => n.toLocaleString("en-US");

/**
 * The area model the classroom uses for multiplication: one rectangle per pair of parts.
 * Works for 2 × 2 (23 × 45) and for n × 1 (27 × 3).
 */
export function AreaModel({ visual, animate = false, label = "check this" }: Props) {
  const { rows, cols, highlight } = visual;
  const marked = (r: number, c: number) => highlight.some(([hr, hc]) => hr === r && hc === c);

  const widths = spread(cols, cols.length === 1 ? 170 : cols.length === 2 ? 300 : 312, MIN_COL);
  const heights = spread(rows, rows.length === 1 ? 88 : rows.length === 2 ? 196 : 262, MIN_ROW);
  const xs = offsets(widths);
  const ys = offsets(heights);
  const gridW = widths.reduce((x, y) => x + y, 0);
  const gridH = heights.reduce((x, y) => x + y, 0);
  const width = LEFT + gridW + PAD;
  const height = TOP + gridH + PAD;

  const cells = rows.flatMap((row, r) =>
    cols.map((col, c) => ({ r, c, row, col, value: row * col, marked: marked(r, c) })),
  );
  const total = cells.reduce((sum, cell) => sum + cell.value, 0);
  /** The index-th thing to fade in; a no-op unless animating (see `.appear` in globals.css). */
  const appear = (index: number) =>
    animate ? { className: "appear", style: { animationDelay: `${index * STEP}ms` } } : { className: "" };

  const description =
    `Area model: ` +
    cells.map((cell) => `${cell.row} × ${cell.col} = ${fmt(cell.value)}${cell.marked ? ` (${label})` : ""}`).join(", ") +
    `. Total ${fmt(total)}.`;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={description}
        className="mx-auto block h-auto w-full tabular-nums"
        style={{ maxWidth: width }}
      >
        {cols.map((col, c) => (
          <text key={c} x={LEFT + xs[c] + widths[c] / 2} y={TOP - 10} textAnchor="middle" className="fill-ink text-[15px] font-semibold">
            {col}
          </text>
        ))}
        {rows.map((row, r) => (
          <text key={r} x={LEFT - 10} y={TOP + ys[r] + heights[r] / 2} textAnchor="end" dominantBaseline="central" className="fill-ink text-[15px] font-semibold">
            {row}
          </text>
        ))}
        {cells.map((cell, index) => {
          const x = LEFT + xs[cell.c];
          const y = TOP + ys[cell.r];
          const w = widths[cell.c];
          const h = heights[cell.r];
          const cx = x + w / 2;
          const cy = y + h / 2 - (cell.marked ? 7 : 0);
          return (
            <g key={`${cell.r}-${cell.c}`} {...appear(index)}>
              <rect
                x={x + 1}
                y={y + 1}
                width={w - 2}
                height={h - 2}
                rx={6}
                strokeWidth={cell.marked ? 2 : 1.5}
                strokeDasharray={cell.marked ? "6 4" : undefined}
                className={cell.marked ? "fill-accent-soft stroke-accent" : "fill-card stroke-ink/25"}
              />
              <text x={cx} y={cy - 12} textAnchor="middle" className="fill-muted text-[14px]">
                {cell.row} × {cell.col}
              </text>
              <text x={cx} y={cy + 14} textAnchor="middle" className={`text-[23px] font-semibold ${cell.marked ? "fill-accent" : "fill-ink"}`}>
                {fmt(cell.value)}
              </text>
              {cell.marked && (
                <text x={cx} y={y + h - 10} textAnchor="middle" className="fill-accent text-[12px] font-semibold tracking-wide uppercase">
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption
        style={appear(cells.length).style}
        className={`mt-3 text-center text-lg tabular-nums ${appear(cells.length).className}`}
      >
        {cells.map((cell, index) => (
          <span key={index}>
            {index > 0 && " + "}
            {cell.marked ? (
              <span className="font-semibold text-accent underline decoration-dashed underline-offset-4">{fmt(cell.value)}</span>
            ) : (
              fmt(cell.value)
            )}
          </span>
        ))}
        {" = "}
        <strong className="font-semibold">{fmt(total)}</strong>
      </figcaption>
    </figure>
  );
}
