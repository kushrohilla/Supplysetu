import { Pressable, View } from "react-native";

import { AppText } from "@/shared/components/ui/app-text";
import { useTheme } from "@/shared/theme/theme-context";

import { PaymentMode } from "../ordering.types";

type PaymentModeOptionProps = {
  mode: PaymentMode;
  selected: boolean;
  title: string;
  description: string;
  onPress: () => void;
};

export const PaymentModeOption = ({
  mode,
  selected,
  title,
  description,
  onPress
}: PaymentModeOptionProps) => {
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
        padding: theme.spacing.lg
      }}
    >
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="heading">{title}</AppText>
        <AppText
          variant="body"
          style={{
            color: theme.colors.textMuted
          }}
        >
          {description}
        </AppText>
        <AppText variant="label">{mode === "advance" ? "Advance price eligible" : "Standard pricing applies"}</AppText>
      </View>
    </Pressable>
  );
};
