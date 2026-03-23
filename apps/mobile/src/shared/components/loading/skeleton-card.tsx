import { View } from "react-native";

import { useTheme } from "@/shared/theme/theme-context";

import { SkeletonBlock } from "./skeleton-block";

export const SkeletonCard = () => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: theme.spacing.md
      }}
    >
      <SkeletonBlock height={24} width="70%" />
      <SkeletonBlock height={18} width="45%" />
      <SkeletonBlock height={56} width="100%" radius={theme.radius.lg} />
    </View>
  );
};
