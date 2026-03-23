import { PropsWithChildren, createContext, useContext } from "react";

import { AppTheme, tokens } from "./tokens";

const ThemeContext = createContext<{ theme: AppTheme } | null>(null);

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  return <ThemeContext.Provider value={{ theme: tokens }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
};
