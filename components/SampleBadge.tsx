/** Marks sample and demo data, so it is never mistaken for a family's own. */
export function SampleBadge({ children = "SAMPLE" }: { children?: string }) {
  return (
    <span className="inline-block rounded-full bg-ink px-2 py-0.5 text-xs font-semibold tracking-wide whitespace-nowrap text-white">
      {children}
    </span>
  );
}
