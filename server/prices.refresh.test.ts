import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");

  return {
    ...actual,
    getUserHoldings: vi.fn(),
  };
});

vi.mock("./priceService", async () => {
  const actual =
    await vi.importActual<typeof import("./priceService")>("./priceService");

  return {
    ...actual,
    fetchExchangeRates: vi.fn(),
  };
});

vi.mock("./assetPricing", async () => {
  const actual =
    await vi.importActual<typeof import("./assetPricing")>("./assetPricing");

  return {
    ...actual,
    fetchAssetPriceWithFallback: vi.fn(),
  };
});

import { appRouter } from "./routers";
import * as assetPricing from "./assetPricing";
import * as db from "./db";
import * as priceService from "./priceService";

import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("prices.refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refreshes exchange rates and all holdings, reporting live/cache counts", async () => {
    vi.mocked(db.getUserHoldings).mockResolvedValue([
      {
        asset: {
          id: 10,
          userId: 1,
          symbol: "AAPL",
          type: "stock",
          name: "Apple",
          baseCurrency: "USD",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        holding: {
          id: 100,
          userId: 1,
          assetId: 10,
          quantity: "2",
          costBasis: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      {
        asset: {
          id: 11,
          userId: 1,
          symbol: "0700.HK",
          type: "stock",
          name: "Tencent",
          baseCurrency: "HKD",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        holding: {
          id: 101,
          userId: 1,
          assetId: 11,
          quantity: "3",
          costBasis: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      {
        asset: {
          id: 12,
          userId: 1,
          symbol: "BTC",
          type: "crypto",
          name: "Bitcoin",
          baseCurrency: "USD",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        holding: {
          id: 102,
          userId: 1,
          assetId: 12,
          quantity: "0.1",
          costBasis: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ]);

    vi.mocked(priceService.fetchExchangeRates).mockResolvedValue({
      USD: 7.2468,
      HKD: 0.93,
      EUR: 7.81,
      JPY: 0.048,
      RUB: 0.079,
      CNY: 1,
    });

    vi.mocked(assetPricing.fetchAssetPriceWithFallback)
      .mockResolvedValueOnce({
        priceUSD: 210,
        priceCNY: 1521.828,
        change24h: 1.2,
        source: "live",
      })
      .mockResolvedValueOnce({
        priceUSD: 48,
        priceCNY: 347.8464,
        change24h: 0.5,
        source: "cache",
      })
      .mockResolvedValueOnce({
        priceUSD: 0,
        priceCNY: 0,
        change24h: 0,
        source: "empty",
      });

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.prices.refresh();

    expect(result).toEqual({
      success: true,
      assetCount: 3,
      liveCount: 1,
      cacheCount: 1,
      emptyCount: 1,
      exchangeRate: 7.2468,
    });
    expect(priceService.fetchExchangeRates).toHaveBeenCalledTimes(1);
    expect(assetPricing.fetchAssetPriceWithFallback).toHaveBeenNthCalledWith(
      1,
      10,
      "AAPL",
      "stock",
      expect.objectContaining({ USD: 7.2468 })
    );
    expect(assetPricing.fetchAssetPriceWithFallback).toHaveBeenNthCalledWith(
      2,
      11,
      "0700.HK",
      "stock",
      expect.objectContaining({ USD: 7.2468 })
    );
    expect(assetPricing.fetchAssetPriceWithFallback).toHaveBeenNthCalledWith(
      3,
      12,
      "BTC",
      "crypto",
      expect.objectContaining({ USD: 7.2468 })
    );
  });
});
