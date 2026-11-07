import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatMoney } from "@/lib/money";
import { useReservations } from "../hooks/use-reservations";
import { RESERVATION_STATUSES } from "../types/reservation.types";
import { formatDateTime } from "@/lib/date";
import type { BookingStatus } from "../types/reservation.types";

const STATUS_FILTERS = ["all", ...RESERVATION_STATUSES] as const;

function formatDate(value: string): string {
  return formatDateTime(value);
}

export function ReservationsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const filters = useMemo(
    () => ({
      page,
      limit: 10,
      ...(debouncedSearch.trim() ? { q: debouncedSearch.trim() } : {}),
      ...(status !== "all" ? { status: status as BookingStatus } : {}),
    }),
    [page, debouncedSearch, status],
  );
  const { data, isPending, isError, refetch } = useReservations(filters);
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">Reservations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data ? `${data.total} bookings` : "All customer bookings"}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search reference or guest email…"
          className="sm:max-w-xs"
          aria-label="Search reservations"
        />
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
      </div>

      {isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading reservations">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load reservations.</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="font-medium">No reservations found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different search or filter.
          </p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Stay</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((b) => {
                const booking = b as any;
                const bookingNumber = booking.bookingNumber ?? booking.booking_number ?? booking.id;
                const createdAt = booking.createdAt ?? booking.created_at ?? "";
                const firstName = booking.contact?.firstName ?? booking.contact?.first_name ?? "";
                const lastName = booking.contact?.lastName ?? booking.contact?.last_name ?? "";
                const email = booking.contact?.email ?? "";
                const checkIn = booking.checkIn ?? booking.check_in ?? "";
                const checkOut = booking.checkOut ?? booking.check_out ?? "";
                const total = Number(booking.pricing?.total ?? 0);
                const currency = booking.pricing?.currency ?? "GBP";
                const status = booking.status ?? "HELD";

                return (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div className="font-medium">{bookingNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {createdAt ? formatDate(createdAt) : "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {firstName || lastName ? `${firstName} ${lastName}`.trim() : "Guest"}
                      </div>
                      <div className="text-xs text-muted-foreground">{email}</div>
                    </TableCell>
                    <TableCell>
                      {checkIn ? formatDate(checkIn) : "—"} → {checkOut ? formatDate(checkOut) : "—"}
                    </TableCell>
                    <TableCell>{formatMoney(total, currency)}</TableCell>
                    <TableCell>
                      <StatusBadge status={status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm" className="rounded-full">
                        <Link to={`/reservations/${booking.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <PaginationControls page={data?.page ?? 1} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export default ReservationsPage;
