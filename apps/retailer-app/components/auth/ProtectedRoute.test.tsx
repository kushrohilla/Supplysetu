import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const replace = vi.fn();
const getStoredRetailerSession = vi.fn();
const originalWindow = globalThis.window;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/services/auth.service", () => ({
  getStoredRetailerSession,
}));

afterEach(() => {
  vi.clearAllMocks();

  if (originalWindow) {
    (globalThis as { window?: Window }).window = originalWindow;
  } else {
    delete (globalThis as { window?: Window }).window;
  }
});

describe("ProtectedRoute", () => {
  it("renders the same initial markup on the server and client for guest routes", async () => {
    getStoredRetailerSession.mockReturnValue(null);

    const { ProtectedRoute } = await import("./ProtectedRoute");

    delete (globalThis as { window?: Window }).window;
    const serverMarkup = renderToStaticMarkup(
      <ProtectedRoute mode="guest">
        <div>Retailer Login</div>
      </ProtectedRoute>,
    );

    (globalThis as { window?: Window }).window = {} as Window;
    const clientMarkup = renderToStaticMarkup(
      <ProtectedRoute mode="guest">
        <div>Retailer Login</div>
      </ProtectedRoute>,
    );

    expect(serverMarkup).toBe(clientMarkup);
  });

  it("renders the same initial markup on the server and client for preselected routes", async () => {
    getStoredRetailerSession.mockReturnValue({
      stage: "preselected",
      accessToken: "token",
      refreshToken: "refresh",
      expiresIn: 86400,
      tokenType: "Bearer",
    });

    const { ProtectedRoute } = await import("./ProtectedRoute");

    delete (globalThis as { window?: Window }).window;
    const serverMarkup = renderToStaticMarkup(
      <ProtectedRoute mode="preselected">
        <div>Choose Distributor</div>
      </ProtectedRoute>,
    );

    (globalThis as { window?: Window }).window = {} as Window;
    const clientMarkup = renderToStaticMarkup(
      <ProtectedRoute mode="preselected">
        <div>Choose Distributor</div>
      </ProtectedRoute>,
    );

    expect(serverMarkup).toBe(clientMarkup);
  });
});
