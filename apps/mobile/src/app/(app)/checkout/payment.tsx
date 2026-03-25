import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";

import { orderApi } from "@/features/ordering/api/order-api";
import { CartFooter } from "@/features/ordering/components/cart-footer";
import { PaymentModeOption } from "@/features/ordering/components/payment-mode-option";
import { useCart } from "@/features/ordering/state/cart-context";
import { AppText } from "@/shared/components/ui/app-text";
import { ScreenContainer } from "@/shared/components/ui/screen-container";
import { useTheme } from "@/shared/theme/theme-context";

export default function PaymentModeScreen() {
  const { theme } = useTheme();
  const { summary, paymentMode, setPaymentMode, setLastOrderConfirmation, clearCart } = useCart();
  const [submitting, setSubmitting] = useState(false);

  const minimumMessage = !summary.meetsMinimumOrderValue
    ? `Add Rs ${summary.remainingToMinimum} more to meet the minimum order value.`
    : null;

  const submitOrder = async () => {
    if (!paymentMode || !summary.meetsMinimumOrderValue || summary.totalQuantity === 0 || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      const result = await orderApi.createOrder({
        retailerId: "retailer-demo",
        paymentMode,
        items: summary.items
      });
      setLastOrderConfirmation(result);
      await orderApi.clearCart();
      clearCart();
      router.replace("/(app)/order-success");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={{ flex: 1, justifyContent: "space-between" }}>
        <View style={{ gap: theme.spacing.lg }}>
          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="heading">Select Payment Mode</AppText>
            <AppText
              variant="body"
              style={{
                color: theme.colors.textMuted
              }}
            >
              Payment mode affects pricing and scheme eligibility.
            </AppText>
          </View>

          <View style={{ gap: theme.spacing.md }}>
            <PaymentModeOption
              description="Better pricing where advance discounts apply."
              mode="advance"
              onPress={() => setPaymentMode("advance")}
              selected={paymentMode === "advance"}
              title="Advance Payment"
            />
            <PaymentModeOption
              description="Cash on delivery with standard route settlement."
              mode="cod"
              onPress={() => setPaymentMode("cod")}
              selected={paymentMode === "cod"}
              title="Cash on Delivery"
            />
          </View>
        </View>

        <CartFooter
          ctaLabel={submitting ? "Submitting..." : "Submit Order"}
          disabled={!paymentMode || !summary.meetsMinimumOrderValue || summary.totalQuantity === 0 || submitting}
          minimumMessage={minimumMessage}
          onPress={() => {
            void submitOrder();
          }}
          subtotal={summary.subtotal}
          totalQuantity={summary.totalQuantity}
        />
      </View>
    </ScreenContainer>
  );
}
