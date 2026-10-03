export type NotificationStatus = "QUEUED" | "PROCESSING" | "SENT" | "FAILED";

export interface AdminNotification {
  id: string;
  type: string;
  recipient: string;
  bookingId: string | null;
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface NotificationFilters {
  page: number;
  limit: number;
  status?: NotificationStatus;
  type?: string;
}
