import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/common/PaginationControls";
import { formatDateTimeWithTime } from "@/lib/date";
import { apiClient } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { Paged } from "@/types/api";

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

const ACTIONS = [
  "all",
  "BOOKING_CREATED",
  "BOOKING_CANCELLED",
  "BOOKING_CHECKED_IN",
  "BOOKING_CHECKED_OUT",
  "PAYMENT_REFUNDED",
  "CUSTOMER_DISABLED",
  "CUSTOMER_ENABLED",
  "CMS_PUBLISHED",
  "CMS_UNPUBLISHED",
  "CMS_ARCHIVED",
  "SETTINGS_UPDATED",
  "NOTIFICATION_RETRIED",
  "COUPON_DISABLED",
] as const;

function formatDateTime(value: string): string {
  return formatDateTimeWithTime(value);
}

export function AuditLogsPage() {
  const [action, setAction] = useState<(typeof ACTIONS)[number]>("all");
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({ page, limit: 15, ...(action !== "all" ? { action } : {}) }),
    [page, action],
  );

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      const { data: body } = await apiClient.get<ApiEnvelope<AuditLog[]>>("/admin/audit-logs", {
        params: filters,
      });
      const paged: Paged<AuditLog> = {
        items: body.data,
        total: body.meta?.total ?? 0,
        page: body.meta?.page ?? 1,
        totalPages: body.meta?.totalPages ?? 1,
      };
      return paged;
    },
  });
  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">Audit logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Immutable history — who did what, and when
        </p>
      </div>

      <Select
        value={action}
        onValueChange={(value) => {
          setAction(value as (typeof ACTIONS)[number]);
          setPage(1);
        }}
      >
        <SelectTrigger className="sm:w-64" aria-label="Filter by action">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ACTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option === "all" ? "All actions" : option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading audit logs">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load audit logs.</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="font-medium">No audit entries yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Actions like cancels, check-ins, publishes, and settings changes land here.
          </p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Actor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">{entry.action}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.entityType}
                    {entry.entityId ? ` · ${entry.entityId.slice(-6)}` : ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.actorRole ?? "system"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls page={page} totalPages={data?.totalPages ?? 0} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export default AuditLogsPage;
