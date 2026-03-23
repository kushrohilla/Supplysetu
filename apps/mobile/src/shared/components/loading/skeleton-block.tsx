import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

import { useTheme } from "@/shared/theme/theme-context";

type SkeletonBlockProps = {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
};

export const SkeletonBlock = ({ width = "100%", height, radius }: SkeletonBlockProps) => {
  const { theme } = useTheme();
  const shimmer = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(shimmer, {
          toValue: 0.35,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [shimmer]);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: radius ?? theme.radius.md,
        backgroundColor: theme.colors.skeletonBase,
        opacity: shimmer
      }}
    />
  );
};
