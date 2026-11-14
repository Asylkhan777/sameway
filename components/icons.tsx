type IconProps = { className?: string };

const base = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export function CheckIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </svg>
  );
}

export function CrossIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
    </svg>
  );
}

export function ChevronIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 8l4 4 4-4" />
    </svg>
  );
}

export function CameraIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.8} className={className}>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h2l1.2-2h4.6l1.2 2h2A1.5 1.5 0 0 1 17 7.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z" />
      <circle cx="10" cy="10.8" r="2.8" />
    </svg>
  );
}

export function PhotoIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.8} className={className}>
      <rect x="3" y="4" width="14" height="12" rx="2" />
      <circle cx="7.4" cy="8" r="1.1" />
      <path d="M3.5 14l4-4 3 3 2.2-2.2 3.8 3.7" />
    </svg>
  );
}
