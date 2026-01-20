import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

/**
 * Custom render function that wraps components with necessary providers
 * Add any global providers here (e.g., Context providers, Router, etc.)
 */
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  // Add custom options here if needed
}

const AllProviders = ({ children }: { children: ReactNode }) => {
  // Add your providers here
  // Example: <ThemeProvider><AuthProvider>{children}</AuthProvider></ThemeProvider>
  return <>{children}</>;
};

const customRender = (ui: ReactElement, options?: CustomRenderOptions) => {
  return render(ui, { wrapper: AllProviders, ...options });
};

// Re-export everything from testing library
export * from "@testing-library/react";
export { customRender as render };
