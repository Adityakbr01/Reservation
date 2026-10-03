import { Badge } from "@/components/ui/badge";

const STATUS_VARIANTS: Record<string, "success" | "secondary" | "warning" | "destructive"> = {
  ACTIVE: "success",
  DRAFT: "secondary",
  INACTIVE: "warning",
  MAINTENANCE: "destructive",
};

/** Consistent status pill across management tables. */
export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANTS[status] ?? "secondary"}>{status}</Badge>;
}
