import { memo, useMemo, useRef, useState } from "react";
import { Animated, FlatList, Image, PanResponder, Pressable, View } from "react-native";
import { router } from "expo-router";

import { orderApi } from "@/features/ordering/api/order-api";
import { QuantityStepper } from "@/features/ordering/components/quantity-stepper";
import { useCart } from "@/features/ordering/state/cart-context";
import { AppButton } from "@/shared/components/ui/app-button";
import { AppText } from "@/shared/components/ui/app-text";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { ScreenContainer } from "@/shared/components/ui/screen-container";
import { useTheme } from "@/shared/theme/theme-context";

const formatInr = (value: number): string => `Rs ${Math.round(value)}`;

type CartRowProps = {
  id: string;
  imageUrl?: string | null;
  name: string;
  packSize: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
};

const CartRow = memo(
  ({
    id,
    imageUrl,
    name,
    packSize,
    unitPrice,
    quantity,
    lineTotal,
    onIncrement,
    onDecrement,
    onRemove
  }: CartRowProps) => {
    const { theme } = useTheme();
    const translateX = useRef(new Animated.Value(0)).current;

    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 8,
          onPanResponderMove: (_, gestureState) => {
            translateX.setValue(Math.min(0, gestureState.dx));
          },
          onPanResponderRelease: (_, gestureState) => {
            if (gestureState.dx < -90) {
              Animated.timing(translateX, {
                toValue: -320,
                duration: 140,
                useNativeDriver: true
              }).start(() => {
                onRemove();
              });
              return;
            }

            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              speed: 18,
              bounciness: 5
            }).start();
          }
        }),
      [onRemove, translateX]
    );

    return (
      <View
        style={{
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          overflow: "hidden"
        }}
      >
        <View
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 92,
            backgroundColor: "#B22A2A",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          <AppText
            variant="label"
            style={{
              color: "#FFF"
            }}
          >
            Remove
          </AppText>
        </View>
        <Animated.View
          key={id}
          {...panResponder.panHandlers}
          style={{
            transform: [{ translateX }],
            backgroundColor: theme.colors.surface,
            padding: theme.spacing.md,
            gap: theme.spacing.sm
          }}
        >
          <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
            <Image
              source={imageUrl ? { uri: imageUrl } : { uri: `https://picsum.photos/seed/${id}/120/120` }}
              style={{
                width: 68,
                height: 68,
                borderRadius: theme.radius.sm,
                backgroundColor: theme.colors.skeletonBase
              }}
            />
            <View style={{ flex: 1, gap: theme.spacing.xs }}>
              <AppText variant="label">{name}</AppText>
              <AppText
                variant="body"
                style={{
                  color: theme.colors.textMuted
                }}
              >
                {packSize}
              </AppText>
              <AppText variant="body">{formatInr(unitPrice)} / unit</AppText>
            </View>
            <View style={{ alignItems: "flex-end", justifyContent: "space-between" }}>
              <AppText variant="label">{formatInr(lineTotal)}</AppText>
            </View>
          </View>
          <QuantityStepper quantity={quantity} onIncrement={onIncrement} onDecrement={onDecrement} />
        </Animated.View>
      </View>
    );
  }
);

CartRow.displayName = "CartRow";

export default function CartScreen() {
  const { theme } = useTheme();
  const {
    summary,
    paymentMode,
    setPaymentMode,
    increment,
    decrement,
    setQuantity,
    clearCart,
    setLastOrderConfirmation
  } = useCart();
  const [placingOrder, setPlacingOrder] = useState(false);

  const totalItemCount = summary.totalQuantity;
  const finalPayableAmount = summary.subtotal;

  const submitOrder = async () => {
    if (summary.items.length === 0 || !paymentMode || placingOrder) {
      return;
    }

    try {
      setPlacingOrder(true);
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
      setPlacingOrder(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={{ flex: 1 }}>
        <FlatList
          data={summary.items}
          keyExtractor={(item) => item.product.id}
          contentContainerStyle={{
            gap: theme.spacing.sm,
            paddingBottom: 260
          }}
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews
          ListHeaderComponent={
            <View style={{ marginBottom: theme.spacing.sm, gap: theme.spacing.xs }}>
              <AppText variant="heading">Cart</AppText>
              <AppText variant="body" style={{ color: theme.colors.textMuted }}>
                Review quantities and place your order in one step.
              </AppText>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="🛒"
              title="Your cart needs items"
              helper="Add products from the catalog to start building your order."
              ctaLabel="Add products"
              onCtaPress={() => router.replace("/(app)/browse")}
            />
          }
          renderItem={({ item }) => (
            <CartRow
              id={item.product.id}
              imageUrl={item.product.imageUrl}
              name={item.product.name}
              packSize={item.product.packSize}
              unitPrice={item.product.basePrice}
              quantity={item.quantity}
              lineTotal={item.quantity * item.product.basePrice}
              onIncrement={() => increment(item.product)}
              onDecrement={() => decrement(item.product)}
              onRemove={() => setQuantity(item.product, 0)}
            />
          )}
        />

        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.md
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText variant="body">Total item count</AppText>
            <AppText variant="label">{totalItemCount}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText variant="body">Subtotal</AppText>
            <AppText variant="label">{formatInr(summary.subtotal)}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText variant="label">Final payable amount</AppText>
            <AppText variant="heading">{formatInr(finalPayableAmount)}</AppText>
          </View>

          <View style={{ gap: theme.spacing.sm }}>
            <AppText variant="label">Payment Mode</AppText>
            <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
              <Pressable
                onPress={() => setPaymentMode("advance")}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: paymentMode === "advance" ? theme.colors.primary : theme.colors.border,
                  backgroundColor: paymentMode === "advance" ? theme.colors.primarySoft : theme.colors.surface,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                  alignItems: "center"
                }}
              >
                <AppText variant="label">Advance Payment</AppText>
              </Pressable>
              <Pressable
                onPress={() => setPaymentMode("cod")}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: paymentMode === "cod" ? theme.colors.primary : theme.colors.border,
                  backgroundColor: paymentMode === "cod" ? theme.colors.primarySoft : theme.colors.surface,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                  alignItems: "center"
                }}
              >
                <AppText variant="label">Cash on Delivery</AppText>
              </Pressable>
            </View>
            {paymentMode === "advance" ? (
              <AppText variant="body" style={{ color: theme.colors.textMuted }}>
                Advance orders may qualify for better distributor pricing.
              </AppText>
            ) : null}
          </View>

          <AppButton
            label={placingOrder ? "Placing Order..." : "PLACE ORDER"}
            disabled={placingOrder || summary.items.length === 0 || !paymentMode}
            onPress={() => {
              void submitOrder();
            }}
            style={{ minHeight: 60 }}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}
