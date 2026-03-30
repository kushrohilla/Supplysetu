import { apiClient } from "@/services/api/api-client";

import type { PushNotificationItem } from "../engagement.types";

type LatestNotificationResponse = {
  id: string;
  event_type: string;
  title: string;
  body: string;
  created_at: string;
  status: string;
} | null;

export const notificationsApi = {
  async fetchLatestInAppNotification(): Promise<PushNotificationItem | null> {
    const response = await apiClient.request<LatestNotificationResponse>("/notifications/in-app/latest");

    if (!response) {
      return null;
    }

    return {
      id: response.id,
      title: response.title,
      body: response.body,
      createdAt: response.created_at,
    };
  },
};
