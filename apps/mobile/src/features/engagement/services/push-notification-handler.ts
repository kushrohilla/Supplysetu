import { PushNotificationItem } from "../engagement.types";

type PushNotificationListener = (notification: PushNotificationItem) => void;

export const pushNotificationHandler = {
  subscribe(listener: PushNotificationListener) {
    const timer = setTimeout(() => {
      listener({
        id: "push-1",
        title: "Delivery update",
        body: "Your latest order is dispatched and on route.",
        createdAt: "2026-03-13T19:30:00Z"
      });
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }
};
