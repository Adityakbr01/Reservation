import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { userKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { login } from "../api/login.api";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      useAuthStore.getState().setSession(data.user, data.token);
      queryClient.setQueryData(userKeys.all, data.user);
      toast.success("Logged in successfully");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
