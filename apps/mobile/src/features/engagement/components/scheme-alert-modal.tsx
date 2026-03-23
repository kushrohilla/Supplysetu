import { Modal, Pressable, View } from "react-native";

import { AppButton } from "@/shared/components/ui/app-button";
import { AppText } from "@/shared/components/ui/app-text";
import { useTheme } from "@/shared/theme/theme-context";

type SchemeAlertModalProps = {
  visible: boolean;
  title: string;
  body: string;
  onClose: () => void;
};

export const SchemeAlertModal = ({ visible, title, body, onClose }: SchemeAlertModalProps) => {
  const { theme } = useTheme();

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(31,27,22,0.35)",
          justifyContent: "center",
          padding: theme.spacing.lg
        }}
      >
        <Pressable
          onPress={() => undefined}
          style={{
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.surface,
            padding: theme.spacing.lg,
            gap: theme.spacing.md
          }}
        >
          <AppText variant="label">Scheme alert</AppText>
          <AppText variant="heading">{title}</AppText>
          <AppText variant="body">{body}</AppText>
          <AppButton label="Got it" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
};
