/** The child's own answer, set in a handwriting font so it reads as "what they wrote". */
export function KidAnswer({ value, className = "" }: { value: number | string; className?: string }) {
  return <span className={`font-hand text-[1.4em] leading-none ${className}`}>{value}</span>;
}
