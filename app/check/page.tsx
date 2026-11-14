import type { Metadata } from "next";
import { CheckFlow } from "@/components/CheckFlow";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Check a worksheet — SameWay",
};

export default function CheckPage() {
  return (
    <>
      <SiteHeader />
      <CheckFlow />
    </>
  );
}
