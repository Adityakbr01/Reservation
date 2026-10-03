import { Link } from "react-router-dom";
import { BedDouble, Building2, CalendarDays, Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlocks } from "@/modules/availability";
import { useRatePlans } from "@/modules/rate-plans";
import { useRoomTypes } from "@/modules/room-types";
import { useRooms } from "@/modules/rooms";

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
