import {
  Brain,
  Map,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type LocalizedText = {
  zh: string;
  en: string;
};

export const ROUTE_PATHS = {
  home: "/",
  dashboard: "/dashboard",
  importPreview: "/import-preview",
  spendover: "/spendover",
  aiStrategy: "/ai-strategy",
  walletPlanning: "/wallet-planning",
  page2: "/page2",
  assetDetail: "/asset/:id",
  notFound: "/404",
} as const;

export type RouteComponentKey =
  | "home"
  | "dashboard"
  | "importPreview"
  | "spendover"
  | "aiStrategy"
  | "walletPlanning"
  | "page2"
  | "assetDetail"
  | "notFound";

export type AppRoute = {
  path: string;
  component: RouteComponentKey;
};

type NavigationItem = {
  icon: LucideIcon;
  label: LocalizedText;
  path: string;
};

export const APP_ROUTES: AppRoute[] = [
  { path: ROUTE_PATHS.home, component: "home" },
  { path: ROUTE_PATHS.dashboard, component: "dashboard" },
  { path: ROUTE_PATHS.importPreview, component: "importPreview" },
  { path: ROUTE_PATHS.spendover, component: "spendover" },
  { path: ROUTE_PATHS.aiStrategy, component: "aiStrategy" },
  { path: ROUTE_PATHS.walletPlanning, component: "walletPlanning" },
  { path: ROUTE_PATHS.page2, component: "page2" },
  { path: ROUTE_PATHS.assetDetail, component: "assetDetail" },
  { path: ROUTE_PATHS.notFound, component: "notFound" },
];

export const DASHBOARD_NAV_ITEMS: NavigationItem[] = [
  {
    icon: UtensilsCrossed,
    label: { zh: "坐吃山空", en: "Spendover" },
    path: ROUTE_PATHS.spendover,
  },
  {
    icon: Wallet,
    label: { zh: "资产组合", en: "Asset Portfolio" },
    path: ROUTE_PATHS.dashboard,
  },
  {
    icon: Brain,
    label: { zh: "AI 策略", en: "AI Strategy" },
    path: ROUTE_PATHS.aiStrategy,
  },
  {
    icon: Map,
    label: { zh: "钱包规划", en: "Wallet Planning" },
    path: ROUTE_PATHS.walletPlanning,
  },
];

export function pickLocalizedText(text: LocalizedText, isZh: boolean): string {
  return isZh ? text.zh : text.en;
}
