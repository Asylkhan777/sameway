import type { Metadata } from "next";
import { ProgressView } from "@/components/ProgressView";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Progress — SameWay",
};

export default function ProgressPage() {
  return (
    <>
      <SiteHeader />
      <ProgressView />
    </>
  );
}
