import { useQuery } from "@tanstack/react-query";
import {
  fetchBlogPost,
  fetchBlogPosts,
  fetchCmsPage,
  fetchFaqs,
  fetchOffers,
  fetchPolicyDoc,
  fetchPolicies,
  fetchSiteSettings,
} from "../api/cms.api";

const KEYS = {
  all: ["cms"] as const,
  siteSettings: () => [...KEYS.all, "site-settings"] as const,
  page: (slug: string) => [...KEYS.all, "page", slug] as const,
  blogs: () => [...KEYS.all, "blogs"] as const,
  blog: (slug: string) => [...KEYS.all, "blog", slug] as const,
  faqs: () => [...KEYS.all, "faqs"] as const,
  offers: () => [...KEYS.all, "offers"] as const,
  policy: (key: string) => [...KEYS.all, "policy", key] as const,
  policies: () => [...KEYS.all, "policies"] as const,
};

export function useCmsPage(slug: string) {
  return useQuery({ queryKey: KEYS.page(slug), queryFn: () => fetchCmsPage(slug), retry: false });
}

export function useBlogPosts() {
  return useQuery({ queryKey: KEYS.blogs(), queryFn: fetchBlogPosts, retry: false });
}

export function useBlogPost(slug: string) {
  return useQuery({ queryKey: KEYS.blog(slug), queryFn: () => fetchBlogPost(slug), retry: false });
}

export function useFaqs() {
  return useQuery({ queryKey: KEYS.faqs(), queryFn: fetchFaqs, retry: false });
}

export function useOffers() {
  return useQuery({ queryKey: KEYS.offers(), queryFn: fetchOffers, retry: false });
}

export function usePolicyDoc(key: string) {
  return useQuery({
    queryKey: KEYS.policy(key),
    queryFn: () => fetchPolicyDoc(key),
    retry: false,
  });
}

export function usePolicies() {
  return useQuery({
    queryKey: KEYS.policies(),
    queryFn: fetchPolicies,
    staleTime: 300_000,
    retry: false,
  });
}

export function useSiteSettings() {
  return useQuery({
    queryKey: KEYS.siteSettings(),
    queryFn: fetchSiteSettings,
    staleTime: 300_000,
    retry: false,
  });
}

