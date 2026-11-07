"use client";

import { useActionState, useState } from "react";
import { createProject } from "@/app/actions/projects";

export function CreateProjectForm() {
  const [state, action, pending] = useActionState(createProject, undefined);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [touchedKey, setTouchedKey] = useState(false);
  const suggested = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
  const autoKey = suggested.length >= 2 ? suggested : name.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase();
  return (
    <form action={action} className="card space-y-3 p-5">
      <h2 className="section-title">New project</h2>
      <label className="block">
        <span className="label">Name</span>
        <input name="name" required value={name} onChange={(e) => setName(e.target.value)} className="input mt-1" placeholder="Website Redesign" />
      </label>
      <label className="block">
        <span className="label">Key <span className="font-normal">· prefix for issue IDs</span></span>
        <input
          name="key"
          required
          value={touchedKey ? key : autoKey}
          onChange={(e) => { setTouchedKey(true); setKey(e.target.value.toUpperCase()); }}
          className="input mt-1 font-mono uppercase"
          placeholder="WEB"
          maxLength={10}
        />
      </label>
      <label className="block">
        <span className="label">Description</span>
        <textarea name="description" rows={2} className="input mt-1" />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Creating…" : "Create project"}</button>
    </form>
  );
}
