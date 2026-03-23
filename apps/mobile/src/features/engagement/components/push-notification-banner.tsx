import { View } from "react-native";

import { AppText } from "@/shared/components/ui/app-text";
import { useTheme } from "@/shared/theme/theme-context";

type PushNotificationBannerProps = {
  title: string;
  body: string;
};

export const PushNotificationBanner = ({ title, body }: PushNotificationBannerProps) => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        backgroundColor: "#E9F0E1",
        gap: theme.spacing.xs
      }}
    >
      <AppText variant="label">Latest update</AppText>
      <AppText variant="heading">{title}</AppText>
      <AppText variant="body">{body}</AppText>
    </View>
  );
};
