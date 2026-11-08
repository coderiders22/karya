import { getProjectByKey } from "@/lib/project";
import { ProjectHeader } from "@/components/ProjectHeader";
import { templateById } from "@/lib/templates";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ key: string }> }) {
  const { key } = await params;
  const project = await getProjectByKey(key);
  return (
    <div>
      <ProjectHeader project={{ key: project.key, name: project.name, color: project.color, dueAt: project.dueAt?.toISOString(), deadlineLabel: templateById(project.template)?.deadlineLabel }} />
      {children}
    </div>
  );
}
