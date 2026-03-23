import { View } from "react-native";

import { AppText } from "@/shared/components/ui/app-text";
import { useTheme } from "@/shared/theme/theme-context";

type HomeIndicatorCardProps = {
  label: string;
  value: string;
  tone?: "default" | "warning";
};

export const HomeIndicatorCard = ({ label, value, tone = "default" }: HomeIndicatorCardProps) => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        minHeight: 96,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: tone === "warning" ? theme.colors.warning : theme.colors.border,
        backgroundColor: tone === "warning" ? "#FFF5DF" : theme.colors.surface,
        padding: theme.spacing.lg,
        justifyContent: "space-between"
      }}
    >
      <AppText
        variant="label"
        style={{
          color: theme.colors.textMuted
        }}
      >
        {label}
      </AppText>
      <AppText variant="heading">{value}</AppText>
    </View>
  );
};
