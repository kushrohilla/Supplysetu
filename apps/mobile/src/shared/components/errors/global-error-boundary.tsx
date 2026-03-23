import { Component, ErrorInfo, PropsWithChildren } from "react";
import { View } from "react-native";

import { AppText } from "@/shared/components/ui/app-text";
import { tokens } from "@/shared/theme/tokens";

type State = {
  hasError: boolean;
};

export class GlobalErrorBoundary extends Component<PropsWithChildren, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("GlobalErrorBoundary", error, info);
  }

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: tokens.spacing.lg,
          backgroundColor: tokens.colors.background
        }}
      >
        <AppText variant="heading">Something went wrong</AppText>
        <AppText
          variant="body"
          style={{
            marginTop: tokens.spacing.md,
            color: tokens.colors.textMuted
          }}
        >
          Restart the app or try again once the network is stable.
        </AppText>
      </View>
    );
  }
}
