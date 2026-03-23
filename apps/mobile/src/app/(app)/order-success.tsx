import { View } from "react-native";
import { router } from "expo-router";

import { useCart } from "@/features/ordering/state/cart-context";
import { AppButton } from "@/shared/components/ui/app-button";
import { AppText } from "@/shared/components/ui/app-text";
import { ScreenContainer } from "@/shared/components/ui/screen-container";
import { useTheme } from "@/shared/theme/theme-context";

export default function OrderSuccessScreen() {
  const { theme } = useTheme();
  const { lastOrderConfirmation } = useCart();

  return (
    <ScreenContainer>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          gap: theme.spacing.lg
        }}
      >
        <AppText variant="heading">Order Submitted</AppText>
        <View
          style={{
            backgroundColor: theme.colors.primarySoft,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.lg,
            gap: theme.spacing.sm
          }}
        >
          <AppText variant="label">Expected delivery date</AppText>
          <AppText variant="display">{lastOrderConfirmation?.expectedDeliveryDate ?? "--"}</AppText>
          <AppText variant="body">Order ID: {lastOrderConfirmation?.orderId ?? "--"}</AppText>
        </View>
        <AppText
          variant="body"
          style={{
            color: theme.colors.textMuted
          }}
        >
          Your order is now pending approval and route scheduling.
        </AppText>
        <AppButton
          label="Back to Home"
          onPress={() => {
            router.replace("/(app)");
          }}
        />
      </View>
    </ScreenContainer>
  );
}
