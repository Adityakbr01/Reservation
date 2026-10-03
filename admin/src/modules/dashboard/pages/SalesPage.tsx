import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/StatusBadge";
import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import { dashboardKeys } from "@/lib/query-keys";
import { SalesChart, bucketTrend, money, TrendChip } from "../components/SalesChart";
import type { SalesBucket } from "../components/SalesChart";

export type SalesRange = "today" | "week" | "month";

export interface SalesReport {
  range: SalesRange;
  currency: string | null;
  bookingsCount: number;
  grossValue: number;
  collected: number;
  refunded: number;
  netCollected: number;
  occupancyNights: number;
  buckets: SalesBucket[];
  byRoomType: Array<{ roomTypeId: string; name: string; bookings: number; gross: number }>;
  recent: Array<{
    id: string;
    bookingNumber: string;
    guest: string;
    checkIn: string;
    checkOut: string;
    total: number;
    currency: string;
    status: string;
    paymentStatus: string;
  }>;
}

const RANGES: Array<{ value: SalesRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "week", label: "7 days" },
  { value: "month", label: "30 days" },
];

export function SalesPage() {
  const [range, setRange] = useState<SalesRange>("week");
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: [...dashboardKeys.summary(), "sales", range] as const,
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<SalesReport>>("/admin/dashboard/sales", {
        params: { range },
      });
      return unwrapResponse(response);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">Sales</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Booked value, collections, refunds, and recent purchases
          </p>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Sales range">
          {RANGES.map(({ value, label }) => (
            <Button
              key={value}
              role="tab"
              aria-selected={range === value}
              variant={range === value ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setRange(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading sales">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : isError || !data ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load sales.</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Booked value", value: money(data.grossValue, data.currency) },
              { label: "Collected", value: money(data.collected, data.currency) },
              { label: "Refunded", value: money(data.refunded, data.currency) },
              { label: "Net collected", value: money(data.netCollected, data.currency) },
              { label: "Bookings", value: String(data.bookingsCount) },
              { label: "Room nights", value: String(data.occupancyNights) },
            ].map(({ label, value }) => (
              <Card key={label} className="shadow-card">
                <CardContent className="space-y-1 p-6">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="font-display text-3xl font-light">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xl">Booked vs collected</CardTitle>
              <TrendChip pct={bucketTrend(data.buckets).pct} />
            </CardHeader>
            <CardContent>
              <SalesChart buckets={data.buckets} currency={data.currency} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">By room type</CardTitle>
              </CardHeader>
              <CardContent>
                {data.byRoomType.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sales in this range.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Bookings</TableHead>
                        <TableHead className="text-right">Gross</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.byRoomType.map((row) => (
                        <TableRow key={row.roomTypeId}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-right">{row.bookings}</TableCell>
                          <TableCell className="text-right">
                            {money(row.gross, data.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Recent purchases</CardTitle>
              </CardHeader>
              <CardContent>
                {data.recent.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No confirmed bookings yet.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.recent.map((purchase) => (
                      <li key={purchase.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {purchase.bookingNumber} · {purchase.guest}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {money(purchase.total, purchase.currency)}
                          </p>
                        </div>
                        <StatusBadge status={purchase.paymentStatus} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default SalesPage;
