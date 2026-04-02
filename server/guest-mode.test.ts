import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getOrCreateAsset: vi.fn(),
  recordPortfolioValue: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";

import type { TrpcContext } from "./_core/context";

function createGuestContext(): TrpcContext {
  const now = new Date();

  return {
    user: {
      id: 0,
      openId: "guest-local",
      name: "Guest User",
      email: null,
      loginMethod: "guest-access",
      role: "user",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    req: {
      protocol: "http",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("guest mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks asset creation for guest users", async () => {
    const caller = appRouter.createCaller(createGuestContext());

    await expect(
      caller.assets.create({
        symbol: "BTC",
        type: "crypto",
        name: "Bitcoin",
        baseCurrency: "USD",
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Guest mode does not persist account data.",
    });

    expect(db.getOrCreateAsset).not.toHaveBeenCalled();
  });

  it("skips portfolio history persistence for guest users", async () => {
    const caller = appRouter.createCaller(createGuestContext());

    await expect(caller.portfolioHistory.record()).resolves.toEqual({
      success: true,
    });

    expect(db.recordPortfolioValue).not.toHaveBeenCalled();
  });
});
