import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { GUIDE, SHORTCUTS } from "@/lib/guide";
import { PageHeader } from "@/components/PageHeader";
import { GuideClient } from "@/components/GuideClient";
import { GuideTourButton } from "@/components/GuideTourButton";

export const metadata: Metadata = { title: "Guide" };

export default async function GuidePage() {
  await requireUser();
  return (
    <main>
      <PageHeader
        title="Guide"
        description="How each part of Karya works, what it does for your team, and short videos of the real thing."
        actions={<GuideTourButton />}
      />
      <GuideClient sections={GUIDE} shortcuts={SHORTCUTS} />
    </main>
  );
}
