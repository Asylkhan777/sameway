"use client";

import { useEffect, useState } from "react";
import { button, card, textLink } from "@/components/styles";

/** Why a photo didn't turn into a table of problems. */
export type ReadFailure =
  /** The browser can't decode the file (e.g. HEIC on a desktop). */
  | "unreadable-file"
  /** The reader was unreachable, busy or couldn't make sense of the photo. */
  | "reader"
  /** The reader answered, but found no problems. */
  | "empty";

const FAILURES: Record<ReadFailure, { title: string; body: string }> = {
  "unreadable-file": {
    title: "We can't open this file.",
    body: "Your browser can't read this photo format — this happens with HEIC photos from an iPhone. Try a JPG or PNG, or take a screenshot of the photo and use that.",
  },
  reader: {
    title: "We couldn't read this photo just now.",
    body: "The photo reader didn't answer. Try it again, or type the problems in — the diagnosis works the same either way.",
  },
  empty: {
    title: "We couldn't find any math problems in this photo.",
    body: "Make sure the whole worksheet is in the frame and in focus. You can also type the problems in.",
  },
};

/** After this long the loader admits the wait and points at typing. */
const SLOW_AFTER_MS = 8_000;

interface Props {
  /** The prepared photo, once the browser has resized it. */
  photo: string | null;
  failure: ReadFailure | null;
  headingProps: React.ComponentProps<"h1">;
  onRetry: () => void;
  onAnotherPhoto: () => void;
  onType: () => void;
  onCancel: () => void;
}

/** The step between picking a photo and confirming the table: a calm loader, or an honest failure. */
export function PhotoReading({ photo, failure, headingProps, onRetry, onAnotherPhoto, onType, onCancel }: Props) {
  return (
    <div className="flex flex-col items-center text-center">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- an in-memory data URL; nothing to optimize
        <img
          src={photo}
          alt="Your worksheet photo"
          className={`${card} mb-8 max-h-64 w-auto max-w-full object-contain ${failure ? "" : "opacity-80"}`}
        />
      )}
      {failure ? (
        <div role="alert">
          <h1 {...headingProps}>{FAILURES[failure].title}</h1>
          <p className="mx-auto mt-3 max-w-md text-lg text-muted">{FAILURES[failure].body}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
            {failure === "reader" ? (
              <>
                <button type="button" className={button.primary} onClick={onType}>
                  Type it instead
                </button>
                <button type="button" className={button.secondary} onClick={onRetry}>
                  Try again
                </button>
                <button type="button" className={textLink} onClick={onAnotherPhoto}>
                  Use another photo
                </button>
              </>
            ) : (
              <>
                <button type="button" className={button.primary} onClick={onAnotherPhoto}>
                  Use another photo
                </button>
                <button type="button" className={button.secondary} onClick={onType}>
                  Type it instead
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <Working headingProps={headingProps} onType={onType} onCancel={onCancel} />
      )}
    </div>
  );
}

function Working({ headingProps, onType, onCancel }: Pick<Props, "headingProps" | "onType" | "onCancel">) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div role="status">
      <span
        aria-hidden
        className="mx-auto mb-5 block size-8 animate-spin rounded-full border-[3px] border-line border-t-ink"
      />
      <h1 {...headingProps}>Reading the worksheet…</h1>
      <p className="mx-auto mt-3 max-w-md text-lg text-muted">
        {slow
          ? "Still reading — the reader is busy right now. You can keep waiting or type the problems in."
          : "Copying down each problem and the answer your kid wrote. Nothing is graded yet."}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
        {slow && (
          <button type="button" className={button.secondary} onClick={onType}>
            Type it instead
          </button>
        )}
        <button type="button" className={textLink} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
