import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { LabelsManager } from "@/components/LabelsManager";

export const metadata: Metadata = { title: "Labels" };

export default async function LabelsPage() {
  const me = await requireUser();
  const rows = await db.$queryRaw<{ l: string; n: bigint; open: bigint }[]>`
    SELECT t.l, count(*) AS n, count(*) FILTER (WHERE s.category <> 'DONE') AS open
    FROM (SELECT unnest(labels) AS l, "statusId" FROM "Issue") t
    JOIN "Status" s ON s.id = t."statusId"
    GROUP BY t.l ORDER BY count(*) DESC, t.l ASC`;
  return (
    <main>
      <PageHeader
        title="Labels"
        description="Every label used across your projects. Colors apply everywhere, for the whole team."
      />
      <div className="max-w-3xl p-4 sm:p-6">
        <LabelsManager labels={rows.map((r) => ({ name: r.l, count: Number(r.n), open: Number(r.open) }))} isAdmin={me.role === "ADMIN"} />
      </div>
    </main>
  );
}
