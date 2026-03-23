import { View } from "react-native";

import { SkeletonBlock } from "@/shared/components/loading/skeleton-block";
import { useTheme } from "@/shared/theme/theme-context";

export const OrderHistorySkeleton = () => {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.md }}>
      <SkeletonBlock height={120} width="100%" radius={theme.radius.lg} />
      <SkeletonBlock height={120} width="100%" radius={theme.radius.lg} />
      <SkeletonBlock height={120} width="100%" radius={theme.radius.lg} />
    </View>
  );
};
