import { z } from "zod";

import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { DEFAULT_USD_CNY_RATE } from "@shared/exchangeRates";

import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import {
  nonGuestProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "./_core/trpc";
import { fetchAssetPriceWithFallback } from "./assetPricing";
import * as db from "./db";
import { searchEastMoneyFunds } from "./eastMoneyFund";
import { searchEastMoneyStocks } from "./eastMoneyStock";
import { searchInternationalFunds } from "./eodhdFund";
import { searchNasdaqEtfs } from "./nasdaqEtf";
import * as priceService from "./priceService";
import { generateLiveStrategy } from "./strategyAdvisor";

import type { PriceIssueCode } from "./internationalFundUtils";

const strategyPortfolioAssetSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  type: z.string(),
  quantity: z.number(),
  priceUSD: z.number(),
  valueUSD: z.number(),
});

const strategyPortfolioSnapshotSchema = z.object({
  totalValueUSD: z.number(),
  totalValueCNY: z.number(),
  exchangeRate: z.number(),
  assets: z.array(strategyPortfolioAssetSchema),
});

type PortfolioAssetSummary = {
  id: number;
  symbol: string;
  name: string;
  type: string;
  quantity: number;
  priceUSD: number;
  valueUSD: number;
  change24h: number;
  issueCode?: PriceIssueCode;
  holding: Awaited<ReturnType<typeof db.getUserHoldings>>[number]["holding"];
};

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export function getHoldingInterestMultiplier(
  assetType: string,
  annualInterestRate: string | null,
  createdAt: Date,
  now: number = Date.now()
) {
  if (assetType !== "currency") {
    return 1;
  }

  const parsedAnnualInterestRate = Number.parseFloat(annualInterestRate ?? "");

  if (
    !Number.isFinite(parsedAnnualInterestRate) ||
    parsedAnnualInterestRate <= 0
  ) {
    return 1;
  }

  const elapsedMs = Math.max(now - createdAt.getTime(), 0);
  return 1 + (parsedAnnualInterestRate / 100) * (elapsedMs / MS_PER_YEAR);
}

type HoldingWithAsset = Awaited<ReturnType<typeof db.getUserHoldings>>;

async function priceUserHoldings(
  holdings: HoldingWithAsset,
  exchangeRates?: Record<string, number>,
  persistPriceCache: boolean = true
): Promise<PortfolioAssetSummary[]> {
  return Promise.all(
    holdings.map(async h => {
      const symbol = h.asset.symbol;
      const type = h.asset.type;
      const quantity = parseFloat(h.holding.quantity);

      try {
        const priceData = await fetchAssetPriceWithFallback(
          persistPriceCache ? h.asset.id : null,
          symbol,
          type,
          exchangeRates
        );
        const interestMultiplier = getHoldingInterestMultiplier(
          h.asset.type,
          h.holding.annualInterestRate,
          h.holding.createdAt
        );
        const priceUSD = priceData.priceUSD * interestMultiplier;
        const valueUSD = quantity * priceUSD;

        return {
          id: h.asset.id,
          symbol: h.asset.symbol,
          name: h.asset.name,
          type: h.asset.type,
          quantity,
          priceUSD,
          valueUSD,
          change24h: priceData.change24h,
          issueCode: priceData.issueCode,
          holding: h.holding,
        } satisfies PortfolioAssetSummary;
      } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);

        return {
          id: h.asset.id,
          symbol: h.asset.symbol,
          name: h.asset.name,
          type: h.asset.type,
          quantity,
          priceUSD: 0,
          valueUSD: 0,
          change24h: 0,
          issueCode: undefined,
          holding: h.holding,
        } satisfies PortfolioAssetSummary;
      }
    })
  );
}

