import { formatMoney } from "@/lib/money";

export interface SalesBucket {
  label: string;
  start: string;
  bookings: number;
  gross: number;
  collected: number;
  refunded: number;
}

export function money(minor: number, currency: string | null): string {
  if (currency) return formatMoney(minor, currency);
  return `₹${(minor / 100).toFixed(2)}`;
}

/**
 * Second-half vs first-half momentum within the visible buckets.
 * Labelled honestly wherever rendered ("vs earlier in range").
 */
export function bucketTrend(buckets: SalesBucket[]): { pct: number | null; up: boolean } {
  if (buckets.length < 2) return { pct: null, up: true };
  const mid = Math.floor(buckets.length / 2);
  const first = buckets.slice(0, mid).reduce((s, b) => s + b.gross, 0);
  const second = buckets.slice(mid).reduce((s, b) => s + b.gross, 0);
  if (first <= 0) return { pct: second > 0 ? 100 : null, up: second >= 0 };
  return { pct: Math.round(((second - first) / first) * 100), up: second >= first };
}

export function TrendChip({ pct, invert = false }: { pct: number | null; invert?: boolean }) {
  if (pct === null) return <span className="text-xs text-muted-foreground">—</span>;
  const good = invert ? pct <= 0 : pct >= 0;
  return (
    <span
      className={
        good
          ? "inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
          : "inline-flex items-center gap-0.5 text-xs font-semibold text-destructive"
      }
      aria-label={`${pct >= 0 ? "up" : "down"} ${Math.abs(pct)} percent`}
    >
      <span aria-hidden>{pct >= 0 ? "▲" : "▼"}</span> {Math.abs(pct)}%
    </span>
  );
}

export function SalesChart({ buckets, currency }: { buckets: SalesBucket[]; currency: string | null }) {
  const max = Math.max(1, ...buckets.map((b) => Math.max(b.gross, b.collected)));
  const width = Math.max(buckets.length * 36, 280);
  const height = 180;
  const barW = Math.max(6, Math.floor((width / buckets.length - 10) / 2));
  return (
    <div className="overflow-x-auto" role="img" aria-label="Sales by period chart">
      <svg width={width} height={height + 28} className="min-w-full">
        {buckets.map((bucket, i) => {
          const x = i * (width / buckets.length) + 5;
          const grossH = Math.round((bucket.gross / max) * height);
          const collH = Math.round((bucket.collected / max) * height);
          return (
            <g key={bucket.start}>
              <rect
                x={x}
                y={height - grossH}
                width={barW}
                height={Math.max(grossH, 2)}
                rx={3}
                className="fill-brand/70"
              >
                <title>
                  {bucket.label}: booked {money(bucket.gross, currency)}
                </title>
              </rect>
              <rect
                x={x + barW + 2}
                y={height - collH}
                width={barW}
                height={Math.max(collH, 2)}
                rx={3}
                className="fill-emerald-500/80"
              >
                <title>
                  {bucket.label}: collected {money(bucket.collected, currency)}
                </title>
              </rect>
              <text x={x} y={height + 16} fontSize={10} className="fill-muted-foreground">
                {bucket.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-3 rounded-sm bg-brand/70" /> Booked
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-3 rounded-sm bg-emerald-500/80" /> Collected
        </span>
      </div>
    </div>
  );
}
