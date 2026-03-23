import { PropsWithChildren } from "react";
import { StyleProp, Text, TextStyle } from "react-native";

import { useTheme } from "@/shared/theme/theme-context";

type AppTextProps = PropsWithChildren<{
  variant?: "display" | "heading" | "body" | "label";
  style?: StyleProp<TextStyle>;
}>;

export const AppText = ({ children, variant = "body", style }: AppTextProps) => {
  const { theme } = useTheme();

  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.2}
      style={[
        {
          color: theme.colors.text,
          ...theme.typography[variant]
        },
        style
      ]}
    >
      {children}
    </Text>
  );
};
