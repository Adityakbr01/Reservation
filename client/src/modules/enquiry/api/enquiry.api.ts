import { publicApiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";

export interface EnquiryInput {
  title?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  holidayBudget?: string | null;
  partySize?: number | null;
  bedrooms?: number | null;
  fromDate?: string | null;
  toDate?: string | null;
  specificLocation?: string | null;
  dogFriendly?: boolean | null;
  details?: string | null;
  roomTypeId?: string | null;
}

export async function submitEnquiry(input: EnquiryInput): Promise<unknown> {
  const r = await publicApiClient.post<ApiEnvelope<unknown>>("/public/enquiries", input);
  return unwrapResponse(r);
}

export async function subscribeNewsletter(email: string, name?: string | null, source?: string): Promise<unknown> {
  const r = await publicApiClient.post<ApiEnvelope<unknown>>("/public/newsletter/subscribe", { email, name: name ?? null, source: source ?? "website" });
  return unwrapResponse(r);
}
