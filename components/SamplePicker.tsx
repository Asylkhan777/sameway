"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SampleBadge } from "@/components/SampleBadge";
import { sampleImage } from "@/lib/sample-image";
import type { Sample } from "@/lib/samples";
import { SAMPLES } from "@/lib/samples";

const cardClass =
  "flex h-full w-full items-center gap-4 rounded-2xl border border-line bg-card p-3 text-left transition-colors hover:border-ink/40 sm:flex-col sm:items-stretch sm:gap-0 sm:p-0";

interface Props {
  /** Start the sample right here. Without it, each card links to the check flow. */
  onPick?: (sample: Sample) => void;
}

/** The three sample worksheets. Each card shows the very image that gets read. */
export function SamplePicker({ onPick }: Props) {
  const [images, setImages] = useState<Record<string, string>>({});
  useEffect(() => {
    let live = true;
    for (const sample of SAMPLES) {
      sampleImage(sample).then(
        (image) => live && setImages((known) => ({ ...known, [sample.id]: image })),
        () => {}, // No thumbnail; the card still works.
      );
    }
    return () => {
      live = false;
    };
  }, []);

  return (
    <ul className="grid gap-3 sm:grid-cols-3 sm:gap-4">
      {SAMPLES.map((sample) => {
        const image = images[sample.id];
        const content = (
          <>
            <span className="graph-paper block h-20 w-24 shrink-0 overflow-hidden rounded-lg border border-line bg-paper sm:h-auto sm:w-full sm:rounded-none sm:rounded-t-2xl sm:border-0 sm:border-b sm:aspect-[4/3]">
              {image && (
                // eslint-disable-next-line @next/next/no-img-element -- an in-memory data URL; nothing to optimize
                <img src={image} alt="" className="size-full object-cover object-top" />
              )}
            </span>
            <span className="block min-w-0 sm:p-4">
              <span className="flex items-center gap-2 text-sm text-muted">
                <SampleBadge />
                {sample.grade}
              </span>
              <span className="mt-1.5 block font-semibold">{sample.title}</span>
            </span>
          </>
        );
        return (
          <li key={sample.id}>
            {onPick ? (
              <button type="button" className={cardClass} onClick={() => onPick(sample)}>
                {content}
              </button>
            ) : (
              <Link href={`/check?sample=${sample.id}`} className={cardClass}>
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
