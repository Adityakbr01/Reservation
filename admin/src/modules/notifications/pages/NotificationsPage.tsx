import { useMemo, useState } from "react";
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
import { StatusBadge } from "@/components/common/StatusBadge";
import { useNotifications, useRetryNotification } from "../hooks/use-notifications";
import { formatDateTimeWithTime } from "@/lib/date";
import type { NotificationStatus } from "../types/notification.types";

const STATUS_FILTERS = ["all", "QUEUED", "PROCESSING", "SENT", "FAILED"] as const;

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return formatDateTimeWithTime(value);
}

export function NotificationsPage() {
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [page, setPage] = useState(1);
  const retryMutation = useRetryNotification();

  const filters = useMemo(
    () => ({
      page,
      limit: 10,
      ...(status !== "all" ? { status: status as NotificationStatus } : {}),
    }),
    [page, status],
  );
  const { data, isPending, isError, refetch } = useNotifications(filters);
  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Email queue — delivery retries automatically with backoff
        </p>
      </div>

      <Select
        value={status}
        onValueChange={(value) => {
          setStatus(value as (typeof STATUS_FILTERS)[number]);
          setPage(1);
        }}
      >
        <SelectTrigger className="sm:w-52" aria-label="Filter by status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_FILTERS.map((option) => (
            <SelectItem key={option} value={option}>
              {option === "all" ? "All statuses" : option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading notifications">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load notifications.</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="font-medium">No notifications found</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((notification) => (
                <TableRow key={notification.id}>
                  <TableCell className="font-medium">{notification.type}</TableCell>
                  <TableCell className="max-w-48 truncate text-muted-foreground">
                    {notification.recipient}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={notification.status} />
                  </TableCell>
                  <TableCell>
                    {notification.attempts}/{notification.maxAttempts}
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-muted-foreground">
                    {notification.lastError ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {notification.status === "FAILED" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        disabled={retryMutation.isPending}
                        onClick={() => retryMutation.mutate(notification.id)}
                      >
                        Retry
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {formatDateTime(notification.sentAt)}
                      </span>
                    )}
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

export default NotificationsPage;
