import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  source: string | null;
  status: string;
  createdAt: string;
}

export function NewsletterPage() {
  const { data, isPending, refetch } = useQuery({
    queryKey: ["newsletter"],
    queryFn: async () => {
      const r = await apiClient.get<ApiEnvelope<Subscriber[]>>("/admin/newsletter", { params: { page: 1, limit: 100 } });
      const payload = unwrapResponse(r) as unknown as Subscriber[] | { items: Subscriber[] };
      return Array.isArray(payload) ? payload : (payload.items ?? []);
    },
  });

  function exportCsv() {
    const rows = [["email", "name", "source", "status", "createdAt"], ...((data ?? []).map((s) => [s.email, s.name ?? "", s.source ?? "", s.status, s.createdAt]))];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "newsletter.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-light tracking-tight">Newsletter</h1>
          <p className="mt-1 text-sm text-muted-foreground">{(data ?? []).length} subscribers — footer + checkout opt-in feed this list.</p>
        </div>
        <Button variant="outline" className="rounded-full" onClick={exportCsv}>Export CSV</Button>
      </div>
      {isPending ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" aria-label="Loading newsletter" />
      ) : (data ?? []).length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No subscribers yet.<div className="mt-4"><Button variant="outline" className="rounded-full" onClick={() => void refetch()}>Retry</Button></div></CardContent></Card>
      ) : (
        <Card><CardContent className="divide-y divide-border p-0">
          {(data ?? []).map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{s.email}</p><p className="text-xs text-muted-foreground">{s.name ?? "—"} · {s.source ?? "website"} · {s.status}</p></div>
            </div>
          ))}
        </CardContent></Card>
      )}
    </div>
  );
}

export default NewsletterPage;
