import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Same<span className="text-accent">Way</span>
        </Link>
      </div>
    </header>
  );
}
