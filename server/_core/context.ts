import { parse as parseCookie } from "cookie";

import * as db from "../db";
import { ENV } from "./env";
import { sdk } from "./sdk";

import type { User } from "../../drizzle/schema";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

const GUEST_MODE_COOKIE = "asset_tracker_guest_mode";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  const cookies = parseCookie(opts.req.headers.cookie ?? "");
  const hasGuestMode = cookies[GUEST_MODE_COOKIE] === "1";

  const buildFallbackUser = (): User => {
    const now = new Date();
    const fallbackName = !ENV.publicGuestOnly && ENV.devUserEmail
      ? ENV.devUserEmail.split("@")[0] || "Guest User"
      : "Guest User";

    return {
      id: 0,
      openId: "guest-local",
      name: fallbackName,
      email: null,
      loginMethod: "guest-access",
      role: "user",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    };
  };

  if (!user) {
    if (ENV.publicGuestOnly) {
      user = buildFallbackUser();
    }

    try {
      // Check for guest mode first
      if (user) {
        // Public guest-only mode already resolves to guest access.
      } else if (hasGuestMode) {
        user = buildFallbackUser();
      } else {
        // Try to authenticate user
        user = await sdk.authenticateRequest(opts.req);
        
        // If authentication fails, try to get dev user in non-production environment
        if (!user && !ENV.isProduction && !ENV.oAuthServerUrl && ENV.devUserEmail.length > 0) {
          user = await db.getOrCreateDevUser(ENV.devUserEmail);
        }
        
        // If all fails, use fallback user
        if (!user) {
          user = buildFallbackUser();
        }
      }
    } catch (err) {
      console.warn("[Guest access fallback]", (err as Error).message);
      user = buildFallbackUser();
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
