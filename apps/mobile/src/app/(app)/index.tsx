import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";

import { useRetailerHome } from "@/features/home/hooks/use-retailer-home";
import { HomeBanner } from "@/features/home/components/home-banner";
import { HomeScreenSkeleton } from "@/features/home/components/home-screen-skeleton";
import { useAuthSession } from "@/features/auth/state/auth-context";
import { AppButton } from "@/shared/components/ui/app-button";
import { AppText } from "@/shared/components/ui/app-text";
import { ScreenContainer } from "@/shared/components/ui/screen-container";
import { useTheme } from "@/shared/theme/theme-context";

const visitStateTone = {
  "yet-to-visit": {
    backgroundColor: "#FFF5DF",
    color: "#A36B00",
    label: "Yet to visit"
  },
  "order-placed": {
    backgroundColor: "#E4F2E6",
    color: "#2F6B3A",
    label: "Order placed"
  },
  inactive: {
    backgroundColor: "#F7E4E4",
    color: "#A12828",
    label: "Inactive"
  }
} as const;

export default function AppHomeScreen() {
  const { theme } = useTheme();
  const { user, clearSession } = useAuthSession();
  const homeQuery = useRetailerHome();

  if (homeQuery.isLoading || !homeQuery.data) {
    return (
      <ScreenContainer>
        <HomeScreenSkeleton />
      </ScreenContainer>
    );
  }

  if (homeQuery.isError) {
    return (
      <ScreenContainer>
        <View style={{ gap: theme.spacing.lg, justifyContent: "center", flex: 1 }}>
          <AppText variant="heading">Unable to load dashboard</AppText>
          <AppText
            variant="body"
            style={{
              color: theme.colors.textMuted
            }}
          >
            Check network and try again.
          </AppText>
          <AppButton
            label="Retry"
            onPress={() => {
              void homeQuery.refetch();
            }}
          />
        </View>
      </ScreenContainer>
    );
  }

  const { data } = homeQuery;

  const statCards = [
    {
      id: "route",
      label: "Assigned route",
      value: data.assignedRouteName,
      tone: "default" as const,
      onPress: () => router.push("/(app)/browse")
    },
    {
      id: "retailers",
      label: "Retailers in route",
      value: String(data.totalRetailersInRoute),
      tone: "default" as const,
      onPress: () => router.push("/(app)/browse")
    },
    {
      id: "yet-to-visit",
      label: "Yet to visit",
      value: String(data.retailersYetToVisitCount),
      tone: "warning" as const,
      onPress: () => router.push("/(app)/browse")
    },
    {
      id: "orders",
      label: "Orders today",
      value: String(data.ordersPlacedTodayCount),
      tone: "success" as const,
      onPress: () => router.push("/(app)/orders")
    }
  ];

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: theme.spacing.xxxl,
          gap: theme.spacing.lg
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: theme.spacing.xs }}>
          <AppText variant="heading">Salesman Dashboard</AppText>
          <AppText
            variant="body"
            style={{
              color: theme.colors.textMuted
            }}
          >
            Good morning, {user?.name ?? "salesman"}.
          </AppText>
        </View>

        <AppButton
          label="Start Route Visit"
          onPress={() => {
            router.push("/(app)/browse");
          }}
          style={{
            minHeight: 74
          }}
        />

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.md
          }}
        >
          {statCards.map((card) => {
            const backgroundColor =
              card.tone === "warning"
                ? "#FFF5DF"
                : card.tone === "success"
                  ? "#E4F2E6"
                  : theme.colors.surface;
            const borderColor =
              card.tone === "warning"
                ? theme.colors.warning
                : card.tone === "success"
                  ? theme.colors.success
                  : theme.colors.border;

            return (
              <Pressable
                key={card.id}
                accessibilityRole="button"
                onPress={card.onPress}
                style={({ pressed }) => ({
                  width: "48%",
                  minHeight: 118,
                  borderRadius: theme.radius.lg,
                  borderWidth: 1,
                  borderColor,
                  backgroundColor,
                  padding: theme.spacing.lg,
                  justifyContent: "space-between",
                  opacity: pressed ? 0.88 : 1
                })}
              >
                <AppText
                  variant="label"
                  style={{
                    color: theme.colors.textMuted
                  }}
                >
                  {card.label}
                </AppText>
                <AppText
                  variant={card.id === "route" ? "body" : "heading"}
                  style={{
                    fontWeight: "700"
                  }}
                >
                  {card.value}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {data.activeScheme ? (
          <HomeBanner
            eyebrow="Scheme highlight"
            title={data.activeScheme.title}
            body={data.activeScheme.description}
            tone="scheme"
          />
        ) : null}

        <View
          style={{
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            padding: theme.spacing.lg,
            gap: theme.spacing.md
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <View style={{ gap: theme.spacing.xs }}>
              <AppText variant="heading">Visit preview</AppText>
              <AppText
                variant="body"
                style={{
                  color: theme.colors.textMuted
                }}
              >
                Today&apos;s route queue
              </AppText>
            </View>
            <View
              style={{
                minWidth: 54,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: 999,
                backgroundColor: "#F7E4E4",
                alignItems: "center"
              }}
            >
              <AppText
                variant="label"
                style={{
                  color: theme.colors.danger
                }}
              >
                {data.inactiveRetailersCount} inactive
              </AppText>
            </View>
          </View>

          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            style={{
              maxHeight: 340
            }}
            contentContainerStyle={{
              gap: theme.spacing.md
            }}
          >
            {data.visitPreview.map((retailer) => {
              const tone = visitStateTone[retailer.state];

              return (
                <Pressable
                  key={retailer.id}
                  accessibilityRole="button"
                  onPress={() => {
                    router.push("/(app)/browse");
                  }}
                  style={({ pressed }) => ({
                    borderRadius: theme.radius.md,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                    padding: theme.spacing.lg,
                    gap: theme.spacing.sm,
                    opacity: pressed ? 0.9 : 1
                  })}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: theme.spacing.md
                    }}
                  >
                    <View style={{ flex: 1, gap: theme.spacing.xs }}>
                      <AppText variant="label">{retailer.retailerName}</AppText>
                      <AppText
                        variant="body"
                        style={{
                          color: theme.colors.textMuted
                        }}
                      >
                        {retailer.locality}
                      </AppText>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.sm,
                        borderRadius: 999,
                        backgroundColor: tone.backgroundColor
                      }}
                    >
                      <AppText
                        variant="label"
                        style={{
                          color: tone.color
                        }}
                      >
                        {tone.label}
                      </AppText>
                    </View>
                  </View>
                  <AppText
                    variant="body"
                    style={{
                      color: theme.colors.textMuted
                    }}
                  >
                    {retailer.note}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <AppButton
          label="Logout"
          onPress={() => {
            void clearSession();
          }}
          variant="secondary"
        />
      </ScrollView>
    </ScreenContainer>
  );
}
