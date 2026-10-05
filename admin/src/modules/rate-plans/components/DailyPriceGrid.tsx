import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient, getApiErrorMessage, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";

function monthBounds(offset: number): { from: string; to: string; label: string } {
  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return {
    from: `${y}-${pad(m + 1)}-01`,
    to: `${y}-${pad(m + 1)}-${last}`,
    label: base.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

function toMajor(minor: number): string {
  return String(minor / 100);
}

export function DailyPriceGrid({ ratePlanId, basePrice, currency }: { ratePlanId: string; basePrice: number; currency: string }) {
  const [offset, setOffset] = useState(0);
  const bounds = monthBounds(offset);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const { data, isPending } = useQuery({
    queryKey: ["daily-prices", ratePlanId, bounds.from, bounds.to],
    queryFn: async () => {
      const r = await apiClient.get<ApiEnvelope<Array<{ date: string; price: number }>>>(
        `/admin/rate-plans/${ratePlanId}/prices`,
        { params: { from: bounds.from, to: bounds.to } },
      );
      return unwrapResponse(r);
    },
  });

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const row of data ?? []) next[row.date] = toMajor(row.price);
    setDraft(next);
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const prices = Object.entries(draft)
        .filter(([, v]) => v.trim() !== "")
        .map(([date, v]) => ({ date, price: Math.max(0, Math.round(Number(v) * 100) || 0) }));
      if (prices.length === 0) throw new Error("Enter at least one price");
      const r = await apiClient.put<ApiEnvelope<unknown>>(`/admin/rate-plans/${ratePlanId}/prices`, {
        prices,
        currency,
      });
      return unwrapResponse(r);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["daily-prices", ratePlanId] });
      toast.success("Daily prices saved — search, quote and totals now use them");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : getApiErrorMessage(e)),
  });

  const days: string[] = [];
  {
    const [y, m] = bounds.from.split("-").map(Number) as [number, number];
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const pad = (n: number) => String(n).padStart(2, "0");
    for (let d = 1; d <= last; d += 1) days.push(`${y}-${pad(m)}-${pad(d)}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Date-wise prices — {bounds.label}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Base {toMajor(basePrice)} {currency} applies when a day is empty. Totals sum these nightly prices.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={offset <= 0} onClick={() => setOffset((o) => o - 1)}>← Prev</Button>
          <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={offset >= 11} onClick={() => setOffset((o) => o + 1)}>Next →</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => {
            const next: Record<string, string> = {};
            for (const d of days) next[d] = toMajor(basePrice);
            setDraft(next);
          }}>Fill base</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setDraft({})}>Clear</Button>
        </div>
        {isPending ? (
          <div className="h-32 animate-pulse rounded-xl bg-muted" aria-label="Loading prices" />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {days.map((day) => (
              <div key={day} className="space-y-1 rounded-lg border border-border p-2">
                <Label htmlFor={`dp-${day}`} className="text-xs text-muted-foreground">{day.slice(8)}/{day.slice(5, 7)}</Label>
                <Input
                  id={`dp-${day}`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft[day] ?? ""}
                  onChange={(e) => setDraft((p) => ({ ...p, [day]: e.target.value }))}
                  placeholder={toMajor(basePrice)}
                />
              </div>
            ))}
          </div>
        )}
        <Button type="button" className="rounded-full" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Saving…" : "Save month"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default DailyPriceGrid;
