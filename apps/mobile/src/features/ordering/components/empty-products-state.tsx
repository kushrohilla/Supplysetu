import { View } from "react-native";

import { AppText } from "@/shared/components/ui/app-text";
import { useTheme } from "@/shared/theme/theme-context";

export const EmptyProductsState = () => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        paddingVertical: theme.spacing.xxxl,
        alignItems: "center",
        gap: theme.spacing.sm
      }}
    >
      <AppText variant="heading">No products found</AppText>
      <AppText
        variant="body"
        style={{
          color: theme.colors.textMuted,
          textAlign: "center"
        }}
      >
        Try another brand or search term.
      </AppText>
    </View>
  );
};
