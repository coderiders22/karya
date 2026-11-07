import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { setupAdmin } from "../actions/auth";
import { AuthCard, AuthForm } from "@/components/AuthForm";

export default async function SetupPage() {
  if ((await db.user.count()) > 0) redirect("/login");
  return (
    <AuthCard title="Set up your workspace" subtitle="You’ll be the first admin. Invite your team right after.">
      <AuthForm
        action={setupAdmin}
        submit="Create admin account"
        fields={[
          { name: "name", label: "Your name", autoComplete: "name" },
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password (min 8 characters)", type: "password", autoComplete: "new-password" },
        ]}
      />
    </AuthCard>
  );
}
