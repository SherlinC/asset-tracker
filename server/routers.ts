import { z } from "zod";

import { COOKIE_NAME } from "@shared/const";
import { DEFAULT_USD_CNY_RATE } from "@shared/exchangeRates";

import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { fetchAssetPriceWithFallback } from "./assetPricing";
import * as db from "./db";
import { searchEastMoneyFunds } from "./eastMoneyFund";
import { searchEastMoneyStocks } from "./eastMoneyStock";
import { searchInternationalFunds } from "./eodhdFund";
import { searchNasdaqEtfs } from "./nasdaqEtf";
import * as priceService from "./priceService";

type PortfolioAssetSummary = {
  id: number;
  symbol: string;
  name: string;
  type: string;
  quantity: number;
  priceUSD: number;
  valueUSD: number;
  change24h: number;
  holding: Awaited<ReturnType<typeof db.getUserHoldings>>[number]["holding"];
};

async function priceUserHoldings(
  holdings: Awaited<ReturnType<typeof db.getUserHoldings>>,
  exchangeRates?: Record<string, number>
): Promise<PortfolioAssetSummary[]> {
  return Promise.all(
    holdings.map(async h => {
      const symbol = h.asset.symbol;
      const type = h.asset.type;
      const quantity = parseFloat(h.holding.quantity);

      try {
        const priceData = await fetchAssetPriceWithFallback(
          h.asset.id,
          symbol,
          type,
          exchangeRates
        );
        const priceUSD = priceData.priceUSD;
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
          holding: h.holding,
        } satisfies PortfolioAssetSummary;
      }
    })
  );
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
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      const isDevBypass =
        !ENV.isProduction &&
        !ENV.oAuthServerUrl &&
        ENV.devUserEmail.length > 0 &&
        ENV.databaseUrl.length > 0;
      if (isDevBypass) {
        ctx.res.cookie("asset_tracker_dev_logout", "1", {
          path: "/",
          maxAge: 3600,
          httpOnly: false,
          sameSite: "lax",
        });
      }
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
    create: protectedProcedure
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
    add: protectedProcedure
      .input(
        z.object({
          assetId: z.number(),
          quantity: z.string(),
          costBasis: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await db.addHolding(
          ctx.user.id,
          input.assetId,
          input.quantity,
          input.costBasis
        );
        // Auto-record portfolio value after adding holding
        await recordPortfolioValue(ctx.user.id);
        return result;
      }),

    // Update a holding
    update: protectedProcedure
      .input(
        z.object({
          holdingId: z.number(),
          quantity: z.string(),
          costBasis: z.string().optional(),
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
          input.costBasis
        );
        // Auto-record portfolio value after updating holding
        await recordPortfolioValue(ctx.user.id);
        return result;
      }),

    // Delete a holding
    delete: protectedProcedure
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
        // Auto-record portfolio value after deleting holding
        await recordPortfolioValue(ctx.user.id);
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

    // Refresh all prices (placeholder)
    refresh: protectedProcedure.mutation(async () => {
      return { success: true };
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
      const exchangeRates = await priceService.fetchExchangeRates();
      const assets = await priceUserHoldings(holdings, exchangeRates);
      const totalValueUSD = assets.reduce(
        (sum, asset) => sum + asset.valueUSD,
        0
      );

      const usdToCny = exchangeRates.USD || DEFAULT_USD_CNY_RATE;
      const totalValueCNY = totalValueUSD * usdToCny;

      return {
        assets,
        totalValueUSD,
        totalValueCNY,
        exchangeRate: usdToCny,
      };
    }),
  }),

  portfolioHistory: router({
    // Record current portfolio value
    record: protectedProcedure.mutation(async ({ ctx }) => {
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
        return db.getPortfolioValueHistoryByRange(
          ctx.user.id,
          input.startDate,
          input.endDate
        );
      }),
  }),
});

export type AppRouter = typeof appRouter;
