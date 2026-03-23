import { Pressable, ScrollView } from "react-native";

import { AppText } from "@/shared/components/ui/app-text";
import { useTheme } from "@/shared/theme/theme-context";

import { BrandSummary } from "../ordering.types";

type BrandSelectorProps = {
  brands: BrandSummary[];
  selectedBrandId?: string;
  onSelect: (brandId?: string) => void;
};

export const BrandSelector = ({ brands, selectedBrandId, onSelect }: BrandSelectorProps) => {
  const { theme } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.md }}>
      <Pressable
        accessibilityRole="button"
        onPress={() => onSelect(undefined)}
        style={{
          minHeight: 44,
          borderRadius: theme.radius.lg,
          paddingHorizontal: theme.spacing.lg,
          justifyContent: "center",
          backgroundColor: selectedBrandId ? theme.colors.surface : theme.colors.primary,
          borderWidth: 1,
          borderColor: theme.colors.border
        }}
      >
        <AppText
          variant="label"
          style={{
            color: selectedBrandId ? theme.colors.text : "#FFF8F2"
          }}
        >
          All Brands
        </AppText>
      </Pressable>
      {brands.map((brand) => {
        const selected = selectedBrandId === brand.id;

        return (
          <Pressable
            key={brand.id}
            accessibilityRole="button"
            onPress={() => onSelect(brand.id)}
            style={{
              minHeight: 44,
              borderRadius: theme.radius.lg,
              paddingHorizontal: theme.spacing.lg,
              justifyContent: "center",
              backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border
            }}
          >
            <AppText
              variant="label"
              style={{
                color: selected ? "#FFF8F2" : theme.colors.text
              }}
            >
              {brand.name}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};
