import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AuthCard } from "@/components/AuthForm";
import { SignupForm } from "@/components/SignupForm";

export const metadata = { title: "Create your account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ join?: string }> }) {
  const join = (await searchParams).join?.slice(0, 12).toUpperCase();
  if (await getCurrentUser()) redirect(join ? `/join/${encodeURIComponent(join)}` : "/your-work");
  const team = join ? await db.project.findUnique({ where: { joinCode: join }, select: { name: true } }) : null;
  return (
    <AuthCard
      title={team ? `Join ${team.name}` : "Create your account"}
      subtitle="Free, with no limit on people."
      footer={<>Already have an account? <Link href={team ? `/login?next=/join/${join}` : "/login"} className="font-medium text-brand hover:underline">Log in</Link>.{!team && <> Joining a team? Use the link they sent you.</>}</>}
    >
      <SignupForm join={team ? join : undefined} teamName={team?.name} />
    </AuthCard>
  );
}
