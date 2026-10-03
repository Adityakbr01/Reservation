import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { login } from "../api/login.api";

export function useLogin() {
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      localStorage.setItem("access_token", data.token);
      toast.success("Logged in successfully");
    },
    onError: () => {
      toast.error("Login failed");
    },
  });
}
