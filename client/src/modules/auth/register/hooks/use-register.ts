import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { register } from "../api/register.api";

export function useRegister() {
  return useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      useAuthStore.getState().setSession(data.user, data.token);
      toast.success("Account created");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
