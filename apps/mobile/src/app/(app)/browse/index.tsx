import { useDeferredValue, useState } from "react";
import { FlatList, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { BrandSelector } from "@/features/ordering/components/brand-selector";
import { CartFooter } from "@/features/ordering/components/cart-footer";
import { CatalogueListSkeleton } from "@/features/ordering/components/catalogue-list-skeleton";
import { EmptyProductsState } from "@/features/ordering/components/empty-products-state";
import { ProductCard, PRODUCT_CARD_HEIGHT } from "@/features/ordering/components/product-card";
import { useCatalogueBrands } from "@/features/ordering/hooks/use-catalogue-brands";
import { usePaginatedProducts } from "@/features/ordering/hooks/use-paginated-products";
import { useCart } from "@/features/ordering/state/cart-context";
import { AppText } from "@/shared/components/ui/app-text";
import { AppTextInput } from "@/shared/components/ui/app-text-input";
import { ScreenContainer } from "@/shared/components/ui/screen-container";
import { useTheme } from "@/shared/theme/theme-context";

export default function BrowseProductsScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{ brandId?: string }>();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>(params.brandId);

  const brandQuery = useCatalogueBrands();
  const productsQuery = usePaginatedProducts({
    brandId: selectedBrandId,
    search: deferredSearch
  });
  const { increment, decrement, getQuantity, summary } = useCart();

  const products = productsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const minimumMessage = !summary.meetsMinimumOrderValue
    ? `Add Rs ${summary.remainingToMinimum} more to meet the minimum order value.`
    : null;

  if (brandQuery.isLoading || productsQuery.isLoading) {
    return (
      <ScreenContainer>
        <CatalogueListSkeleton />
      </ScreenContainer>
    );
  }

  if (brandQuery.isError || productsQuery.isError) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", gap: theme.spacing.lg }}>
          <AppText variant="heading">Unable to load catalogue</AppText>
          <AppText
            variant="body"
            style={{
              color: theme.colors.textMuted
            }}
          >
            Check network and try again.
          </AppText>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={{ flex: 1 }}>
        <FlatList
          contentContainerStyle={{
            paddingBottom: 180,
            gap: theme.spacing.md
          }}
          data={products}
          getItemLayout={(_, index) => ({
            index,
            length: PRODUCT_CARD_HEIGHT + theme.spacing.md,
            offset: (PRODUCT_CARD_HEIGHT + theme.spacing.md) * index
          })}
          initialNumToRender={8}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyProductsState
              onClearSearch={
                search || selectedBrandId
                  ? () => {
                      setSearch("");
                      setSelectedBrandId(undefined);
                    }
                  : undefined
              }
            />
          }
          ListHeaderComponent={
            <View style={{ gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
              <View style={{ gap: theme.spacing.xs }}>
                <AppText variant="heading">Browse Products</AppText>
                <AppText
                  variant="body"
                  style={{
                    color: theme.colors.textMuted
                  }}
                >
                  Choose a brand, search quickly, and build your repeat order.
                </AppText>
              </View>
              <BrandSelector
                brands={brandQuery.data ?? []}
                onSelect={(brandId) => {
                  setSelectedBrandId(brandId);
                }}
                selectedBrandId={selectedBrandId}
              />
              <AppTextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
                label="Search products"
                onChangeText={setSearch}
                placeholder="Search by product name"
                returnKeyType="search"
                value={search}
              />
            </View>
          }
          maxToRenderPerBatch={8}
          onEndReached={() => {
            if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
              void productsQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.45}
          removeClippedSubviews
          renderItem={({ item }) => (
            <ProductCard
              onDecrement={() => decrement(item)}
              onIncrement={() => increment(item)}
              product={item}
              quantity={getQuantity(item.id)}
            />
          )}
          showsVerticalScrollIndicator={false}
          windowSize={7}
        />

        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingBottom: theme.spacing.md
          }}
        >
          <CartFooter
            ctaLabel="Review Cart"
            disabled={summary.totalQuantity === 0}
            minimumMessage={minimumMessage}
            onPress={() => {
              router.push("/(app)/cart" as never);
            }}
            subtotal={summary.subtotal}
            totalQuantity={summary.totalQuantity}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}
