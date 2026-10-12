import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type {
  EmailTemplateDetail,
  EmailTemplateFilters,
  EmailTemplateListItem,
  EmailTemplatePreview,
  UpdateEmailTemplatePayload,
} from "../types/email-template.types";

const BASE = "/admin/email-templates";

export async function listEmailTemplates(
  filters: EmailTemplateFilters = {},
): Promise<EmailTemplateListItem[]> {
  const params: Record<string, string> = {};
  if (filters.search?.trim()) params.search = filters.search.trim();
  if (filters.category && filters.category !== "all") params.category = filters.category;
  if (filters.status && filters.status !== "all") params.status = filters.status;
  const { data } = await apiClient.get<ApiEnvelope<EmailTemplateListItem[]>>(BASE, { params });
  return data.data;
}

export async function getEmailTemplate(key: string): Promise<EmailTemplateDetail> {
  const response = await apiClient.get<ApiEnvelope<EmailTemplateDetail>>(`${BASE}/${key}`);
  return unwrapResponse(response);
}

export async function updateEmailTemplate(
  key: string,
  payload: UpdateEmailTemplatePayload,
): Promise<EmailTemplateDetail> {
  const response = await apiClient.put<ApiEnvelope<EmailTemplateDetail>>(`${BASE}/${key}`, payload);
  return unwrapResponse(response);
}

export async function previewEmailTemplate(key: string): Promise<EmailTemplatePreview> {
  const response = await apiClient.post<ApiEnvelope<EmailTemplatePreview>>(`${BASE}/${key}/preview`);
  return unwrapResponse(response);
}

export async function renderDraftPreview(
  key: string,
  draft: { subject: string; htmlBody: string; textBody: string },
): Promise<EmailTemplatePreview> {
  const response = await apiClient.post<ApiEnvelope<EmailTemplatePreview>>(
    `${BASE}/${key}/draft-preview`,
    draft,
  );
  return unwrapResponse(response);
}

export async function sendTestEmailTemplate(
  key: string,
  to: string,
): Promise<{ provider: string; providerMessageId: string | null }> {
  const response = await apiClient.post<
    ApiEnvelope<{ provider: string; providerMessageId: string | null }>
  >(`${BASE}/${key}/test`, { to });
  return unwrapResponse(response);
}
