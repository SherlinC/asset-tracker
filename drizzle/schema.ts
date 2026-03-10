import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Asset types: currencies, cryptocurrencies, stocks
 */
export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Asset identifier: e.g., "USD", "HKD", "BTC", "ETH", "AAPL", "GOOGL"
  symbol: varchar("symbol", { length: 20 }).notNull(),
  // Asset type: currency, crypto, stock, fund (中国基金/天天基金)
  type: mysqlEnum("type", ["currency", "crypto", "stock", "fund"]).notNull(),
  // Display name: e.g., "US Dollar", "Bitcoin", "Apple Inc."
  name: varchar("name", { length: 100 }).notNull(),
  // Base currency for the asset (e.g., "CNY" for currencies, "USD" for crypto/stocks)
  baseCurrency: varchar("baseCurrency", { length: 10 }).default("CNY").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

/**
 * User holdings: quantity of each asset
 */
export const holdings = mysqlTable("holdings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  assetId: int("assetId").notNull(),
  // Quantity held
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  // Cost basis (optional, for future analytics)
  costBasis: decimal("costBasis", { precision: 18, scale: 8 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Holding = typeof holdings.$inferSelect;
export type InsertHolding = typeof holdings.$inferInsert;

/**
 * Real-time prices: cached price data with timestamps
 */
export const prices = mysqlTable("prices", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("assetId").notNull(),
  // Price in base currency (e.g., CNY for currencies, USD for crypto/stocks)
  price: decimal("price", { precision: 18, scale: 8 }).notNull(),
  // 24h change percentage
  change24h: decimal("change24h", { precision: 10, scale: 4 }),
  // Market cap (optional, for crypto)
  marketCap: decimal("marketCap", { precision: 20, scale: 2 }),
  // Last updated timestamp
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Price = typeof prices.$inferSelect;
export type InsertPrice = typeof prices.$inferInsert;

/**
 * Price history for analytics and charting
 */
export const priceHistory = mysqlTable("priceHistory", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("assetId").notNull(),
  price: decimal("price", { precision: 18, scale: 8 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;

/**
 * Portfolio value history for tracking portfolio performance over time
 */
export const portfolioValueHistory = mysqlTable("portfolioValueHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Total portfolio value in CNY
  totalValue: decimal("totalValue", { precision: 18, scale: 2 }).notNull(),
  // Timestamp of the snapshot
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PortfolioValueHistory = typeof portfolioValueHistory.$inferSelect;
export type InsertPortfolioValueHistory = typeof portfolioValueHistory.$inferInsert;
