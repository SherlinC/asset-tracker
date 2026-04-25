function parsePositiveIntEnv(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBooleanEnv(value: string | undefined) {
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  localLoginUsername: process.env.LOCAL_LOGIN_USERNAME ?? "",
  localLoginPasswordHash: process.env.LOCAL_LOGIN_PASSWORD_HASH ?? "",
  localLoginDisplayName: process.env.LOCAL_LOGIN_DISPLAY_NAME ?? "",
  localLoginEmail: process.env.LOCAL_LOGIN_EMAIL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  publicGuestOnly: parseBooleanEnv(
    process.env.PUBLIC_GUEST_ONLY ?? process.env.VITE_PUBLIC_GUEST_ONLY
  ),
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  /** 本地开发直通：未配置 OAuth 时使用该邮箱对应的用户进入仪表盘 */
  devUserEmail: process.env.DEV_USER_EMAIL ?? "",
  finnhubApiKey: process.env.FINNHUB_API_KEY ?? "",
  eodhdApiKey: process.env.EODHD_API_KEY ?? "",
  priceCacheMaxAgeMinutes: parsePositiveIntEnv(
    process.env.PRICE_CACHE_MAX_AGE_MINUTES,
    30
  ),
};
