import { ActivityIndicator, View } from "react-native";

import { useTheme } from "@/shared/theme/theme-context";

import { AppText } from "../ui/app-text";

export const FullScreenLoader = ({ label }: { label: string }) => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        alignItems: "center"
      }}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <AppText
        variant="label"
        style={{
          marginTop: theme.spacing.md
        }}
      >
        {label}
      </AppText>
    </View>
  );
};
