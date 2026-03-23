import { Pressable, View } from "react-native";

import { AppText } from "@/shared/components/ui/app-text";
import { useTheme } from "@/shared/theme/theme-context";

type QuantityStepperProps = {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
};

export const QuantityStepper = ({ quantity, onIncrement, onDecrement }: QuantityStepperProps) => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onDecrement}
        style={{
          width: 44,
          height: 44,
          borderRadius: theme.radius.md,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border
        }}
      >
        <AppText variant="heading">-</AppText>
      </Pressable>
      <View
        style={{
          minWidth: 44,
          alignItems: "center"
        }}
      >
        <AppText variant="heading">{quantity}</AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onIncrement}
        style={{
          width: 44,
          height: 44,
          borderRadius: theme.radius.md,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.primary,
          borderWidth: 1,
          borderColor: theme.colors.primary
        }}
      >
        <AppText
          variant="heading"
          style={{
            color: "#FFF8F2"
          }}
        >
          +
        </AppText>
      </Pressable>
    </View>
  );
};
