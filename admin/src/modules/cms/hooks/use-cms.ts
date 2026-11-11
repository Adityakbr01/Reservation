import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { cmsKeys } from "@/lib/query-keys";
import {
  createBlog,
  createFaq,
  createOffer,
  createPage,
  deleteFaq,
  deletePolicy,
  getBlog,
  getOffer,
  getPage,
  listBlogs,
  listFaqs,
  listOffers,
  listPages,
  listPolicies,
  setBlogStatus,
  setFaqStatus,
  setOfferStatus,
  setPageStatus,
  setPolicyStatus,
  updateBlog,
  updateFaq,
  updateOffer,
  updatePage,
  upsertPolicy,
} from "../api/cms.api";
import type { CmsFilters, ContentStatus } from "../types/cms.types";

function statusMutation(
  fn: (id: string, version: number, to: ContentStatus) => Promise<void>,
  label: string,
) {
  return () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, version, to }: { id: string; version: number; to: ContentStatus }) =>
        fn(id, version, to),
      onSuccess: (_d, vars) => {
        void queryClient.invalidateQueries({ queryKey: cmsKeys.all });
        toast.success(`${label} → ${vars.to}`);
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };
}

export const useSetPageStatus = statusMutation(setPageStatus, "Page");
export const useSetBlogStatus = statusMutation(setBlogStatus, "Post");
export const useSetFaqStatus = statusMutation(setFaqStatus, "FAQ");
export const useSetOfferStatus = statusMutation(setOfferStatus, "Offer");

export function usePages(f: CmsFilters) {
  return useQuery({ queryKey: cmsKeys.pages(f), queryFn: () => listPages(f) });
}
export function usePage(id: string) {
  return useQuery({
    queryKey: [...cmsKeys.pages({}), id] as const,
    queryFn: () => getPage(id),
    enabled: id.length > 0,
  });
}
export function useBlog(id: string) {
  return useQuery({
    queryKey: [...cmsKeys.blogs({}), id] as const,
    queryFn: () => getBlog(id),
    enabled: id.length > 0,
  });
}
export function useOffer(id: string) {
  return useQuery({
    queryKey: [...cmsKeys.offers({}), id] as const,
    queryFn: () => getOffer(id),
    enabled: id.length > 0,
  });
}
export function useBlogs(f: CmsFilters) {
  return useQuery({ queryKey: cmsKeys.blogs(f), queryFn: () => listBlogs(f) });
}
export function useFaqs(f: CmsFilters) {
  return useQuery({ queryKey: cmsKeys.faqs(f), queryFn: () => listFaqs(f) });
}
export function useOffers(f: CmsFilters) {
  return useQuery({ queryKey: cmsKeys.offers(f), queryFn: () => listOffers(f) });
}
export function usePolicies() {
  return useQuery({ queryKey: cmsKeys.policies(), queryFn: listPolicies });
}

export function useSavePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: object }) =>
      id ? updatePage(id, payload) : createPage(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.all });
      toast.success("Page saved");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useSaveBlog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: object }) =>
      id ? updateBlog(id, payload) : createBlog(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.all });
      toast.success("Post saved");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useSaveFaq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: object }) =>
      id ? updateFaq(id, payload) : createFaq(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.all });
      toast.success("FAQ saved");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDeleteFaq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFaq(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.all });
      toast.success("FAQ deleted");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useSaveOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: object }) =>
      id ? updateOffer(id, payload) : createOffer(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.all });
      toast.success("Offer saved");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useSavePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: object) => upsertPolicy(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.all });
      toast.success("Policy saved");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useSetPolicyStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, to }: { key: string; to: ContentStatus }) => setPolicyStatus(key, to),
    onSuccess: (_d, vars) => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.all });
      toast.success(`Policy → ${vars.to}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDeletePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => deletePolicy(key),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.all });
      toast.success("Policy deleted successfully");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
