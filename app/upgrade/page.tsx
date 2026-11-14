import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { UpgradeFlow } from "@/components/UpgradeFlow";

export const metadata: Metadata = {
  title: "Get Plus — SameWay",
};

export default function UpgradePage() {
  return (
    <>
      <SiteHeader />
      <UpgradeFlow />
    </>
  );
}
