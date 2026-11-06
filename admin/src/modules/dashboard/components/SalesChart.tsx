import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

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

/** Compact axis money: ₹800, ₹12k, ₹1.2M (minor units in). */
function axisMoney(minor: number): string {
  const rupees = minor / 100;
  if (rupees >= 1_000_000) return `₹${(rupees / 1_000_000).toFixed(1)}M`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(rupees >= 100_000 ? 0 : 1)}k`;
  return `₹${Math.round(rupees)}`;
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = 10 ** exp;
  const n = value / base;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * base;
}

function dayLabel(start: string, fallback: string): string {
  const date = new Date(start);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * Second-half vs first-half momentum within the visible buckets.
 * Labelled honestly wherever rendered ("vs earlier in range").
 */
export function bucketTrend(buckets: SalesBucket[] = []): { pct: number | null; up: boolean } {
  if (!buckets || buckets.length < 2) return { pct: null, up: true };
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

type SeriesKey = "gross" | "collected" | "refunded";

const SERIES: Array<{ key: SeriesKey; label: string; dot: string }> = [
  { key: "gross", label: "Booked", dot: "bg-brand" },
  { key: "collected", label: "Collected", dot: "bg-emerald-500" },
  { key: "refunded", label: "Refunded", dot: "bg-rose-400" },
];

export function SalesChart({ buckets = [], currency }: { buckets?: SalesBucket[]; currency: string | null }) {
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set());
  const visible = SERIES.filter((s) => !hidden.has(s.key));

  function toggle(key: SeriesKey) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else if (next.size < SERIES.length - 1) {
        // Always keep at least one series visible.
        next.add(key);
      }
      return next;
    });
  }

  const max = niceMax(Math.max(0, ...buckets.map((b) => Math.max(b.gross, b.collected, b.refunded))));
  const hasData = buckets.some((b) => b.gross > 0 || b.collected > 0 || b.refunded > 0);
  const height = 180;
  const labelStep = Math.max(1, Math.ceil(buckets.length / 8));
  const groupW = 44;
  const width = Math.max(buckets.length * groupW, 280);
  const barW = Math.max(5, Math.floor((groupW - 8 - (visible.length - 1) * 3) / Math.max(visible.length, 1)));
  const gridlines = [0.25, 0.5, 0.75, 1];

  return (
    <div>
      {/* Series toggles */}
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Toggle chart series">
        {SERIES.map(({ key, label, dot }) => {
          const off = hidden.has(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={!off}
              onClick={() => toggle(key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                off ? "opacity-45" : "hover:bg-surface-2",
              )}
            >
              <span className={cn("inline-block size-2.5 rounded-full", dot)} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      {!hasData ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No sales in this range yet.
        </p>
      ) : (
        <div className="overflow-x-auto" role="img" aria-label="Sales by period chart">
          <svg width={width} height={height + 30} className="min-w-full">
            <defs>
              <linearGradient id="sales-gross" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c9a86a" />
                <stop offset="100%" stopColor="#8a6d3b" />
              </linearGradient>
              <linearGradient id="sales-collected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="sales-refunded" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#e11d48" />
              </linearGradient>
            </defs>
            {gridlines.map((frac) => {
              const y = height - frac * height;
              return (
                <g key={frac}>
                  <line x1={0} x2={width} y1={y} y2={y} className="stroke-border" strokeDasharray="3 4" />
                  <text x={2} y={y - 4} fontSize={10} className="fill-muted-foreground">
                    {axisMoney(max * frac)}
                  </text>
                </g>
              );
            })}
            {buckets.map((bucket, i) => {
              const values: Array<{ key: SeriesKey; value: number; fill: string; name: string }> = [
                { key: "gross" as SeriesKey, value: bucket.gross, fill: "url(#sales-gross)", name: "booked" },
                { key: "collected" as SeriesKey, value: bucket.collected, fill: "url(#sales-collected)", name: "collected" },
                { key: "refunded" as SeriesKey, value: bucket.refunded, fill: "url(#sales-refunded)", name: "refunded" },
              ].filter((v) => !hidden.has(v.key));
              const totalW = values.length * barW + (values.length - 1) * 3;
              const x0 = i * groupW + (groupW - totalW) / 2;
              return (
                <g key={bucket.start} className="group">
                  {values.map((v, j) => {
                    const h = Math.round((v.value / max) * height);
                    return (
                      <rect
                        key={v.key}
                        x={x0 + j * (barW + 3)}
                        y={height - h}
                        width={barW}
                        height={Math.max(h, 2)}
                        rx={3}
                        fill={v.fill}
                        className="opacity-90 transition-opacity group-hover:opacity-100"
                      >
                        <title>
                          {dayLabel(bucket.start, bucket.label)}: {v.name} {money(v.value, currency)}
                        </title>
                      </rect>
                    );
                  })}
                  {i % labelStep === 0 && (
                    <text
                      x={i * groupW + groupW / 2}
                      y={height + 18}
                      fontSize={10}
                      textAnchor="middle"
                      className="fill-muted-foreground"
                    >
                      {dayLabel(bucket.start, bucket.label)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
