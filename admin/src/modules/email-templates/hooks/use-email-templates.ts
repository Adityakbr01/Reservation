import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { emailTemplateKeys } from "@/lib/query-keys";
import {
  deleteEmailTemplate,
  getEmailTemplate,
  listEmailTemplates,
  previewEmailTemplate,
  sendTestEmailTemplate,
  updateEmailTemplate,
} from "../api/email-templates.api";
import type {
  EmailTemplateFilters,
  UpdateEmailTemplatePayload,
} from "../types/email-template.types";

export function useEmailTemplates(filters: EmailTemplateFilters) {
  return useQuery({
    queryKey: emailTemplateKeys.list(filters),
    queryFn: () => listEmailTemplates(filters),
  });
}

export function useEmailTemplate(key: string) {
  return useQuery({
    queryKey: emailTemplateKeys.detail(key),
    queryFn: () => getEmailTemplate(key),
    // Template editing must always open on fresh server data — a stale
    // cache entry here looks exactly like "my saved data is gone".
    staleTime: 0,
  });
}

export function useUpdateEmailTemplate(key: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateEmailTemplatePayload) => updateEmailTemplate(key, payload),
    onSuccess: (detail) => {
      queryClient.setQueryData(emailTemplateKeys.detail(key), detail);
      // Re-read from the server too, so the editor provably agrees with
      // what was persisted (sanitizer may normalize the HTML on save).
      void queryClient.invalidateQueries({ queryKey: emailTemplateKeys.detail(key) });
      void queryClient.invalidateQueries({ queryKey: emailTemplateKeys.all });
      toast.success("Template saved");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useDeleteEmailTemplate(key: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteEmailTemplate(key),
    onSuccess: (detail) => {
      queryClient.setQueryData(emailTemplateKeys.detail(key), detail);
      void queryClient.invalidateQueries({ queryKey: emailTemplateKeys.detail(key) });
      void queryClient.invalidateQueries({ queryKey: emailTemplateKeys.all });
      toast.success("Template reset to default");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function usePreviewEmailTemplate() {
  return useMutation({
    mutationFn: (key: string) => previewEmailTemplate(key),
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useSendTestEmailTemplate() {
  return useMutation({
    mutationFn: ({ key, to }: { key: string; to: string }) => sendTestEmailTemplate(key, to),
    onSuccess: () => {
      toast.success("Test email sent");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
