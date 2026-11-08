import { db } from "@/lib/db";
import { resetPassword } from "../actions/auth";
import { AuthCard, AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Choose a new password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const reset = token ? await db.passwordReset.findUnique({ where: { token }, include: { user: { select: { name: true, email: true } } } }) : null;
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return (
      <AuthCard title="This link has expired" subtitle="Reset links work once and only last a limited time. You can request a new one.">
        <div className="space-y-2">
          <a href="/forgot" className="btn-primary !h-10 w-full text-[14px]">Request a new link</a>
          <a href="/login" className="btn !h-10 w-full text-[14px]">Back to log in</a>
        </div>
      </AuthCard>
    );
  }
  return (
    <AuthCard title={`Hi ${reset.user.name.split(" ")[0]}, choose a new password`} subtitle={`For ${reset.user.email}. You'll be logged in straight after.`}>
      <AuthForm
        action={resetPassword}
        submit="Save password and log in"
        hidden={{ token }}
        fields={[
          { name: "password", label: "New password", type: "password", autoComplete: "new-password", placeholder: "At least 8 characters" },
          { name: "confirm", label: "Type it again", type: "password", autoComplete: "new-password" },
        ]}
      />
    </AuthCard>
  );
}
