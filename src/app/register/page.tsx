import { db } from "@/lib/db";
import { registerWithInvite } from "../actions/auth";
import { AuthCard, AuthForm } from "@/components/AuthForm";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const invite = token ? await db.invite.findUnique({ where: { token } }) : null;
  const valid = invite && !invite.usedAt && invite.expiresAt > new Date();
  if (!valid) {
    return (
      <AuthCard title="Invite not valid" subtitle="This invite link is missing, already used or expired. Ask an admin for a new one.">
        <a href="/login" className="btn w-full">Go to login</a>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Join your team on Karya" subtitle="Create your account. It takes about 20 seconds." panel="typing">
      <AuthForm
        action={registerWithInvite}
        submit="Create account"
        hidden={{ token }}
        fields={[
          { name: "name", label: "Your name", autoComplete: "name" },
          { name: "email", label: "Email", type: "email", defaultValue: invite.email ?? "", autoComplete: "email" },
          { name: "password", label: "Password (min 8 characters)", type: "password", autoComplete: "new-password" },
        ]}
      />
    </AuthCard>
  );
}
