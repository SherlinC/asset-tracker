export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const isOAuthConfigured = (): boolean =>
  Boolean(import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID);

const GUEST_MODE_COOKIE = "asset_tracker_guest_mode";

export function enableGuestMode(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${GUEST_MODE_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}`;
}

export function clearGuestMode(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${GUEST_MODE_COOKIE}=; path=/; max-age=0`;
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
