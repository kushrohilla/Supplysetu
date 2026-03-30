import { notificationsApi } from "../api/notifications-api";
import { PushNotificationItem } from "../engagement.types";

type PushNotificationListener = (notification: PushNotificationItem) => void;

export const pushNotificationHandler = {
  subscribe(listener: PushNotificationListener) {
    let disposed = false;
    let lastSeenId: string | null = null;

    const loadLatestNotification = async () => {
      try {
        const notification = await notificationsApi.fetchLatestInAppNotification();
        if (!notification || disposed || notification.id === lastSeenId) {
          return;
        }

        lastSeenId = notification.id;
        listener(notification);
      } catch {
        // Keep the mobile UX resilient even when notification fetch fails.
      }
    };

    void loadLatestNotification();
    const timer = setInterval(() => {
      void loadLatestNotification();
    }, 60000);

    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }
};
