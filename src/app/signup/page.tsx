import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SignupForm } from "@/components/SignupForm";

export const metadata = { title: "Create your account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ join?: string; as?: string }> }) {
  const query = await searchParams;
  const join = query.join?.slice(0, 12).toUpperCase();
  if (await getCurrentUser()) redirect(join ? `/join/${encodeURIComponent(join)}` : "/your-work");
  const team = join ? await db.project.findUnique({ where: { joinCode: join }, select: { name: true } }) : null;
  return (
    <SignupForm
      join={team ? join : undefined}
      teamName={team?.name}
      student={query.as === "student"}
      title={team ? `Join ${team.name}` : "Create your account"}
      footer={<>Already have an account? <Link href={team ? `/login?next=/join/${join}` : "/login"} className="font-medium text-brand hover:underline">Log in</Link>.{!team && <> Joining a team? Use the link they sent you.</>}</>}
    />
  );
}
