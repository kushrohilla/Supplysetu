import { TextInput, TextInputProps, View } from "react-native";

import { useTheme } from "@/shared/theme/theme-context";

import { AppText } from "./app-text";

type AppTextInputProps = TextInputProps & {
  label: string;
  helperText?: string;
};

export const AppTextInput = ({ label, helperText, ...props }: AppTextInputProps) => {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        allowFontScaling
        placeholderTextColor={theme.colors.textMuted}
        style={{
          minHeight: 58,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.spacing.lg,
          fontSize: theme.typography.heading.fontSize,
          lineHeight: theme.typography.heading.lineHeight,
          color: theme.colors.text
        }}
        {...props}
      />
      {helperText ? (
        <AppText
          variant="body"
          style={{
            color: theme.colors.textMuted
          }}
        >
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
};
