import { View } from "react-native";

import { AppText } from "@/shared/components/ui/app-text";
import { useTheme } from "@/shared/theme/theme-context";

import { RetailerOrderTimelineEvent } from "../orders.types";

type DeliveryTimelineProps = {
  events: RetailerOrderTimelineEvent[];
};

export const DeliveryTimeline = ({ events }: DeliveryTimelineProps) => {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.md }}>
      {events.map((event) => (
        <View
          key={event.key}
          style={{
            flexDirection: "row",
            gap: theme.spacing.md,
            alignItems: "flex-start"
          }}
        >
          <View
            style={{
              width: 16,
              alignItems: "center",
              marginTop: 4
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: event.completed ? theme.colors.success : theme.colors.border
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="label">{event.label}</AppText>
            <AppText
              variant="body"
              style={{
                color: theme.colors.textMuted
              }}
            >
              {event.timestamp}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
};
