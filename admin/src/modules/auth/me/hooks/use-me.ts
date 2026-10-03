import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { userKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { changePassword, fetchMe, updateMe } from "../api/me.api";

export function useMe(enabled = true) {
  return useQuery({ queryKey: userKeys.all, queryFn: fetchMe, enabled, retry: false });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMe,
    onSuccess: (data) => {
      useAuthStore.getState().setUser(data);
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success("Profile updated");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success("Password changed");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
