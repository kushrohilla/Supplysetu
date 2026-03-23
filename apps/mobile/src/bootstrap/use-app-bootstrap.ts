import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";

import { hydrateCacheStore } from "@/services/cache/cache-store";

void SplashScreen.preventAutoHideAsync();

export const useAppBootstrap = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        await hydrateCacheStore();
      } catch (error) {
        console.warn("App bootstrap encountered a recoverable error.", error);
      } finally {
        if (!mounted) {
          return;
        }

        setReady(true);
        await SplashScreen.hideAsync();
      }
    };

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  return ready;
};
