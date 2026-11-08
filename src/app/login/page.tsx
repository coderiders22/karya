import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { login } from "../actions/auth";
import { AuthCard, AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const raw = (await searchParams).next;
  // Coming from a team link: log in, then back to that link.
  const next = raw && /^\/join\/[A-Z0-9]{4,12}$/.test(raw) ? raw : undefined;
  if (await getCurrentUser()) redirect(next ?? "/your-work");
  const host = (await headers()).get("host") ?? undefined;
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to pick up where your team left off."
      host={host}
      footer={<>New here? <Link href={next ? `/signup?join=${next.slice(6)}` : "/signup"} className="font-medium text-brand hover:underline">Create a free account</Link>. Joining a team? Use the link they sent you.</>}
    >
      <AuthForm
        action={login}
        submit="Log in"
        hidden={next ? { next } : undefined}
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@company.com" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password", hint: <Link href="/forgot" className="text-[12.5px] text-brand hover:underline">Forgot password?</Link> },
        ]}
      />
    </AuthCard>
  );
}
