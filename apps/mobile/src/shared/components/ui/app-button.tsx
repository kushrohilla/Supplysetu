import { Pressable, StyleProp, ViewStyle } from "react-native";

import { useTheme } from "@/shared/theme/theme-context";

import { AppText } from "./app-text";

type AppButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  style?: StyleProp<ViewStyle>;
};

export const AppButton = ({ label, onPress, disabled = false, variant = "primary", style }: AppButtonProps) => {
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 56,
          borderRadius: theme.radius.lg,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: theme.spacing.lg,
          backgroundColor: variant === "primary" ? theme.colors.primary : theme.colors.surface,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1
        },
        style
      ]}
    >
      <AppText
        variant="label"
        style={{
          color: variant === "primary" ? "#FFF8F2" : theme.colors.text
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
};
