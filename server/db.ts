import { eq, and, inArray, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool, type Pool, type PoolOptions } from "mysql2";

import {
  assets,
  holdings,
  portfolioValueHistory,
  priceHistory,
  prices,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

import type { InsertUser, User } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;
const UTC_TIME_ZONE_QUERY = "SET time_zone = '+00:00'";

function buildMysqlPoolOptions(databaseUrl: string): PoolOptions {
  return {
    uri: databaseUrl,
    timezone: "Z",
  };
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = createPool(buildMysqlPoolOptions(process.env.DATABASE_URL));
      _pool.on("connection", connection => {
        connection.query(UTC_TIME_ZONE_QUERY, error => {
          if (error) {
            console.warn(
              "[Database] Failed to set UTC session timezone:",
              error
            );
          }
        });
      });

      const connection = await _pool.promise().getConnection();
      try {
        await connection.query(UTC_TIME_ZONE_QUERY);
      } finally {
        connection.release();
      }

      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

export { buildMysqlPoolOptions };

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

const DEV_OPEN_ID = "dev-local";

/** 本地开发直通：获取或创建开发用户（openId=dev-local），需配置 DATABASE_URL 和 DEV_USER_EMAIL */
export async function getOrCreateDevUser(email: string): Promise<User | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const user = await getUserByOpenId(DEV_OPEN_ID);
    if (user) return user;
    await upsertUser({
      openId: DEV_OPEN_ID,
      email,
      name: email.split("@")[0] || "Dev User",
      loginMethod: "dev-bypass",
      lastSignedIn: new Date(),
    });
    return (await getUserByOpenId(DEV_OPEN_ID)) ?? null;
  } catch (err) {
    console.warn("[getOrCreateDevUser]", (err as Error).message);
    return null;
  }
}

// Asset queries
export async function getOrCreateAsset(
  userId: number,
  symbol: string,
  type: "currency" | "crypto" | "stock" | "fund",
  name: string,
  baseCurrency: string = "CNY"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(assets)
    .where(and(eq(assets.userId, userId), eq(assets.symbol, symbol)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  await db.insert(assets).values({
    userId,
    symbol,
    type,
    name,
    baseCurrency,
  });

  const created = await db
    .select()
    .from(assets)
    .where(and(eq(assets.userId, userId), eq(assets.symbol, symbol)))
    .limit(1);
  return created[0];
}

export async function getUserAssets(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(assets).where(eq(assets.userId, userId));
}

// Holdings queries
export async function getUserHoldings(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      holding: holdings,
      asset: assets,
    })
    .from(holdings)
    .innerJoin(assets, eq(holdings.assetId, assets.id))
    .where(eq(holdings.userId, userId));

  return result;
}

export async function addHolding(
  userId: number,
  assetId: number,
  quantity: string,
  costBasis?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(holdings).values({
    userId,
    assetId,
    quantity,
    costBasis,
  });

  const created = await db
    .select()
    .from(holdings)
    .where(and(eq(holdings.userId, userId), eq(holdings.assetId, assetId)))
    .orderBy(holdings.id)
    .limit(1);
  return created[created.length - 1];
}

export async function updateHolding(
  holdingId: number,
  quantity: string,
  costBasis?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = { quantity };
  if (costBasis !== undefined) {
    updateData.costBasis = costBasis === "" ? null : costBasis;
  }

  await db.update(holdings).set(updateData).where(eq(holdings.id, holdingId));

  return (
    await db.select().from(holdings).where(eq(holdings.id, holdingId)).limit(1)
  )[0];
}

export async function deleteHolding(holdingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(holdings).where(eq(holdings.id, holdingId));
}

export async function replaceUserHoldings(
  userId: number,
  nextHoldings: Array<{
    assetId: number;
    quantity: string;
    costBasis?: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.transaction(async tx => {
    await tx.delete(holdings).where(eq(holdings.userId, userId));

    if (nextHoldings.length === 0) {
      return;
    }

    await tx.insert(holdings).values(
      nextHoldings.map(holding => ({
        userId,
        assetId: holding.assetId,
        quantity: holding.quantity,
        costBasis: holding.costBasis ?? null,
      }))
    );
  });
}

// Price queries
export async function upsertPrice(
  assetId: number,
  price: string,
  change24h?: string,
  marketCap?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(prices)
    .where(eq(prices.assetId, assetId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(prices)
      .set({
        price,
        change24h,
        marketCap,
        updatedAt: new Date(),
      })
      .where(eq(prices.assetId, assetId));
    return (
      await db.select().from(prices).where(eq(prices.assetId, assetId)).limit(1)
    )[0];
  }

  await db.insert(prices).values({
    assetId,
    price,
    change24h,
    marketCap,
  });

  return (
    await db.select().from(prices).where(eq(prices.assetId, assetId)).limit(1)
  )[0];
}

export async function getPrices(assetIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (assetIds.length === 0) return [];

  return db.select().from(prices).where(inArray(prices.assetId, assetIds));
}

export async function getPriceByAssetId(assetId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(prices)
    .where(eq(prices.assetId, assetId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

// Price history
export async function addPriceHistory(assetId: number, price: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(priceHistory).values({
    assetId,
    price,
  });
}

// Portfolio value history
export async function recordPortfolioValue(userId: number, totalValue: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(portfolioValueHistory).values({
    userId,
    totalValue,
  });
}

export async function getPortfolioValueHistory(
  userId: number,
  days: number = 30
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  return db
    .select()
    .from(portfolioValueHistory)
    .where(
      and(
        eq(portfolioValueHistory.userId, userId),
        gte(portfolioValueHistory.timestamp, sinceDate)
      )
    )
    .orderBy(portfolioValueHistory.timestamp);
}

export async function getPortfolioValueHistoryByRange(
  userId: number,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(portfolioValueHistory)
    .where(
      and(
        eq(portfolioValueHistory.userId, userId),
        gte(portfolioValueHistory.timestamp, startDate),
        lte(portfolioValueHistory.timestamp, endDate)
      )
    )
    .orderBy(portfolioValueHistory.timestamp);
}
