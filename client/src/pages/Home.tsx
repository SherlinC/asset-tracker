import { TrendingUp, PieChart, BarChart3, RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  clearGuestMode,
  enableGuestMode,
  getLoginUrl,
  isOAuthConfigured,
} from "@/const";
import { useLanguage } from "@/hooks/useLanguage";
import { ROUTE_PATHS } from "@/lib/navigation";
import { trpc } from "@/lib/trpc";

import { DEFAULT_USD_CNY_RATE } from "@shared/exchangeRates";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const [location, navigate] = useLocation();
  const hasRedirected = useRef(false);
  const text =
    language === "zh"
      ? {
          loading: "加载中...",
          redirecting: "正在跳转到仪表盘…",
          signIn: "登录查看旧数据",
          signInHint: "进入你原来的账号数据与历史折线图",
          signInUnavailable: "当前环境未配置正式登录",
          noLocalAccounts: "当前没有可用于本地登录的旧账号记录。",
          recentAccounts: "本地旧账号",
          signingIn: "登录中...",
          signInFailed: "登录失败：",
          guestSignIn: "游客进入",
          guestHint: "本地体验，不覆盖你原来的账号数据",
          getStarted: "先用游客模式",
          getStartedAuth: "登录我的资产库",
          learnMore: "了解更多",
          heroPrefix: "实时追踪你的",
          heroHighlight: "资产组合",
          heroDesc:
            "跨多类资产监控你的投资组合，在一个统一面板里查看汇率、加密货币和股票实时行情。",
          totalValue: "总资产",
          feature1Title: "实时更新",
          feature1Desc: "持续获取汇率、加密货币和股票行情更新。",
          feature2Title: "组合分析",
          feature2Desc: "用图表查看你的资产配置分布，理解不同资产类别的占比。",
          feature3Title: "轻松管理",
          feature3Desc: "直观地添加、编辑和管理持仓，持续跟踪投资表现。",
          supported: "支持的资产",
          currencies: "货币",
          cryptos: "加密货币",
          usStocks: "美股",
          moreSoon: "更多即将支持...",
          footer: "版权所有。",
          switchLanguage: "EN",
          entryTitle: "选择进入方式",
          entryDescription: "一个入口看旧数据，一个入口做游客体验。",
          accountEntryTitle: "正式登录",
          accountEntryDesc: "查看你原来账号里的持仓、历史曲线和老数据。",
          guestEntryTitle: "游客模式",
          guestEntryDesc:
            "本机本地体验，适合试用和导入测试，不会覆盖旧账号数据。",
        }
      : {
          loading: "Loading...",
          redirecting: "Redirecting to dashboard…",
          signIn: "Sign in to old data",
          signInHint: "Open your original account portfolio and history",
          signInUnavailable:
            "Normal sign-in is not configured in this environment",
          noLocalAccounts:
            "No previous local accounts are available for sign-in.",
          recentAccounts: "Recent local accounts",
          signingIn: "Signing in...",
          signInFailed: "Sign-in failed: ",
          guestSignIn: "Continue as Guest",
          guestHint:
            "Local-only mode that does not overwrite your account data",
          getStarted: "Start with Guest Mode",
          getStartedAuth: "Open My Portfolio",
          learnMore: "Learn More",
          heroPrefix: "Track your",
          heroHighlight: "asset portfolio",
          heroDesc:
            "Monitor your investments across asset classes with live FX, crypto, and stock pricing in one dashboard.",
          totalValue: "Total Value",
          feature1Title: "Real-Time Updates",
          feature1Desc:
            "Get live exchange rates, cryptocurrency prices, and stock quotes throughout the day.",
          feature2Title: "Portfolio Analytics",
          feature2Desc:
            "Visualize your allocation across currencies, crypto, and stocks with interactive charts.",
          feature3Title: "Easy Management",
          feature3Desc:
            "Add, edit, and manage holdings with an intuitive interface and track performance effortlessly.",
          supported: "Supported Assets",
          currencies: "Currencies",
          cryptos: "Cryptocurrencies",
          usStocks: "US Stocks",
          moreSoon: "More coming soon...",
          footer: "All rights reserved.",
          switchLanguage: "中",
          entryTitle: "Choose your entry",
          entryDescription:
            "One path opens your existing data, the other starts a safe guest session.",
          accountEntryTitle: "Normal Sign-In",
          accountEntryDesc:
            "Open your original holdings, history chart, and saved account data.",
          guestEntryTitle: "Guest Mode",
          guestEntryDesc:
            "Local-only sandbox for trying imports and features without touching account data.",
        };

  const oauthConfigured = isOAuthConfigured();
  const utils = trpc.useUtils();
  const localAccountsQuery = trpc.auth.localAccounts.useQuery(undefined, {
    enabled: !oauthConfigured,
  });
  const localLogin = trpc.auth.localLogin.useMutation();

  useEffect(() => {
    if (
      location !== "/" ||
      !isAuthenticated ||
      !user ||
      user.loginMethod === "guest-access" ||
      hasRedirected.current
    )
      return;
    hasRedirected.current = true;
    navigate(ROUTE_PATHS.dashboard);
  }, [location, isAuthenticated, user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{text.loading}</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user && user.loginMethod !== "guest-access") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">{text.redirecting}</p>
      </div>
    );
  }

  const enterGuestDashboard = () => {
    enableGuestMode();
    navigate(ROUTE_PATHS.dashboard);
  };

  const enterLocalAccount = async (openId: string) => {
    try {
      clearGuestMode();
      await localLogin.mutateAsync({ openId });
      await utils.auth.me.invalidate();
      navigate(ROUTE_PATHS.dashboard);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`${text.signInFailed}${message}`);
    }
  };

  const enterAccountDashboard = () => {
    if (!oauthConfigured) {
      const localAccounts = localAccountsQuery.data ?? [];

      if (localAccounts.length === 1) {
        void enterLocalAccount(localAccounts[0].openId);
        return;
      }

      document.getElementById("account-entry-card")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    clearGuestMode();
    const loginUrl = getLoginUrl();

    if (loginUrl && loginUrl !== window.location.href) {
      window.location.href = loginUrl;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-foreground">
              Asset Tracker
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleLanguage}>
              {text.switchLanguage}
            </Button>
            <Button
              variant="outline"
              onClick={enterAccountDashboard}
              disabled={localLogin.isPending}
            >
              {localLogin.isPending ? text.signingIn : text.signIn}
            </Button>
            <Button onClick={enterGuestDashboard}>{text.guestSignIn}</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              {text.heroPrefix}{" "}
              <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                {text.heroHighlight}
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              {text.heroDesc}
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                className="text-base"
                variant="outline"
                onClick={enterAccountDashboard}
                disabled={localLogin.isPending}
              >
                {localLogin.isPending ? text.signingIn : text.getStartedAuth}
              </Button>
              <Button
                size="lg"
                className="text-base"
                onClick={enterGuestDashboard}
              >
                {text.getStarted}
              </Button>
              <Button size="lg" variant="outline" className="text-base">
                {text.learnMore}
              </Button>
            </div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>{text.signInHint}</p>
              <p>{text.guestHint}</p>
              {!oauthConfigured ? (
                <p>
                  {(localAccountsQuery.data?.length ?? 0) > 0
                    ? text.signInUnavailable
                    : text.noLocalAccounts}
                </p>
              ) : null}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-2xl blur-3xl"></div>
            <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
              <div className="space-y-6">
                {/* Portfolio Value */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {text.totalValue}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      ¥2,450,320
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>

                {/* Assets Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      symbol: "USD",
                      price: DEFAULT_USD_CNY_RATE.toFixed(2),
                      change: "+0.2%",
                    },
                    { symbol: "BTC", price: "88,410", change: "+0.18%" },
                    { symbol: "AAPL", price: "255.42", change: "+2.98%" },
                  ].map(asset => (
                    <div
                      key={asset.symbol}
                      className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                    >
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        {asset.symbol}
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {asset.price}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {asset.change}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-foreground">
            {text.entryTitle}
          </h2>
          <p className="mt-3 text-muted-foreground">{text.entryDescription}</p>
        </div>

        <div className="mb-20 grid gap-6 md:grid-cols-2">
          <Card className="border-slate-200 dark:border-slate-700">
            <div id="account-entry-card" />
            <CardHeader>
              <CardTitle>{text.accountEntryTitle}</CardTitle>
              <CardDescription>{text.accountEntryDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                variant="outline"
                onClick={enterAccountDashboard}
                disabled={localLogin.isPending}
              >
                {localLogin.isPending ? text.signingIn : text.signIn}
              </Button>
              {!oauthConfigured &&
              (localAccountsQuery.data?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    {text.recentAccounts}
                  </p>
                  {(localAccountsQuery.data ?? []).map(account => (
                    <Button
                      key={account.openId}
                      className="w-full justify-between"
                      variant="ghost"
                      onClick={() => {
                        void enterLocalAccount(account.openId);
                      }}
                      disabled={localLogin.isPending}
                    >
                      <span>
                        {account.name || account.email || account.openId}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {account.email || account.loginMethod || "local"}
                      </span>
                    </Button>
                  ))}
                </div>
              ) : null}
              {!oauthConfigured ? (
                <p className="text-sm text-muted-foreground">
                  {(localAccountsQuery.data?.length ?? 0) > 0
                    ? text.signInUnavailable
                    : text.noLocalAccounts}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle>{text.guestEntryTitle}</CardTitle>
              <CardDescription>{text.guestEntryDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={enterGuestDashboard}>
                {text.guestSignIn}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>{text.feature1Title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{text.feature1Desc}</CardDescription>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-4">
                <PieChart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle>{text.feature2Title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{text.feature2Desc}</CardDescription>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>{text.feature3Title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{text.feature3Desc}</CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Supported Assets */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-slate-200 dark:border-slate-700">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            {text.supported}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                {text.currencies}
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• US Dollar (USD)</li>
                <li>• Hong Kong Dollar (HKD)</li>
                <li>• Chinese Yuan (CNY)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                {text.cryptos}
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Bitcoin (BTC)</li>
                <li>• Ethereum (ETH)</li>
                <li>• {text.moreSoon}</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                {text.usStocks}
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Apple (AAPL)</li>
                <li>• Google (GOOGL)</li>
                <li>• Tesla (TSLA) & more...</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-muted-foreground">
          <p>&copy; 2026 Asset Tracker. {text.footer}</p>
        </div>
      </footer>
    </div>
  );
}
