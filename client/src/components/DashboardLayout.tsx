import {
  Download,
  LayoutDashboard,
  Languages,
  LogOut,
  Moon,
  PanelLeft,
  Plus,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

import { useAuth } from "@/_core/hooks/useAuth";
import AddHoldingDialog from "@/components/AddHoldingDialog";
import type { Holding } from "@/components/holdings-list/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { enableGuestMode } from "@/const";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/contexts/ThemeContext";
import { useIsMobile } from "@/hooks/useMobile";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { usePortfolioRefresh } from "@/hooks/usePortfolioRefresh";
import { downloadCurrentHoldingsWorkbook } from "@/lib/excelExport";
import {
  DASHBOARD_NAV_ITEMS,
  ROUTE_PATHS,
  pickLocalizedText,
} from "@/lib/navigation";
import { trpc } from "@/lib/trpc";

import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const SIDEBAR_WIDTH = 188;

const SIMULATED_USER = {
  name: "Investor",
  email: "investor@example.com",
  avatar: "/avatars/01.png",
  initials: "IN",
};

function buildDisplayName(
  name: string | null | undefined,
  isGuestMode: boolean,
  isZh: boolean
) {
  if (isGuestMode) {
    return isZh ? "游客身份" : "Guest Mode";
  }

  if (name && name.trim().length > 0) {
    return name;
  }

  return SIMULATED_USER.name;
}

function buildInitials(name: string) {
  const normalized = name.trim();

  if (!normalized) {
    return SIMULATED_USER.initials;
  }

  const segments = normalized.split(/\s+/).filter(Boolean);
  if (segments.length >= 2) {
    return `${segments[0][0] ?? ""}${segments[1][0] ?? ""}`.toUpperCase();
  }

  return normalized.slice(0, 2).toUpperCase();
}

export default function DashboardLayout({
  children,
  exportHoldings,
  assets,
  onPortfolioChanged,
}: {
  children: React.ReactNode;
  exportHoldings?: Holding[];
  assets?: Holding["asset"][];
  onPortfolioChanged?: () => Promise<void>;
}) {
  const { loading } = useAuth();

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${SIDEBAR_WIDTH}px` } as React.CSSProperties}
    >
      <DashboardLayoutContent
        exportHoldings={exportHoldings}
        assets={assets}
        onPortfolioChanged={onPortfolioChanged}
      >
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  exportHoldings,
  assets,
  onPortfolioChanged,
}: {
  children: React.ReactNode;
  exportHoldings?: Holding[];
  assets?: Holding["asset"][];
  onPortfolioChanged?: () => Promise<void>;
}) {
  const { language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const isZh = language === "zh";
  const { logout, user } = useAuth();
  const isGuestMode = user?.loginMethod === "guest-access";
  const portfolioData = usePortfolioData({
    includeSummary: false,
    includeAssets: assets === undefined,
    includeHoldings: exportHoldings === undefined || assets === undefined,
  });
  const portfolioRefresh = usePortfolioRefresh({
    isGuestMode,
    refetchAll: portfolioData.refetchAll,
  });
  const systemHealth = trpc.system.health.useQuery({ timestamp: 1 });
  const [isExportingData, setIsExportingData] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const displayName = buildDisplayName(
    user?.name ?? user?.email,
    isGuestMode,
    isZh
  );
  const displayUser = {
    ...SIMULATED_USER,
    name: displayName,
    initials: buildInitials(displayName),
  };
  const availableExportHoldings = exportHoldings ?? portfolioData.holdings;
  const isExportDataLoading =
    exportHoldings === undefined && portfolioData.isHoldingsLoading;
  const menuItems = DASHBOARD_NAV_ITEMS.map(item => ({
    ...item,
    label: pickLocalizedText(item.label, isZh),
  }));
  const isMobile = useIsMobile();
  const text = isZh
    ? {
        expand: "展开侧边栏",
        collapse: "收起侧边栏",
        navigation: "导航",
        menu: "菜单",
        exportCurrentData: "导出资产",
        importExcel: "添加资产",
        databaseOffline:
          "当前数据库连接失败，页面里的空数据不是丢失。修复 MySQL / DATABASE_URL 后，原有资产会恢复。写入操作也会暂时失败。",
        exportLoading: "正在加载可导出的持仓数据，请稍后重试。",
        exportStarted: "当前数据已开始导出",
        exportFailed: "当前数据导出失败，请稍后重试。",
      }
    : {
        expand: "Expand sidebar",
        collapse: "Collapse sidebar",
        navigation: "Navigation",
        menu: "Menu",
        exportCurrentData: "Export Assets",
        importExcel: "Add Asset",
        databaseOffline:
          "The database connection is currently unavailable. Empty dashboard data is not deleted; it will reappear after MySQL / DATABASE_URL is fixed. Write actions will also fail for now.",
        exportLoading:
          "Exportable holdings are still loading. Please try again.",
        exportStarted: "Current data export started",
        exportFailed: "Failed to export current data. Please try again.",
      };

  const handleExportCurrentData = async () => {
    if (isExportDataLoading) {
      toast.error(text.exportLoading);
      return;
    }

    if (availableExportHoldings.length === 0) {
      toast.error(
        isZh
          ? "当前没有可导出的持仓数据。"
          : "There is no holdings data to export."
      );
      return;
    }

    setIsExportingData(true);

    try {
      await downloadCurrentHoldingsWorkbook(language, availableExportHoldings);
      toast.success(text.exportStarted);
    } catch (error) {
      console.error("Failed to export current holdings:", error);
      toast.error(text.exportFailed);
    } finally {
      setIsExportingData(false);
    }
  };

  return (
    <>
      <div className="relative">
        <Sidebar collapsible="icon" className="border-r-0">
          <SidebarHeader className="h-16 justify-center group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:pt-3">
            <div className="flex items-center gap-3 px-2 transition-all w-full group-data-[collapsible=icon]:w-fit group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-auto">
              <div className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:hidden">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-[0_0_12px_rgba(251,191,36,0.15)]">
                  <LayoutDashboard className="h-4 w-4" />
                </div>
                <span className="font-bold tracking-widest truncate text-primary/90 text-[15px] drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">
                  {isZh ? "坐吃山空" : "SPENDOVER"}
                </span>
              </div>
              <div className="hidden group-data-[collapsible=icon]:flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-[0_0_12px_rgba(251,191,36,0.15)]">
                <LayoutDashboard className="h-4 w-4" />
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 group-data-[collapsible=icon]:overflow-visible">
            <SidebarMenu className="px-2 py-2 gap-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-3">
              <SidebarMenuItem>
                <Button
                  onClick={() => {
                    setShowAddDialog(true);
                  }}
                  variant="default"
                  size="sm"
                  className="w-full justify-start gap-2 h-10 rounded-xl group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                >
                  <Plus className="h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden">
                    {text.importExcel}
                  </span>
                </Button>
              </SidebarMenuItem>
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 rounded-xl transition-all font-normal group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="gap-2 p-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3">
            <div className="mb-2 group-data-[collapsible=icon]:mb-0">
              <Button
                onClick={handleExportCurrentData}
                disabled={isExportingData || isExportDataLoading}
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 rounded-xl group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
              >
                <Download className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">
                  {text.exportCurrentData}
                </span>
              </Button>
            </div>
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
              <SidebarMenu className="min-w-0 flex-1 group-data-[collapsible=icon]:flex-none">
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton
                        size="lg"
                        className="rounded-xl data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center"
                      >
                        <Avatar className="h-8 w-8 rounded-lg">
                          <AvatarImage
                            src={displayUser.avatar}
                            alt={displayUser.name}
                          />
                          <AvatarFallback className="rounded-lg">
                            {displayUser.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                          <span className="truncate font-semibold">
                            {displayUser.name}
                          </span>
                        </div>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                    side="right"
                    align="end"
                    sideOffset={4}
                  >
                    <DropdownMenuLabel className="p-0 font-normal">
                      <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <Avatar className="h-8 w-8 rounded-lg">
                          <AvatarImage
                            src={displayUser.avatar}
                            alt={displayUser.name}
                          />
                          <AvatarFallback className="rounded-lg">
                            {displayUser.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">
                            {displayUser.name}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={toggleLanguage}>
                        <Languages className="mr-2 size-4" />
                        {language === "zh" ? "Switch to English" : "切换为中文"}
                      </DropdownMenuItem>
                      {toggleTheme && (
                        <DropdownMenuItem onClick={toggleTheme}>
                          {theme === "light" ? (
                            <>
                              <Moon className="mr-2 size-4" />
                              {isZh ? "深色模式" : "Dark Mode"}
                            </>
                          ) : (
                            <>
                              <Sun className="mr-2 size-4" />
                              {isZh ? "浅色模式" : "Light Mode"}
                            </>
                          )}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={async () => {
                        enableGuestMode();
                        await logout();
                        setLocation(ROUTE_PATHS.home);
                      }}
                    >
                      <LogOut className="mr-2 size-4" />
                      {isZh ? "退出登录" : "Log out"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
          </SidebarFooter>
        </Sidebar>
      </div>

      <AddHoldingDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        assets={assets ?? portfolioData.assets}
        onSuccess={async () => {
          if (onPortfolioChanged) {
            await onPortfolioChanged();
            return;
          }

          await portfolioRefresh.refresh();
        }}
      />

      <SidebarInset className="flex flex-col min-h-0">
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40 shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                </div>
                <span className="font-bold tracking-widest text-primary/90 text-sm">
                  {isZh ? "坐吃山空" : "SPENDOVER"}
                </span>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 flex flex-col p-4 min-h-0">
          {!isGuestMode && systemHealth.data?.dbConnected === false ? (
            <div className="mb-4 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 shrink-0">
              {text.databaseOffline}
            </div>
          ) : null}
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