async function buildPortfolioSummary(
  holdings: HoldingWithAsset,
  persistPriceCache: boolean = true
) {
  const exchangeRates = await priceService.fetchExchangeRates();
  const assets = await priceUserHoldings(
    holdings,
    exchangeRates,
    persistPriceCache
  );
  const totalValueUSD = assets.reduce((sum, asset) => sum + asset.valueUSD, 0);
  const usdToCny = exchangeRates.USD || DEFAULT_USD_CNY_RATE;

  return {
    assets,
    totalValueUSD,
    totalValueCNY: totalValueUSD * usdToCny,
    exchangeRate: usdToCny,
  };
}

// Helper function to record portfolio value (uses same real-time API as portfolio.summary so chart matches summary)
async function recordPortfolioValue(userId: number) {
  const summary = await db.getUserHoldings(userId);

  if (summary.length === 0) {
    await db.recordPortfolioValue(userId, "0");
    return;
  }

  const exchangeRates = await priceService.fetchExchangeRates();
  const pricedHoldings = await priceUserHoldings(summary, exchangeRates);
  const totalValueUSD = pricedHoldings.reduce(
    (sum, holding) => sum + holding.valueUSD,
    0
  );

  await db.recordPortfolioValue(userId, totalValueUSD.toString());
}

function recordPortfolioValueInBackground(userId: number) {
  void recordPortfolioValue(userId).catch(error => {
    console.error(
      `[Portfolio History] Failed to record portfolio value for user ${userId}:`,
      error
    );
  });
}

async function refreshUserMarketData(userId: number) {
  const holdings = await db.getUserHoldings(userId);
  const exchangeRates = await priceService.fetchExchangeRates();

  if (holdings.length === 0) {
    return {
      success: true as const,
      assetCount: 0,
      liveCount: 0,
      cacheCount: 0,
      emptyCount: 0,
      exchangeRate: exchangeRates.USD || DEFAULT_USD_CNY_RATE,
    };
  }

  const results = await Promise.all(
    holdings.map(async holding => {
      const price = await fetchAssetPriceWithFallback(
        holding.asset.id,
        holding.asset.symbol,
        holding.asset.type,
        exchangeRates
      );

      return {
        symbol: holding.asset.symbol,
        source: price.source,
      };
    })
  );

  const liveCount = results.filter(result => result.source === "live").length;
  const cacheCount = results.filter(result => result.source === "cache").length;
  const emptyCount = results.filter(result => result.source === "empty").length;

  return {
    success: true as const,
    assetCount: holdings.length,
    liveCount,
    cacheCount,
    emptyCount,
    exchangeRate: exchangeRates.USD || DEFAULT_USD_CNY_RATE,
  };
}

