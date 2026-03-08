export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const isOAuthConfigured = (): boolean =>
  Boolean(
    import.meta.env.VITE_OAUTH_PORTAL_URL &&
      import.meta.env.VITE_APP_ID
  );

const DEV_LOGOUT_COOKIE = "asset_tracker_dev_logout";

/** 开发模式下登出后会设置此 cookie；再次点「进入仪表盘」前需清除 */
export function clearDevLogoutCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DEV_LOGOUT_COOKIE}=; path=/; max-age=0`;
}

// Generate login URL at runtime so redirect URI reflects the current origin.
// When OAuth env is not configured (e.g. local dev), returns current page URL so app doesn't crash.
export const getLoginUrl = (): string => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  if (!oauthPortalUrl || !appId) {
    return typeof window !== "undefined" ? window.location.href : "";
  }
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
