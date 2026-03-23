import { View } from "react-native";

import { AppText } from "@/shared/components/ui/app-text";
import { useTheme } from "@/shared/theme/theme-context";

import { RetailerOrderStatus } from "../orders.types";

type OrderStatusBadgeProps = {
  status: RetailerOrderStatus;
};

const statusToneMap: Record<RetailerOrderStatus, { background: string; label: string }> = {
  invoiced: { background: "#F2ECE4", label: "Invoiced" },
  dispatched: { background: "#FFF5DF", label: "Dispatched" },
  delivered: { background: "#E9F0E1", label: "Delivered" }
};

export const OrderStatusBadge = ({ status }: OrderStatusBadgeProps) => {
  const { theme } = useTheme();
  const tone = statusToneMap[status];

  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: theme.radius.md,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        backgroundColor: tone.background
      }}
    >
      <AppText variant="label">{tone.label}</AppText>
    </View>
  );
};
