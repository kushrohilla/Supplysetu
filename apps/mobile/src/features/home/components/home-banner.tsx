import { View } from "react-native";

import { AppText } from "@/shared/components/ui/app-text";
import { useTheme } from "@/shared/theme/theme-context";

type HomeBannerProps = {
  eyebrow: string;
  title: string;
  body: string;
  tone?: "scheme" | "notification";
};

export const HomeBanner = ({ eyebrow, title, body, tone = "scheme" }: HomeBannerProps) => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        backgroundColor: tone === "scheme" ? theme.colors.primarySoft : "#E9F0E1",
        gap: theme.spacing.sm
      }}
    >
      <AppText
        variant="label"
        style={{
          color: theme.colors.textMuted
        }}
      >
        {eyebrow}
      </AppText>
      <AppText variant="heading">{title}</AppText>
      <AppText variant="body">{body}</AppText>
    </View>
  );
};
