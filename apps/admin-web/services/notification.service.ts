import { apiService } from "@/services/api.service";
import type { NotificationChannel, NotificationEventType, NotificationLogListResponse, NotificationStatus } from "@/types/notification";

export const notificationService = {
  async fetchNotificationLog(filters: {
    eventType?: NotificationEventType;
    channel?: NotificationChannel;
    status?: NotificationStatus;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();

    if (filters.eventType) {
      searchParams.set("event_type", filters.eventType);
    }
    if (filters.channel) {
      searchParams.set("channel", filters.channel);
    }
    if (filters.status) {
      searchParams.set("status", filters.status);
    }
    if (filters.page) {
      searchParams.set("page", String(filters.page));
    }
    if (filters.limit) {
      searchParams.set("limit", String(filters.limit));
    }

    const query = searchParams.toString();

    return apiService.request<NotificationLogListResponse>(`/admin/notifications/log${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  },
};
