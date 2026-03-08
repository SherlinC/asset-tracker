import { parse as parseCookie } from "cookie";

import * as db from "../db";
import { ENV } from "./env";
import { sdk } from "./sdk";

import type { User } from "../../drizzle/schema";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

const DEV_LOGOUT_COOKIE = "asset_tracker_dev_logout";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  const isDevBypass =
    !ENV.isProduction &&
    !ENV.oAuthServerUrl &&
    ENV.devUserEmail.length > 0 &&
    ENV.databaseUrl.length > 0;

  const cookies = parseCookie(opts.req.headers.cookie ?? "");
  const hasDevLogout = Boolean(cookies[DEV_LOGOUT_COOKIE]);

  if (isDevBypass && !hasDevLogout) {
    try {
      user = await db.getOrCreateDevUser(ENV.devUserEmail);
    } catch (err) {
      console.warn("[Dev bypass] Failed (e.g. MySQL not running):", (err as Error).message);
      user = null;
    }
  }

  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
