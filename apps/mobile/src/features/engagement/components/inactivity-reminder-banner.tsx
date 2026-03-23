import { View } from "react-native";

import { AppText } from "@/shared/components/ui/app-text";
import { useTheme } from "@/shared/theme/theme-context";

type InactivityReminderBannerProps = {
  title: string;
  body: string;
};

export const InactivityReminderBanner = ({ title, body }: InactivityReminderBannerProps) => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        backgroundColor: "#FFF5DF",
        gap: theme.spacing.xs
      }}
    >
      <AppText variant="heading">{title}</AppText>
      <AppText variant="body">{body}</AppText>
    </View>
  );
};
