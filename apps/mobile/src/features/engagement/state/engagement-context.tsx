import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";

import { InactivityReminder, PushNotificationItem, SchemeAlert } from "../engagement.types";
import { pushNotificationHandler } from "../services/push-notification-handler";

type EngagementContextValue = {
  latestPush: PushNotificationItem | null;
  inactivityReminder: InactivityReminder | null;
  schemeAlert: SchemeAlert | null;
  dismissSchemeAlert: () => void;
};

const EngagementContext = createContext<EngagementContextValue | null>(null);

export const EngagementProvider = ({ children }: PropsWithChildren) => {
  const [latestPush, setLatestPush] = useState<PushNotificationItem | null>(null);
  const [schemeAlert, setSchemeAlert] = useState<SchemeAlert | null>(null);

  useEffect(() => {
    const unsubscribe = pushNotificationHandler.subscribe((notification) => {
      setLatestPush(notification);
    });
    const schemeTimer = setTimeout(() => {
      setSchemeAlert({
        title: "New Scheme Available",
        body: "Advance orders above Rs 2,000 get extra margin on selected SKUs."
      });
    }, 2200);

    return () => {
      unsubscribe();
      clearTimeout(schemeTimer);
    };
  }, []);

  const inactivityReminder: InactivityReminder = {
    title: "Need to restock?",
    body: "It has been 3 days since your last order. Repeat from history in one tap."
  };

  const value = useMemo<EngagementContextValue>(
    () => ({
      latestPush,
      inactivityReminder,
      schemeAlert,
      dismissSchemeAlert: () => {
        setSchemeAlert(null);
      }
    }),
    [latestPush, schemeAlert]
  );

  return <EngagementContext.Provider value={value}>{children}</EngagementContext.Provider>;
};

export const useEngagement = () => {
  const context = useContext(EngagementContext);

  if (!context) {
    throw new Error("useEngagement must be used within EngagementProvider");
  }

  return context;
};
