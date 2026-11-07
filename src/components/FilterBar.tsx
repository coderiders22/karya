import type { IssueSearch } from "@/lib/issueQuery";
import { ISSUE_TYPES, PRIORITIES } from "@/lib/constants";

type O = [string, string][];

export function FilterBar({
  sp, users, statuses, sprints, projects, labels,
}: { sp: IssueSearch; users: O; statuses?: O; sprints?: O; projects?: O; labels: string[] }) {
  return (
    <form className="flex flex-wrap items-end gap-2">
      <input name="q" defaultValue={sp.q} placeholder="Search text or key" className="input !w-56" />
      {projects && <Select name="project" value={sp.project} all="All projects" options={projects} />}
      <Select name="type" value={sp.type} all="All types" options={ISSUE_TYPES.map((t) => [t.value, t.label])} />
      {statuses
        ? <Select name="status" value={sp.status} all="Open statuses" options={statuses} />
        : <Select name="cat" value={sp.cat} all="Open (not done)" options={[["TODO", "To do"], ["IN_PROGRESS", "In progress"], ["DONE", "Done"]]} />}
      <Select name="assignee" value={sp.assignee} all="Anyone" options={[["me", "Me"], ["none", "Unassigned"], ...users]} />
      <Select name="priority" value={sp.priority} all="Any priority" options={PRIORITIES.map((p) => [p.value, p.label])} />
      {labels.length > 0 && <Select name="label" value={sp.label} all="Any label" options={labels.map((l) => [l, l])} />}
      {sprints && <Select name="sprint" value={sp.sprint} all="Any sprint" options={[["active", "Active sprint"], ["none", "Backlog (no sprint)"], ...sprints]} />}
      <Select name="sort" value={sp.sort} options={[["updated", "Recently updated"], ["created", "Newest"], ["priority", "Priority"], ["due", "Due date"], ["key", "Key"]]} />
      <label className="flex items-center gap-1.5 px-2 text-sm"><input type="checkbox" name="done" value="1" defaultChecked={sp.done === "1"} /> Include done</label>
      <button className="btn-primary">Apply</button>
      <a href="?" className="btn-ghost">Reset</a>
    </form>
  );
}

function Select({ name, value, all, options }: { name: string; value?: string; all?: string; options: O }) {
  return (
    <select name={name} defaultValue={value ?? ""} className="select !w-auto">
      {all && <option value="">{all}</option>}
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
