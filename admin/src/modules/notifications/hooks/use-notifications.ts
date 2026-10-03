import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { notificationKeys } from "@/lib/query-keys";
import { listNotifications, retryNotification } from "../api/notifications.api";
import type { NotificationFilters } from "../types/notification.types";

export function useNotifications(filters: NotificationFilters) {
  return useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: () => listNotifications(filters),
  });
}

export function useRetryNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => retryNotification(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      toast.success("Notification requeued");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
