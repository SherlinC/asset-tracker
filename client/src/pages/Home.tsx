import {
  BarChart3,
  Moon,
  PieChart,
  RefreshCw,
  Sun,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

import { useAuth } from "@/_core/hooks/useAuth";
import NoodlePanel from "@/components/NoodlePanel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clearGuestMode,
  enableGuestMode,
  getLoginUrl,
  isPublicGuestOnly,
  isOAuthConfigured,
} from "@/const";
import { useTheme } from "@/contexts/ThemeContext";
import { resetGuestPortfolioToSeed } from "@/hooks/useGuestPortfolio";
import { ROUTE_PATHS } from "@/lib/navigation";
import { trpc } from "@/lib/trpc";

import { DEFAULT_USD_CNY_RATE } from "@shared/exchangeRates";

const HOME_TOTAL_ASSETS_CNY = 2450320;

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, navigate] = useLocation();
  const hasRedirected = useRef(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const text = {
    loading: "加载中...",
    redirecting: "正在跳转到仪表盘…",
    signIn: "登录",
    signInHint: "公开站点默认开放游客体验，历史数据仅站长本人可用。",
    signInUnavailable: "当前环境未配置站长登录",
    noLocalAccounts: "当前没有可用于本地登录的旧账号记录。",
    recentAccounts: "本地旧账号",
    signingIn: "登录中...",
    signInFailed: "登录失败：",
    guestSignIn: "游客进入",
    guestHint: "本地体验，不覆盖你原来的账号数据",
    guestOnlyHeadline: "当前公开站点仅开放游客体验。",
    guestOnlyHint: "如需查看站长历史数据，请使用私有环境或本地版本。",
    getStarted: "先用游客模式",
    getStartedAuth: "登录",
    learnMore: "了解更多",
    heroPrefix: "欢迎来到",
    heroHighlight: "坐吃山空",
    heroDesc:
      "用一个统一面板管理你的货币、加密货币和股票资产，直观看清总资产、仓位结构与实时波动。",
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
    entryTitle: "选择进入方式",
    entryDescription: "一个入口看旧数据，一个入口做游客体验。",
    accountEntryTitle: "正式登录",
    accountEntryDesc: "查看你原来账号里的持仓、历史曲线和老数据。",
    guestEntryTitle: "游客模式",
    guestEntryDesc: "本机本地体验，适合试用和导入测试，不会覆盖旧账号数据。",
    username: "用户名",
    password: "密码",
    login: "登录",
    switchToDark: "深色模式",
    switchToLight: "浅色模式",
  };

  const oauthConfigured = isOAuthConfigured();
  const publicGuestOnly = isPublicGuestOnly();
  const utils = trpc.useUtils();
  const localLogin = trpc.auth.localLogin.useMutation();
  const exchangeRatesQuery = trpc.prices.exchangeRates.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const guestOnlyRequested =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("guestOnly") === "1";
  const homeUsdCnyRate =
    exchangeRatesQuery.data?.USD && exchangeRatesQuery.data.USD > 0
      ? exchangeRatesQuery.data.USD
      : DEFAULT_USD_CNY_RATE;

  useEffect(() => {
    document.title = "坐吃山空";
  }, []);

  useEffect(() => {
    // Check if this is a logout redirect
    const isLogoutRedirect = typeof window !== "undefined" && 
      new URLSearchParams(window.location.search).get("logout") === "1";
    
    if (
      location !== ROUTE_PATHS.home ||
      !isAuthenticated ||
      !user ||
      user.loginMethod === "guest-access" ||
      hasRedirected.current ||
      isLogoutRedirect
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

  if (isAuthenticated && user && user.loginMethod !== "guest-access" && 
      !(typeof window !== "undefined" && 
        new URLSearchParams(window.location.search).get("logout") === "1")) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">{text.redirecting}</p>
      </div>
    );
  }

  const enterGuestDashboard = () => {
    resetGuestPortfolioToSeed();
    enableGuestMode();
    navigate(ROUTE_PATHS.dashboard);
  };

  const enterLocalAccount = async (username: string, password: string) => {
    try {
      clearGuestMode();
      await localLogin.mutateAsync({ username, password });
      await utils.auth.me.invalidate();
      navigate(ROUTE_PATHS.dashboard);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`${text.signInFailed}${message}`);
    }
  };

  const enterAccountDashboard = () => {
    if (publicGuestOnly) {
      return;
    }

    if (!oauthConfigured) {
      // Use username and password for local development
      void enterLocalAccount(username, password);
      return;
    }

    clearGuestMode();
    const loginUrl = getLoginUrl();

    if (loginUrl && loginUrl !== window.location.href) {
      window.location.href = loginUrl;
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.03),transparent_30%),linear-gradient(135deg,#ffffff_0%,#fafafa_55%,#f4f4f5_100%)] dark:bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),transparent_30%),linear-gradient(135deg,#140a00_0%,#0f0a05_55%,#080400_100%)]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-primary/10 bg-white/70 dark:bg-black/30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-background shadow-[0_0_12px_rgba(0,0,0,0.1)]">
              <UtensilsCrossed className="h-5 w-5 stroke-[2.5px]" />
            </div>
            <span className="font-bold text-lg text-primary">
              坐吃山空
            </span>
          </div>
          <div className="flex items-center gap-2">
            {toggleTheme ? (
              <Button
                variant="outline"
                size="icon"
                className="size-9 rounded-md border-primary/20 bg-background/50 text-foreground hover:bg-primary/10 hover:text-primary"
                onClick={toggleTheme}
                aria-label={
                  theme === "light" ? text.switchToDark : text.switchToLight
                }
                title={
                  theme === "light" ? text.switchToDark : text.switchToLight
                }
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>
            ) : null}
            {!publicGuestOnly ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-primary/20 bg-background/50 text-foreground hover:bg-primary/10 hover:text-primary"
                    disabled={localLogin.isPending}
                  >
                    {localLogin.isPending ? text.signingIn : text.signIn}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md border-primary/15 bg-card/85">
                  <DialogHeader>
                    <DialogTitle className="text-primary">{text.signIn}</DialogTitle>
                    <DialogDescription>
                      {text.signInHint}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-muted-foreground">{text.username}</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="border-primary/20 bg-background/50 text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-muted-foreground">{text.password}</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border-primary/20 bg-background/50 text-foreground"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <DialogClose asChild>
                      <Button variant="outline" className="border-primary/20 bg-background/50 text-foreground hover:bg-primary/10 hover:text-primary" onClick={() => navigate(ROUTE_PATHS.home)}>
                        取消
                      </Button>
                    </DialogClose>
                    <Button
                      className="bg-primary text-primary-foreground shadow-[0_0_18px_rgba(0,0,0,0.15)] hover:bg-primary/90"
                      onClick={enterAccountDashboard}
                      disabled={localLogin.isPending}
                    >
                      {localLogin.isPending ? text.signingIn : text.login}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : null}
            <Button
              className="bg-primary text-primary-foreground shadow-[0_0_18px_rgba(0,0,0,0.15)] hover:bg-primary/90"
              onClick={enterGuestDashboard}
            >
              {text.guestSignIn}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="mb-12">
          {publicGuestOnly ? (
            <div className="mb-4 rounded-2xl border border-primary/15 bg-primary/6 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-primary">{text.guestOnlyHeadline}</p>
              <p className="mt-1">{text.guestOnlyHint}</p>
            </div>
          ) : null}
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            {text.heroPrefix}{" "}
            <span className="bg-gradient-to-r from-[#8a6d3b] via-[#cba358] to-[#e8c886] dark:from-amber-200 dark:via-amber-300 dark:to-amber-500 bg-clip-text text-transparent drop-shadow-sm dark:drop-shadow-[0_0_18px_rgba(251,191,36,0.2)]">
              {text.heroHighlight}
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            {text.heroDesc}
          </p>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              {guestOnlyRequested ? (
                <p className="text-primary">
                  当前公开站点仅开放游客模式，只有站长本人可以查看历史数据。
                </p>
              ) : null}
            </div>
        </div>

        <div className="relative mb-20">
          <NoodlePanel
            data={{
              totalValueUSD: HOME_TOTAL_ASSETS_CNY / homeUsdCnyRate,
              totalValueCNY: HOME_TOTAL_ASSETS_CNY,
              exchangeRate: homeUsdCnyRate,
            }}
          />
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <Card className="border-primary/15 bg-card/85 transition-shadow hover:shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/15 bg-primary/10">
                <RefreshCw className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>{text.feature1Title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{text.feature1Desc}</CardDescription>
            </CardContent>
          </Card>

          <Card className="border-primary/15 bg-card/85 transition-shadow hover:shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/15 bg-primary/10">
                <PieChart className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>{text.feature2Title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{text.feature2Desc}</CardDescription>
            </CardContent>
          </Card>

          <Card className="border-primary/15 bg-card/85 transition-shadow hover:shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/15 bg-primary/10">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>{text.feature3Title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{text.feature3Desc}</CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Supported Assets */}
        <div className="rounded-2xl border border-primary/15 bg-card/85 p-12 shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            {text.supported}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary"></span>
                {text.currencies}
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• 美元（USD）</li>
                <li>• 港币（HKD）</li>
                <li>• 人民币（CNY）</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-zinc-400 dark:bg-amber-400"></span>
                {text.cryptos}
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• 比特币（BTC）</li>
                <li>• 以太坊（ETH）</li>
                <li>• {text.moreSoon}</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-zinc-600 dark:bg-amber-600"></span>
                {text.usStocks}
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• 苹果（AAPL）</li>
                <li>• 谷歌（GOOGL）</li>
                <li>• 特斯拉（TSLA）等</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-primary/15 bg-white/70 dark:bg-black/30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-muted-foreground">
          <p>&copy; 2026 坐吃山空。{text.footer}</p>
        </div>
      </footer>
    </div>
  );
}
