import { ScrollView, View } from "react-native";
import { router } from "expo-router";

import { useCart } from "@/features/ordering/state/cart-context";
import { useOrderHistory } from "@/features/orders/hooks/use-order-history";
import { OrderHistoryCard } from "@/features/orders/components/order-history-card";
import { OrderHistorySkeleton } from "@/features/orders/components/order-history-skeleton";
import { AppText } from "@/shared/components/ui/app-text";
import { ScreenContainer } from "@/shared/components/ui/screen-container";
import { useTheme } from "@/shared/theme/theme-context";

export default function OrdersHistoryScreen() {
  const { theme } = useTheme();
  const { replaceCart, setPaymentMode } = useCart();
  const ordersQuery = useOrderHistory();

  if (ordersQuery.isLoading || !ordersQuery.data) {
    return (
      <ScreenContainer>
        <OrderHistorySkeleton />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: theme.spacing.xxxl,
          gap: theme.spacing.md
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: theme.spacing.xs }}>
          <AppText variant="heading">Previous Orders</AppText>
          <AppText
            variant="body"
            style={{
              color: theme.colors.textMuted
            }}
          >
            Reorder quickly and track delivery progress without remembering item details.
          </AppText>
        </View>

        {ordersQuery.data.map((order) => (
          <OrderHistoryCard
            key={order.id}
            onOpenTimeline={() => {
              router.push({
                pathname: "/(app)/orders/[id]",
                params: {
                  id: order.id
                }
              });
            }}
            onReorder={() => {
              replaceCart(order.items);
              setPaymentMode(order.paymentMode);
              router.push("/(app)/browse");
            }}
            order={order}
          />
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}
