import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { setAccessToken } from "@/lib/auth-token";
import { login } from "../api/login.api";

export function useLogin() {
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAccessToken(data.token);
      toast.success("Logged in successfully");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
