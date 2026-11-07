import Link from "next/link";
import { StatusScreen } from "@/components/StatusScreen";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-white dark:bg-slate-950">
      <div className="px-6 pt-6"><Link href="/" className="inline-block"><Logo /></Link></div>
      <StatusScreen code="404" title="Page not found" actions={<Link href="/" className="btn-primary">Back to Karya</Link>}>
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </StatusScreen>
    </div>
  );
}
