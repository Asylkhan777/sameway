import type { ReactNode } from "react";

const WIDTH = { narrow: "max-w-2xl", medium: "max-w-4xl", wide: "max-w-5xl" };

/** The page column every step of the check flow sits in. */
export function Screen({ size = "medium", children }: { size?: keyof typeof WIDTH; children: ReactNode }) {
  return (
    <main className={`mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-12 ${WIDTH[size]}`}>{children}</main>
  );
}
