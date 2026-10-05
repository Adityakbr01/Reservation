import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiClient, getApiErrorMessage, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";

interface Enquiry {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  fromDate: string | null;
  toDate: string | null;
  partySize: number | null;
  bedrooms: number | null;
  dogFriendly: boolean | null;
  status: string;
  createdAt: string;
}

export function EnquiriesPage() {
  const [q, setQ] = useState("");
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["enquiries", q],
    queryFn: async () => {
      const r = await apiClient.get<ApiEnvelope<Enquiry[]>>("/admin/enquiries", { params: { page: 1, limit: 50, ...(q.trim() ? { q: q.trim() } : {}) } });
      const payload = unwrapResponse(r) as unknown as Enquiry[] | { items: Enquiry[] };
      return Array.isArray(payload) ? payload : (payload.items ?? []);
    },
  });

  const update = useMutation({
    mutationFn: async (vars: { id: string; status: string }) => {
      const r = await apiClient.patch<ApiEnvelope<Enquiry>>(`/admin/enquiries/${vars.id}`, { status: vars.status });
      return unwrapResponse(r);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["enquiries"] });
      toast.success("Enquiry updated");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-light tracking-tight">Enquiries</h1>
        <p className="mt-1 text-sm text-muted-foreground">Holiday enquiries — Title, names, email, telephone, budget, party, bedrooms, dates, location, dog friendly…</p>
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="sm:max-w-xs" />
      {isPending ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" aria-label="Loading enquiries" />
      ) : (data ?? []).length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No enquiries yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {(data ?? []).map((e) => (
            <Card key={e.id}>
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{e.firstName} {e.lastName} · {e.email} · {e.telephone}</p>
                  <p className="text-xs text-muted-foreground">{e.fromDate ?? "?"} → {e.toDate ?? "?"} · {e.partySize ?? "?"} people · {e.bedrooms ?? "?"} bedrooms · {e.dogFriendly == null ? "dog?" : e.dogFriendly ? "dog friendly" : "no dog"} · {e.status}</p>
                </div>
                <div className="flex gap-2">
                  {(["CONTACTED", "BOOKED", "CLOSED"] as const).map((s) => (
                    <Button key={s} variant="outline" size="sm" className="rounded-full" disabled={update.isPending} onClick={() => update.mutate({ id: e.id, status: s })}>{s}</Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default EnquiriesPage;