export const appRouter = router({
  system: systemRouter,
  fund: router({
    search: publicProcedure
      .input(
        z.object({
          q: z.string().optional().default(""),
          limit: z.number().min(1).max(100).optional().default(50),
        })
      )
      .query(async ({ input }) => {
        return searchEastMoneyFunds(input.q, input.limit);
      }),
    usEtfSearch: protectedProcedure
      .input(
        z.object({
          q: z.string().optional().default(""),
          limit: z.number().min(1).max(100).optional().default(50),
        })
      )
      .query(async ({ input }) => {
        return searchNasdaqEtfs(input.q, input.limit);
      }),
    internationalSearch: protectedProcedure
      .input(
        z.object({
          q: z.string().optional().default(""),
          limit: z.number().min(1).max(50).optional().default(20),
        })
      )
      .query(async ({ input }) => {
        return searchInternationalFunds(input.q, input.limit);
      }),
  }),
  stock: router({
    search: protectedProcedure
      .input(
        z.object({
          q: z.string().optional().default(""),
          limit: z.number().min(1).max(100).optional().default(50),
        })
      )
      .query(async ({ input }) => {
        return searchEastMoneyStocks(input.q, input.limit);
      }),
  }),
  strategy: router({
    generate: protectedProcedure
      .input(
        z.object({
          language: z.enum(["zh", "en"]),
          portfolio: strategyPortfolioSnapshotSchema,
        })
      )
      .mutation(async ({ input }) => {
        return generateLiveStrategy(input.language, input.portfolio);
      }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    localAccounts: publicProcedure.query(async () => {
      if (ENV.isProduction || ENV.oAuthServerUrl.length > 0) {
        return [];
      }

      const users = await db.listRecentUsers(20);

      return users
        .filter(user => user.openId !== "guest-local")
        .map(user => ({
          openId: user.openId,
          name: user.name,
          email: user.email,
          loginMethod: user.loginMethod,
          lastSignedIn: user.lastSignedIn,
        }));
    }),
    localLogin: publicProcedure
      .input(
        z.object({
          openId: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ENV.isProduction || ENV.oAuthServerUrl.length > 0) {
          throw new Error("Local login is not available in this environment.");
        }

        const user = await db.getUserByOpenId(input.openId);

        if (!user) {
          throw new Error("Account not found.");
        }

        await db.upsertUser({
          openId: user.openId,
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);

        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });
        ctx.res.clearCookie("asset_tracker_guest_mode", {
          path: "/",
          maxAge: -1,
        });

        return {
          success: true,
        } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie("asset_tracker_guest_mode", {
        path: "/",
        maxAge: -1,
      });
      return {
        success: true,
      } as const;
    }),
  }),

  // Asset management
  assets: router({
    // Get all assets for current user
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserAssets(ctx.user.id);
    }),

    // Create a new asset
    create: nonGuestProcedure
      .input(
        z.object({
          symbol: z.string(),
          type: z.enum(["currency", "crypto", "stock", "fund"]),
          name: z.string(),
          baseCurrency: z.string().default("CNY"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.getOrCreateAsset(
          ctx.user.id,
          input.symbol,
          input.type,
          input.name,
          input.baseCurrency
        );
      }),
  }),

  // Holdings management
  holdings: router({
    // Get all holdings for current user with asset details
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserHoldings(ctx.user.id);
    }),

    // Add a new holding
    add: nonGuestProcedure
      .input(
        z.object({
          assetId: z.number(),
          quantity: z.string(),
          costBasis: z.string().optional(),
          annualInterestRate: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await db.addHolding(
          ctx.user.id,
          input.assetId,
          input.quantity,
          input.costBasis,
          input.annualInterestRate
        );
        // Record the snapshot in the background so writes return quickly.
        recordPortfolioValueInBackground(ctx.user.id);
        return result;
      }),

    // Update a holding
    update: nonGuestProcedure
      .input(
        z.object({
          holdingId: z.number(),
          quantity: z.string(),
          costBasis: z.string().optional(),
          annualInterestRate: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const holding = await db.getUserHoldings(ctx.user.id);
        if (!holding.some(h => h.holding.id === input.holdingId)) {
          throw new Error("Unauthorized");
        }
        const result = await db.updateHolding(
          input.holdingId,
          input.quantity,
          input.costBasis,
          input.annualInterestRate
        );
        // Record the snapshot in the background so writes return quickly.
        recordPortfolioValueInBackground(ctx.user.id);
        return result;
      }),

    // Delete a holding
    delete: nonGuestProcedure
      .input(
        z.object({
          holdingId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const holding = await db.getUserHoldings(ctx.user.id);
        if (!holding.some(h => h.holding.id === input.holdingId)) {
          throw new Error("Unauthorized");
        }
        await db.deleteHolding(input.holdingId);
        recordPortfolioValueInBackground(ctx.user.id);
        return { success: true };
      }),

    replaceAll: nonGuestProcedure
      .input(
        z.object({
          holdings: z.array(
            z.object({
              assetId: z.number(),
              quantity: z.string(),
              costBasis: z.string().optional(),
              annualInterestRate: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userAssets = await db.getUserAssets(ctx.user.id);
        const allowedAssetIds = new Set(userAssets.map(asset => asset.id));

        if (
          input.holdings.some(holding => !allowedAssetIds.has(holding.assetId))
        ) {
          throw new Error("Unauthorized asset reference");
        }

        await db.replaceUserHoldings(ctx.user.id, input.holdings);
        recordPortfolioValueInBackground(ctx.user.id);

        return { success: true };
      }),
  }),

  // Prices
  prices: router({
    // Get current prices for specific assets
    current: protectedProcedure
      .input(
        z.object({
          assetIds: z.array(z.number()),
        })
      )
      .query(async ({ input }) => {
        if (input.assetIds.length === 0) return [];
        return db.getPrices(input.assetIds);
      }),

    // Fetch real-time price for a single asset
    fetchSingle: protectedProcedure
      .input(
        z.object({
          assetId: z.number().optional(),
          symbol: z.string(),
          type: z.enum(["currency", "crypto", "stock", "fund"]),
        })
      )
      .query(async ({ input }) => {
        return fetchAssetPriceWithFallback(
          input.assetId,
          input.symbol,
          input.type
        );
      }),

    // Refresh all prices for current user's holdings
    refresh: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.loginMethod === "guest-access") {
        return {
          success: true as const,
          assetCount: 0,
          liveCount: 0,
          cacheCount: 0,
          emptyCount: 0,
          exchangeRate: DEFAULT_USD_CNY_RATE,
        };
      }

      return refreshUserMarketData(ctx.user.id);
    }),

    // Get exchange rates
    exchangeRates: publicProcedure.query(async () => {
      return priceService.fetchExchangeRates();
    }),
  }),

  // Portfolio management
  portfolio: router({
    // Get portfolio summary
    summary: protectedProcedure.query(async ({ ctx }) => {
      const holdings = await db.getUserHoldings(ctx.user.id);
      return buildPortfolioSummary(holdings);
    }),

    preview: protectedProcedure
      .input(
        z.object({
          assets: z.array(
            z.object({
              id: z.number(),
              symbol: z.string(),
              type: z.enum(["currency", "crypto", "stock", "fund"]),
              name: z.string(),
              baseCurrency: z.string(),
            })
          ),
          holdings: z.array(
            z.object({
              id: z.number(),
              assetId: z.number(),
              quantity: z.string(),
              costBasis: z.string().nullable().optional(),
              annualInterestRate: z.string().nullable().optional(),
              createdAt: z.date(),
              updatedAt: z.date(),
            })
          ),
        })
      )
      .query(async ({ input }) => {
        const assetsById = new Map(
          input.assets.map(asset => [asset.id, asset])
        );
        const joinedHoldings: HoldingWithAsset = input.holdings.flatMap(
          holding => {
            const asset = assetsById.get(holding.assetId);

            if (!asset) {
              return [];
            }

            return [
              {
                holding: {
                  id: holding.id,
                  userId: 0,
                  assetId: holding.assetId,
                  quantity: holding.quantity,
                  costBasis: holding.costBasis ?? null,
                  annualInterestRate: holding.annualInterestRate ?? null,
                  createdAt: holding.createdAt,
                  updatedAt: holding.updatedAt,
                },
                asset: {
                  ...asset,
                  userId: 0,
                  createdAt: holding.createdAt,
                  updatedAt: holding.updatedAt,
                },
              },
            ];
          }
        );

        return buildPortfolioSummary(joinedHoldings, false);
      }),
  }),

  portfolioHistory: router({
    // Record current portfolio value
    record: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.loginMethod === "guest-access") {
        return { success: true };
      }

      await recordPortfolioValue(ctx.user.id);
      return { success: true };
    }),

    // Get portfolio value history
    get: protectedProcedure
      .input(
        z.object({
          days: z.number().default(30),
        })
      )
      .query(async ({ ctx, input }) => {
        if (ctx.user.loginMethod === "guest-access") {
          return [];
        }

        return db.getPortfolioValueHistory(ctx.user.id, input.days);
      }),

    // Get portfolio value history by date range
    getByRange: protectedProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ ctx, input }) => {
        if (ctx.user.loginMethod === "guest-access") {
          return [];
        }

        return db.getPortfolioValueHistoryByRange(
          ctx.user.id,
          input.startDate,
          input.endDate
        );
      }),
  }),
});

export type AppRouter = typeof appRouter;
