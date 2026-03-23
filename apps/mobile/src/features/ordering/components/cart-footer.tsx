import { View } from "react-native";

import { AppButton } from "@/shared/components/ui/app-button";
import { AppText } from "@/shared/components/ui/app-text";
import { useTheme } from "@/shared/theme/theme-context";

type CartFooterProps = {
  totalQuantity: number;
  subtotal: number;
  minimumMessage?: string | null;
  ctaLabel: string;
  onPress: () => void;
  disabled?: boolean;
};

export const CartFooter = ({
  totalQuantity,
  subtotal,
  minimumMessage,
  ctaLabel,
  onPress,
  disabled = false
}: CartFooterProps) => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        paddingTop: theme.spacing.md,
        gap: theme.spacing.sm
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <View>
          <AppText variant="label">Order Total</AppText>
          <AppText variant="heading">Rs {subtotal}</AppText>
        </View>
        <AppText
          variant="body"
          style={{
            color: theme.colors.textMuted
          }}
        >
          {totalQuantity} items
        </AppText>
      </View>
      {minimumMessage ? (
        <AppText
          variant="body"
          style={{
            color: theme.colors.warning
          }}
        >
          {minimumMessage}
        </AppText>
      ) : null}
      <AppButton disabled={disabled} label={ctaLabel} onPress={onPress} />
    </View>
  );
};
