"use client";

import { useActionState } from "react";
import { changePassword, updateProfile } from "@/app/actions/profile";

export function ProfileForms({ name, email }: { name: string; email: string }) {
  const [p, profileAction, p1] = useActionState(updateProfile, undefined);
  const [pw, passwordAction, p2] = useActionState(changePassword, undefined);
  return (
    <div className="space-y-6">
      <form action={profileAction} className="card space-y-3 p-5">
        <h2 className="font-semibold">Profile</h2>
        <label className="block"><span className="label">Name</span><input name="name" defaultValue={name} className="input mt-1" /></label>
        <label className="block"><span className="label">Email</span><input value={email} disabled className="input mt-1 opacity-60" /></label>
        <Msg s={p} />
        <button className="btn-primary" disabled={p1}>Save profile</button>
      </form>
      <form action={passwordAction} className="card space-y-3 p-5">
        <h2 className="font-semibold">Change password</h2>
        <label className="block"><span className="label">Current password</span><input name="current" type="password" autoComplete="current-password" className="input mt-1" /></label>
        <label className="block"><span className="label">New password</span><input name="next" type="password" autoComplete="new-password" className="input mt-1" /></label>
        <Msg s={pw} />
        <button className="btn-primary" disabled={p2}>Change password</button>
      </form>
    </div>
  );
}

function Msg({ s }: { s?: { error?: string; ok?: string } }) {
  if (s?.error) return <p className="text-sm text-red-600">{s.error}</p>;
  if (s?.ok) return <p className="text-sm text-green-600">{s.ok}</p>;
  return null;
}
