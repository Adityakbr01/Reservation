import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { ContentStatus } from "../types/cms.types";

interface StatusButtonsProps {
  status: ContentStatus;
  pending: boolean;
  onChange: (to: ContentStatus) => void;
}

/** Publish / archive / back-to-draft with backend-enforced transitions. */
export function StatusButtons({ status, pending, onChange }: StatusButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <StatusBadge status={status} />
      {status === "DRAFT" && (
        <Button
          size="sm"
          className="rounded-full"
          disabled={pending}
          onClick={() => onChange("PUBLISHED")}
        >
          Publish
        </Button>
      )}
      {status === "PUBLISHED" && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={pending}
            onClick={() => onChange("DRAFT")}
          >
            Unpublish
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={pending}
            onClick={() => onChange("ARCHIVED")}
          >
            Archive
          </Button>
        </>
      )}
      {status === "ARCHIVED" && (
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={pending}
          onClick={() => onChange("DRAFT")}
        >
          Back to draft
        </Button>
      )}
    </div>
  );
}
