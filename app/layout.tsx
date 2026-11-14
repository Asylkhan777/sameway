import type { Metadata } from "next";
import { Caveat, Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/** Handwriting font, used only for the kid's own answers. */
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["600"],
});

export const metadata: Metadata = {
  title: "SameWay — see exactly why your kid got it wrong",
  description:
    "Snap your kid's math homework. SameWay finds the one rule they're getting wrong, shows it the way their teacher does, and checks that it's fixed.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${caveat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
