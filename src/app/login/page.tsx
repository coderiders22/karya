import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { login } from "../actions/auth";
import { AuthCard, AuthForm } from "@/components/AuthForm";
import { ForgotHint } from "@/components/ForgotHint";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  if ((await db.user.count()) === 0) redirect("/setup");
  if (await getCurrentUser()) redirect("/your-work");
  const host = (await headers()).get("host") ?? undefined;
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to pick up where your team left off."
      host={host}
      footer={<>New to this workspace? Ask an admin for an invite link. Accounts are invite-only.</>}
    >
      <AuthForm
        action={login}
        submit="Log in"
        fields={[
          { name: "email", label: "Work email", type: "email", autoComplete: "email", placeholder: "you@company.com" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password", hint: <ForgotHint /> },
        ]}
      />
    </AuthCard>
  );
}
