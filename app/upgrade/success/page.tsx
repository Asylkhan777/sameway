import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { UpgradeSuccess } from "@/components/UpgradeSuccess";

export const metadata: Metadata = {
  title: "Welcome to Plus — SameWay",
};

export default function UpgradeSuccessPage() {
  return (
    <>
      <SiteHeader />
      <UpgradeSuccess />
    </>
  );
}
