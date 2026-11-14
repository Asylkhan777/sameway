import { AreaModel } from "@/components/AreaModel";
import { PlaceValue } from "@/components/PlaceValue";
import type { Bug, Problem } from "@/lib/engine";

/** Rules that leave a rectangle out altogether; the others fill it in with the wrong value. */
const LEAVES_PARTS_OUT = new Set(["mul2-missing-part", "mul2-column-by-column"]);

interface Props {
  bug: Bug;
  problem: Problem;
  animate?: boolean;
}

/** The picture for a rule on one problem, on the model the school uses for it. */
export function RuleVisual({ bug, problem, animate }: Props) {
  const visual = bug.visual(problem);
  return (
    <div className="rounded-xl border border-line bg-paper px-2 py-4 sm:px-4">
      {visual.kind === "area" ? (
        <AreaModel
          visual={visual}
          animate={animate}
          label={LEAVES_PARTS_OUT.has(bug.family) ? "missing" : "check this"}
        />
      ) : (
        <PlaceValue problem={problem} visual={visual} />
      )}
    </div>
  );
}
