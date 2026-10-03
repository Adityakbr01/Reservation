import { Link } from "react-router-dom";
import { BedDouble, Building2, CalendarDays, CircleAlert, Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlocks } from "@/modules/availability";
import { useRatePlans } from "@/modules/rate-plans";
import { useRoomTypes } from "@/modules/room-types";
import { useRooms } from "@/modules/rooms";
import { formatMoney } from "@/lib/money";
import { useDashboardSummary } from "../hooks/use-dashboard-summary";

const QUICK_ACTIONS = [
  { to: "/room-types/new", label: "New room type" },
  { to: "/rooms/new", label: "New room" },
  { to: "/rate-plans/new", label: "New rate plan" },
  { to: "/availability", label: "Block dates" },
];

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function DashboardPage() {
  const types = useRoomTypes({ page: 1, limit: 1 });
  const rooms = useRooms({ page: 1, limit: 1 });
  const plans = useRatePlans({ page: 1, limit: 1 });
  const blocks = useBlocks({ page: 1, limit: 5 });
  const summary = useDashboardSummary();

  const stats = [
    { label: "Room types", to: "/room-types", Icon: Building2, value: types.data?.total },
    { label: "Physical rooms", to: "/rooms", Icon: BedDouble, value: rooms.data?.total },
    { label: "Rate plans", to: "/rate-plans", Icon: Tags, value: plans.data?.total },
    { label: "Active blocks", to: "/availability", Icon: CalendarDays, value: blocks.data?.total },
  ];
  const loading = types.isPending || rooms.isPending || plans.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Single property · live inventory snapshot
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, to, Icon, value }) => (
          <Card key={label} className="shadow-card">
            <CardContent className="space-y-2 p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Icon className="size-4 text-brand" aria-hidden />
              </div>
              {value === undefined ? (
                <Skeleton className="h-9 w-16" aria-label={`Loading ${label}`} />
              ) : (
                <p className="font-display text-4xl font-light">{value}</p>
              )}
              <Link
                to={to}
                className="inline-block text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                View →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">Today&apos;s operations</CardTitle>
            <CardDescription>Live booking desk snapshot</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.isPending ? (
              <div className="space-y-2" aria-busy="true" aria-label="Loading operations">
                {[0, 1].map((row) => (
                  <Skeleton key={row} className="h-12 w-full" />
                ))}
              </div>
            ) : summary.isError || !summary.data ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Operations snapshot unavailable.
              </p>
            ) : (
              <dl className="divide-y divide-border text-sm">
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Arrivals today</dt>
                  <dd className="font-semibold">{summary.data.todayArrivals}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Departures today</dt>
                  <dd className="font-semibold">{summary.data.todayDepartures}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">In-house guests</dt>
                  <dd className="font-semibold">{summary.data.currentGuests}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Upcoming reservations</dt>
                  <dd className="font-semibold">{summary.data.upcomingReservations}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Awaiting payment</dt>
                  <dd className="font-semibold">{summary.data.pendingPayments}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Today&apos;s booking value</dt>
                  <dd className="font-semibold">
                    {summary.data.todayBookingCurrency
                      ? formatMoney(
                          summary.data.todayBookingValue,
                          summary.data.todayBookingCurrency,
                        )
                      : "—"}
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CircleAlert className="size-5 text-brand" aria-hidden />
              Needs attention
            </CardTitle>
            <CardDescription>Failures and stuck work, with deep links</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.isPending ? (
              <div className="space-y-2" aria-busy="true" aria-label="Loading alerts">
                <Skeleton className="h-12 w-full" />
              </div>
            ) : summary.isError || !summary.data ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Alerts unavailable.</p>
            ) : (
              <ul className="divide-y divide-border">
                <li className="flex items-center justify-between py-3">
                  <p className="text-sm">
                    Payment failures (24h) ·{" "}
                    <strong>{summary.data.paymentFailures24h}</strong>
                  </p>
                  <Link
                    to="/payments"
                    className="text-sm font-medium text-brand hover:text-brand-dark"
                  >
                    Review
                  </Link>
                </li>
                <li className="flex items-center justify-between py-3">
                  <p className="text-sm">
                    Pending refunds · <strong>{summary.data.pendingRefunds}</strong>
                  </p>
                  <Link
                    to="/reservations"
                    className="text-sm font-medium text-brand hover:text-brand-dark"
                  >
                    Review
                  </Link>
                </li>
                <li className="flex items-center justify-between py-3">
                  <p className="text-sm">
                    Failed emails · <strong>{summary.data.failedNotifications}</strong>
                  </p>
                  <Link
                    to="/notifications"
                    className="text-sm font-medium text-brand hover:text-brand-dark"
                  >
                    Review
                  </Link>
                </li>
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">Quick actions</CardTitle>
            <CardDescription>Common operations, one tap away</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {QUICK_ACTIONS.map(({ to, label }) => (
              <Button key={to} asChild variant="outline" className="justify-start rounded-full">
                <Link to={to}>
                  <Plus aria-hidden />
                  {label}
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-xl">Latest blocks</CardTitle>
            <CardDescription>Most recent manual availability blocks</CardDescription>
          </CardHeader>
          <CardContent>
            {blocks.isPending ? (
              <div className="space-y-2" aria-busy="true" aria-label="Loading blocks">
                {[0, 1].map((row) => (
                  <Skeleton key={row} className="h-12 w-full" />
                ))}
              </div>
            ) : (blocks.data?.items.length ?? 0) === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No blocks — every room is sellable unless booked.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {blocks.data?.items.map((block) => (
                  <li key={block.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">
                        {formatDate(block.startDate)} → {formatDate(block.endDate)}
                      </p>
                      {block.reason && (
                        <p className="text-xs text-muted-foreground">{block.reason}</p>
                      )}
                    </div>
                    <Link
                      to="/availability"
                      className="text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      Manage
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {loading && <p className="sr-only">Loading dashboard figures…</p>}
    </div>
  );
}

export default DashboardPage;
