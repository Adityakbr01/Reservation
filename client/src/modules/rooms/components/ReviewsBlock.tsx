import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { submitReview } from "@/modules/reviews/api/reviews.api";

export interface ReviewsBlockProps {
  roomTypeId: string;
  reviewsQuery: ReturnType<typeof useQuery>;
}

export function ReviewsBlock({ roomTypeId, reviewsQuery }: ReviewsBlockProps) {
  const queryClient = useQueryClient();
  const data = (reviewsQuery.data ?? { items: [], average: 0, count: 0 }) as {
    items: Array<{
      id: string;
      authorName: string;
      rating: number;
      title: string | null;
      body: string;
    }>;
    average: number;
    count: number;
  };
  const [rating, setRating] = useState("5");
  const [body, setBody] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      submitReview({ roomTypeId, rating: Number(rating), body: body.trim() }),
    onSuccess: () => {
      setBody("");
      void queryClient.invalidateQueries({ queryKey: ["reviews", roomTypeId] });
      toast.success(
        "Review submitted for moderation — only completed stays are eligible",
      );
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error
          ? e.message
          : "Only guests with a completed stay can review",
      ),
  });

  return (
    <div className="space-y-3">
      <h2 className="font-display text-2xl font-medium tracking-tight">
        Reviews{" "}
        {data.count > 0 ? (
          <span className="font-display text-base italic text-muted-foreground">
            · {data.average} ★ ({data.count})
          </span>
        ) : (
          <span className="font-display text-base italic text-muted-foreground">
            · Be the first to review
          </span>
        )}
      </h2>
      {reviewsQuery.isPending ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No reviews yet — only guests with a completed stay can leave one.
        </p>
      ) : (
        <div className="grid gap-3">
          {data.items.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <p className="text-sm font-medium">
                  {r.authorName} · {"★".repeat(r.rating)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.title ? `${r.title} — ` : ""}
                  {r.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="grid gap-2 rounded-xl border border-border p-4">
        <p className="text-sm font-medium">
          Write a review (completed stays only)
        </p>
        <div className="flex gap-2">
          <div className="space-y-1">
            <Label htmlFor="rev-rating">Rating</Label>
            <Input
              id="rev-rating"
              type="number"
              min={1}
              max={5}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-24"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rev-body">Review</Label>
          <textarea
            id="rev-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="flex min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="How was your stay?"
          />
        </div>
        <Button
          className="w-fit rounded-full"
          disabled={mutation.isPending || body.trim().length < 4}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Submitting…" : "Submit review"}
        </Button>
      </div>
    </div>
  );
}

export default ReviewsBlock;
