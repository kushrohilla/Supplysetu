import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { DeliveryTimeline } from "@/features/orders/components/delivery-timeline";
import { OrderHistorySkeleton } from "@/features/orders/components/order-history-skeleton";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { useOrderDetail } from "@/features/orders/hooks/use-order-detail";
import { AppText } from "@/shared/components/ui/app-text";
import { ScreenContainer } from "@/shared/components/ui/screen-container";
import { useTheme } from "@/shared/theme/theme-context";

export default function OrderTimelineScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const orderQuery = useOrderDetail(params.id);

  if (orderQuery.isLoading || !orderQuery.data) {
    return (
      <ScreenContainer>
        <OrderHistorySkeleton />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={{ gap: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.sm }}>
          <OrderStatusBadge status={orderQuery.data.status} />
          <AppText variant="heading">{orderQuery.data.id}</AppText>
          <AppText
            variant="body"
            style={{
              color: theme.colors.textMuted
            }}
          >
            Expected delivery {orderQuery.data.expectedDeliveryDate}
          </AppText>
        </View>

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
          <AppText variant="heading">Delivery timeline</AppText>
          <DeliveryTimeline events={orderQuery.data.timeline} />
        </View>
      </View>
    </ScreenContainer>
  );
}
