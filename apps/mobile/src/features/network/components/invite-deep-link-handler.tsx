import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";

import { useAuthSession } from "@/features/auth/state/auth-context";
import { inviteNetworkApi } from "@/features/network/api/invite-network-api";
import { pendingInviteStore } from "@/features/network/state/pending-invite-store";

const extractInviteCode = (url: string | null): string | null => {
  if (!url) {
    return null;
  }
  const parsed = Linking.parse(url);
  const rawCode = parsed.queryParams?.code;
  if (typeof rawCode !== "string" || !rawCode.trim()) {
    return null;
  }
  return rawCode.trim().toUpperCase();
};

export const InviteDeepLinkHandler = () => {
  const { isAuthenticated, user } = useAuthSession();
  const isProcessingRef = useRef(false);

  useEffect(() => {
    const processInvite = async (inviteCode: string) => {
      if (isProcessingRef.current) {
        return;
      }
      isProcessingRef.current = true;
      try {
        if (!isAuthenticated || !user?.id) {
          await pendingInviteStore.setCode(inviteCode);
          Alert.alert(
            "Invite Saved",
            `Code ${inviteCode} will be processed after login/signup.`
          );
          router.replace("/(auth)/welcome");
          return;
        }

        const joinResult = await inviteNetworkApi.joinRetailerNetwork({
          inviteCode,
          retailerUserId: user.id,
          joinSource: "invite_link"
        });
        await pendingInviteStore.clear();
        router.push({
          pathname: "/(app)/join/confirmation" as never,
          params: {
            code: inviteCode,
            distributorName: joinResult.distributor_basic_info.distributor_name
          }
        });
      } catch (error) {
        Alert.alert("Invite Join Failed", error instanceof Error ? error.message : "Try again.");
      } finally {
        isProcessingRef.current = false;
      }
    };

    const init = async () => {
      const initialUrl = await Linking.getInitialURL();
      const initialCode = extractInviteCode(initialUrl);
      if (initialCode) {
        await processInvite(initialCode);
        return;
      }
      const pendingCode = await pendingInviteStore.getCode();
      if (pendingCode && isAuthenticated && user?.id) {
        await processInvite(pendingCode);
      }
    };

    void init();

    const subscription = Linking.addEventListener("url", ({ url }) => {
      const code = extractInviteCode(url);
      if (!code) {
        return;
      }
      void processInvite(code);
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, user?.id]);

  return null;
};
