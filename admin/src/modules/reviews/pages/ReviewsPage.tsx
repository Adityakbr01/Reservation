import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient, getApiErrorMessage, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";

interface Review {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  isVerified: boolean;
  isAdminCreated: boolean;
  createdAt: string;
}

export function ReviewsPage() {
  const queryClient = useQueryClient();
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState("5");
  const [body, setBody] = useState("");
  const [roomTypeId, setRoomTypeId] = useState("");

  const { data, isPending } = useQuery({
    queryKey: ["reviews-admin"],
    queryFn: async () => {
      const r = await apiClient.get<ApiEnvelope<Review[]>>("/admin/reviews", { params: { page: 1, limit: 50 } });
      const payload = unwrapResponse(r) as unknown as Review[] | { items: Review[] };
      return Array.isArray(payload) ? payload : (payload.items ?? []);
    },
  });

  const moderate = useMutation({
    mutationFn: async (vars: { id: string; status: string }) => {
      const r = await apiClient.patch<ApiEnvelope<Review>>(`/admin/reviews/${vars.id}`, { status: vars.status });
      return unwrapResponse(r);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reviews-admin"] });
      toast.success("Review moderated");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const createFake = useMutation({
    mutationFn: async () => {
      const r = await apiClient.post<ApiEnvelope<Review>>("/admin/reviews", {
        roomTypeId,
        authorName: authorName.trim(),
        rating: Number(rating),
        body: body.trim(),
        status: "PUBLISHED",
      });
      return unwrapResponse(r);
    },
    onSuccess: () => {
      setAuthorName("");
      setBody("");
      void queryClient.invalidateQueries({ queryKey: ["reviews-admin"] });
      toast.success("Fake review published (marked admin-created)");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-light tracking-tight">Reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">Guests can review after CHECKED_OUT · admin can publish manual reviews too.</p>
      </div>
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rv-room">Room type ID</Label>
            <Input id="rv-room" value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)} placeholder="Paste room-type id" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rv-author">Author name</Label>
            <Input id="rv-author" value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Sarah J." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rv-rating">Rating 1–5</Label>
            <Input id="rv-rating" type="number" min={1} max={5} value={rating} onChange={(e) => setRating(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="rv-body">Review</Label>
            <textarea id="rv-body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="flex min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Lovely stay…" />
          </div>
          <div className="sm:col-span-2">
            <Button className="rounded-full" disabled={createFake.isPending || !roomTypeId || !authorName.trim() || body.trim().length < 4} onClick={() => createFake.mutate()}>
              {createFake.isPending ? "Publishing…" : "Publish manual review"}
            </Button>
          </div>
        </CardContent>
      </Card>
      {isPending ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" aria-label="Loading reviews" />
      ) : (
        <div className="grid gap-3">
          {(data ?? []).map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{r.authorName} · {"★".repeat(r.rating)} · {r.status}{r.isAdminCreated ? " · manual" : ""}{r.isVerified ? " · verified" : ""}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{r.title ? `${r.title} — ` : ""}{r.body}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => moderate.mutate({ id: r.id, status: "PUBLISHED" })}>Publish</Button>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => moderate.mutate({ id: r.id, status: "REJECTED" })}>Reject</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReviewsPage;
