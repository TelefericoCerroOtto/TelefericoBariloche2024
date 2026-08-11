import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTE_HANDLERS, STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { useServiceState } from "./use-service-state";

const useProxyMock = vi.hoisted(() => vi.fn());

vi.mock("./use-proxy", () => ({
  useProxy: useProxyMock,
}));

describe("useServiceState", () => {
  beforeEach(() => {
    useProxyMock.mockReset();
    useProxyMock.mockReturnValue({
      data: undefined,
      isError: undefined,
      isLoading: true,
    });
  });

  it("uses the public service-state GET contract with ten-second refresh", () => {
    renderHook(() => useServiceState());

    expect(useProxyMock).toHaveBeenCalledWith(
      STRAPI_ENDPOINTS.SERVICE_STATE,
      {},
      expect.objectContaining({
        revalidateOnFocus: true,
        refreshInterval: 10_000,
      }),
    );
    expect(`${ROUTE_HANDLERS.PROXY}${useProxyMock.mock.calls[0][0]}`).toBe(
      "/api/proxy/api/service-state",
    );
  });
});
