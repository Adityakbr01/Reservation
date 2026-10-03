import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { setAccessToken } from "@/lib/auth-token";
import { register } from "../api/register.api";

export function useRegister() {
  return useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      setAccessToken(data.token);
      toast.success("Account created");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
