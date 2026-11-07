import Link from "next/link";
import { StatusScreen } from "@/components/StatusScreen";
import { OpenSearchButton } from "@/components/StatusActions";

export default function NotFound() {
  return (
    <StatusScreen code="404" title="This card isn't on the board"
      actions={<><Link href="/your-work" className="btn-primary">Go to Your work</Link><OpenSearchButton /></>}>
      It may have been deleted or moved to another project, or the link has a typo. Search usually finds it.
    </StatusScreen>
  );
}
