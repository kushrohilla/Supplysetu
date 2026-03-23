import { View } from "react-native";

import { SkeletonBlock } from "@/shared/components/loading/skeleton-block";
import { useTheme } from "@/shared/theme/theme-context";

import { PRODUCT_CARD_HEIGHT } from "./product-card";

export const CatalogueListSkeleton = () => {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.md }}>
      <SkeletonBlock height={44} width="100%" radius={theme.radius.lg} />
      <SkeletonBlock height={44} width="85%" radius={theme.radius.lg} />
      <SkeletonBlock height={PRODUCT_CARD_HEIGHT} width="100%" radius={theme.radius.lg} />
      <SkeletonBlock height={PRODUCT_CARD_HEIGHT} width="100%" radius={theme.radius.lg} />
      <SkeletonBlock height={PRODUCT_CARD_HEIGHT} width="100%" radius={theme.radius.lg} />
    </View>
  );
};
