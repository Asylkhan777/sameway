import Link from "next/link";
import { button } from "@/components/styles";

const navLink = "rounded-md px-2 py-1 font-medium text-muted transition-colors hover:text-ink";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Same<span className="text-accent">Way</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm sm:gap-3 sm:text-base">
          <Link href="/check" className={navLink}>
            Check<span className="hidden sm:inline"> a worksheet</span>
          </Link>
          <Link href="/progress" className={navLink}>
            Progress
          </Link>
          <Link href="/#pricing" className={`${navLink} hidden sm:inline`}>
            Pricing
          </Link>
          <Link href="/upgrade" className={`${button.small} ml-1`}>
            Get Plus
          </Link>
        </nav>
      </div>
    </header>
  );
}
