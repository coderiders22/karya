import { redirect } from "next/navigation";
export default async function ProjectIndex({ params }: { params: Promise<{ key: string }> }) {
  redirect(`/projects/${(await params).key}/board`);
}
