import { requireUser } from "@/lib/auth";
import { ProfileForms } from "@/components/ProfileForms";
import { PageHeader } from "@/components/PageHeader";

export default async function ProfilePage() {
  const me = await requireUser();
  return (
    <main>
      <PageHeader title="Profile" description="Your name and password." />
      <div className="max-w-xl p-4 sm:p-6"><ProfileForms name={me.name} email={me.email} /></div>
    </main>
  );
}
