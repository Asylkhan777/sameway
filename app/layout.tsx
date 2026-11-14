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

const TITLE = "SameWay — see exactly why your kid got it wrong";
const DESCRIPTION =
  "Snap your kid's math homework. SameWay finds the one rule they're getting wrong, shows it the way schools teach it, and checks that it's fixed.";

export const metadata: Metadata = {
  // Makes the link-preview image URL absolute.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://sameway-sigma.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, siteName: "SameWay", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${caveat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
