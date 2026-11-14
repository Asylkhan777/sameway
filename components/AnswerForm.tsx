"use client";

import { useId, useState } from "react";
import { button } from "@/components/styles";
import type { Problem } from "@/lib/engine";
import { show } from "@/lib/engine";

interface Props {
  problem: Problem;
  onAnswer: (answer: number) => void;
  autoFocus?: boolean;
}

/** One problem with a box for the kid's answer: "52 − 18 = [ ] Check". */
export function AnswerForm({ problem, onAnswer, autoFocus = false }: Props) {
  const id = useId();
  const [value, setValue] = useState("");

  return (
    <form
      className="flex flex-wrap items-center gap-x-3 gap-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (value !== "") onAnswer(Number(value));
      }}
    >
      <label htmlFor={id} className="text-2xl whitespace-nowrap tabular-nums">
        {show(problem)} =<span className="sr-only"> your kid&apos;s answer</span>
      </label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => setValue(event.target.value.replace(/\D/g, "").slice(0, 6))}
        className="h-12 w-28 min-w-0 rounded-lg border border-line bg-card px-2 text-center font-hand text-3xl tabular-nums"
      />
      <button type="submit" className={button.primary} disabled={value === ""}>
        Check
      </button>
    </form>
  );
}
