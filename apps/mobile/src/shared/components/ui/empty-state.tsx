import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/shared/theme/theme-context";
import { AppText } from "./app-text";
import { AppButton } from "./app-button";

export type EmptyStateProps = {
  icon: string;
  title: string;
  helper: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
  hint?: React.ReactNode;
};

export const EmptyState = ({ icon, title, helper, ctaLabel, onCtaPress, hint }: EmptyStateProps) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}>
      <View style={styles.iconContainer}>
        <AppText style={[styles.icon, { color: theme.colors.textMuted }]}>{icon}</AppText>
      </View>
      <AppText variant="heading" style={[styles.title, { color: theme.colors.text }]}>
        {title}
      </AppText>
      <AppText variant="body" style={[styles.helper, { color: theme.colors.textMuted }]}>
        {helper}
      </AppText>

      {ctaLabel && onCtaPress && (
        <View style={styles.ctaContainer}>
          <AppButton label={ctaLabel} onPress={onCtaPress} />
        </View>
      )}

      {hint && (
        <View style={[styles.hintContainer, { borderTopColor: theme.colors.border }]}>
          {hint}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: "center",
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  iconContainer: {
    opacity: 0.7,
    marginBottom: 16,
  },
  icon: {
    fontSize: 48,
    lineHeight: 56,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  helper: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 24,
  },
  ctaContainer: {
    width: "100%",
    marginBottom: 24,
  },
  hintContainer: {
    width: "100%",
    borderTopWidth: 1,
    paddingTop: 24,
    alignItems: "flex-start",
  },
});
