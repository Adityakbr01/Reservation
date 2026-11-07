import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/auth-store";
import { userKeys } from "@/lib/query-keys";

/** Shared sign-out: clears session + server cache, then lands on login. */
export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((s) => s.clearSession);

  return () => {
    clearSession();
    queryClient.removeQueries({ queryKey: userKeys.all });
    void queryClient.clear();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  };
}
