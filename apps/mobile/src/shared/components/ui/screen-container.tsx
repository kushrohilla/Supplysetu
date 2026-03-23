import { PropsWithChildren } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/shared/theme/theme-context";

export const ScreenContainer = ({ children }: PropsWithChildren) => {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.lg
      }}
    >
      {children}
    </SafeAreaView>
  );
};
