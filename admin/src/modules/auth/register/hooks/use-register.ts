import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { register } from "../api/register.api";

export function useRegister() {
  return useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      localStorage.setItem("access_token", data.token);
      toast.success("Account created");
    },
    onError: () => {
      toast.error("Registration failed");
    },
  });
}
