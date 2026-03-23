import { ScrollView, View } from "react-native";

import { SkeletonBlock } from "@/shared/components/loading/skeleton-block";
import { useTheme } from "@/shared/theme/theme-context";

export const HomeScreenSkeleton = () => {
  const { theme } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={{
        paddingBottom: theme.spacing.xxxl,
        gap: theme.spacing.lg
      }}
      showsVerticalScrollIndicator={false}
    >
      <SkeletonBlock height={34} width="58%" />
      <SkeletonBlock height={74} width="100%" radius={theme.radius.lg} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md }}>
        <SkeletonBlock height={118} width="48%" radius={theme.radius.lg} />
        <SkeletonBlock height={118} width="48%" radius={theme.radius.lg} />
        <SkeletonBlock height={118} width="48%" radius={theme.radius.lg} />
        <SkeletonBlock height={118} width="48%" radius={theme.radius.lg} />
      </View>
      <SkeletonBlock height={118} width="100%" radius={theme.radius.lg} />
      <View
        style={{
          borderRadius: theme.radius.lg,
          gap: theme.spacing.md
        }}
      >
        <SkeletonBlock height={28} width="52%" />
        <SkeletonBlock height={88} width="100%" radius={theme.radius.md} />
        <SkeletonBlock height={88} width="100%" radius={theme.radius.md} />
        <SkeletonBlock height={88} width="100%" radius={theme.radius.md} />
      </View>
    </ScrollView>
  );
};
