/** Shared class names, so buttons and links look the same on every screen. */

const buttonBase =
  "inline-flex h-12 items-center justify-center rounded-full px-6 text-base font-medium transition-colors";

export const button = {
  primary: `${buttonBase} bg-ink text-white hover:bg-ink/85 disabled:cursor-not-allowed disabled:bg-ink/30`,
  secondary: `${buttonBase} border border-line bg-card text-ink hover:border-ink/40`,
  small:
    "inline-flex h-9 items-center justify-center rounded-full bg-ink px-4 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-ink/85",
};

export const textLink =
  "font-medium text-ink underline decoration-ink/30 underline-offset-4 transition-colors hover:decoration-ink";

export const card = "rounded-2xl border border-line bg-card";
