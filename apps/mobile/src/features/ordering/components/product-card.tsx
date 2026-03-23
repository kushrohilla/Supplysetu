import { View } from "react-native";

import { AppText } from "@/shared/components/ui/app-text";
import { useTheme } from "@/shared/theme/theme-context";

import { ProductSummary } from "../ordering.types";
import { QuantityStepper } from "./quantity-stepper";

type ProductCardProps = {
  product: ProductSummary;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
};

export const PRODUCT_CARD_HEIGHT = 156;

export const ProductCard = ({ product, quantity, onIncrement, onDecrement }: ProductCardProps) => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        height: PRODUCT_CARD_HEIGHT,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        justifyContent: "space-between"
      }}
    >
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="label">{product.name}</AppText>
        <AppText
          variant="body"
          style={{
            color: theme.colors.textMuted
          }}
        >
          {product.packSize}
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
          <View
            style={{
              backgroundColor: "#F2ECE4",
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs
            }}
          >
            <AppText variant="label">Base Rs {product.basePrice}</AppText>
          </View>
          <View
            style={{
              backgroundColor: "#E9F0E1",
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs
            }}
          >
            <AppText variant="label">Advance Rs {product.advancePrice}</AppText>
          </View>
          {product.schemeTag ? (
            <View
              style={{
                backgroundColor: theme.colors.primarySoft,
                borderRadius: theme.radius.md,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xs
              }}
            >
              <AppText variant="label">{product.schemeTag}</AppText>
            </View>
          ) : null}
        </View>
      </View>
      <QuantityStepper quantity={quantity} onIncrement={onIncrement} onDecrement={onDecrement} />
    </View>
  );
};
