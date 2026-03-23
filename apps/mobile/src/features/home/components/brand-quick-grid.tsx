import { Pressable, View } from "react-native";

import { AppText } from "@/shared/components/ui/app-text";
import { useTheme } from "@/shared/theme/theme-context";

type BrandQuickGridProps = {
  brands: Array<{
    id: string;
    name: string;
    skuCount: number;
  }>;
  onSelectBrand?: (brandId: string) => void;
};

export const BrandQuickGrid = ({ brands, onSelectBrand }: BrandQuickGridProps) => {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.md }}>
      <AppText variant="heading">Brands</AppText>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.spacing.md
        }}
      >
        {brands.map((brand) => (
          <Pressable
            key={brand.id}
            accessibilityRole="button"
            onPress={() => {
              onSelectBrand?.(brand.id);
            }}
            style={({ pressed }) => ({
              width: "47%",
              minHeight: 96,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: theme.spacing.lg,
              justifyContent: "space-between",
              opacity: pressed ? 0.88 : 1
            })}
          >
            <AppText variant="label">{brand.name}</AppText>
            <AppText
              variant="body"
              style={{
                color: theme.colors.textMuted
              }}
            >
              {brand.skuCount} SKUs
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
};
