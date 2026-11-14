import type { ReactNode } from "react";

/** A question the parent can ask, in the classroom's words. The text comes from the engine. */
export function SayBubble({ children }: { children: ReactNode }) {
  return (
    <figure>
      <figcaption className="text-sm font-semibold text-muted">What to say</figcaption>
      <blockquote className="mt-1 rounded-2xl rounded-tl-sm border border-line bg-paper px-4 py-3 text-lg leading-7">
        {children}
      </blockquote>
    </figure>
  );
}
