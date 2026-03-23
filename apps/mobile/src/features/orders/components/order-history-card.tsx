import { Pressable, View } from "react-native";

import { AppButton } from "@/shared/components/ui/app-button";
import { AppText } from "@/shared/components/ui/app-text";
import { useTheme } from "@/shared/theme/theme-context";

import { RetailerOrder } from "../orders.types";
import { DeliveryTimeline } from "./delivery-timeline";
import { OrderStatusBadge } from "./order-status-badge";

type OrderHistoryCardProps = {
  order: RetailerOrder;
  onReorder: () => void;
  onOpenTimeline: () => void;
};

export const OrderHistoryCard = ({ order, onReorder, onOpenTimeline }: OrderHistoryCardProps) => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        gap: theme.spacing.md
      }}
    >
      <View style={{ gap: theme.spacing.sm }}>
        <OrderStatusBadge status={order.status} />
        <AppText variant="heading">{order.id}</AppText>
        <AppText
          variant="body"
          style={{
            color: theme.colors.textMuted
          }}
        >
          Ordered on {order.orderDate} | Rs {order.totalAmount}
        </AppText>
      </View>

      <DeliveryTimeline events={order.timeline} />

      <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <AppButton label="Reorder" onPress={onReorder} />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onOpenTimeline}
          style={{
            minHeight: 56,
            justifyContent: "center"
          }}
        >
          <AppText variant="label">View timeline</AppText>
        </Pressable>
      </View>
    </View>
  );
};
