import { apiClient, publicApiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";

export interface Review {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  isVerified: boolean;
  createdAt: string;
}

export async function fetchReviews(roomTypeId: string, page = 1): Promise<{ items: Review[]; average: number; count: number }> {
  const r = await publicApiClient.get<ApiEnvelope<Review[]>>("/public/reviews", { params: { roomTypeId, page, limit: 20 } });
  const items = unwrapResponse(r);
  const meta = (r.data.meta ?? {}) as { average?: number; count?: number };
  return { items, average: meta.average ?? 0, count: meta.count ?? items.length };
}

export async function submitReview(input: { roomTypeId: string; bookingId?: string; rating: number; title?: string | null; body: string }): Promise<Review> {
  const r = await apiClient.post<ApiEnvelope<Review>>("/reviews", input);
  return unwrapResponse(r);
}
