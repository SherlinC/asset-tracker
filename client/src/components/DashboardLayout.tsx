import { Globe, LogOut, PanelLeft } from "lucide-react";
import { useLocation } from "wouter";

import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { getLoginUrl, isOAuthConfigured } from "@/const";
import { useLanguage } from "@/hooks/useLanguage";
import { useIsMobile } from "@/hooks/useMobile";
import {
  DASHBOARD_NAV_ITEMS,
  ROUTE_PATHS,
  pickLocalizedText,
} from "@/lib/navigation";

import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const SIDEBAR_WIDTH = 280;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user } = useAuth();
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const isZh = language === "zh";
  const text = isZh
    ? {
        signInToContinue: "登录后继续",
        devMode: "开发模式",
        authHint: "访问该仪表盘需要先完成认证，请继续登录流程。",
        devHint:
          "请确认 .env 中已配置 DEV_USER_EMAIL 和 DATABASE_URL，并已启动 MySQL，然后刷新本页。",
        signIn: "登录",
        retry: "刷新重试",
        backHome: "返回首页",
      }
    : {
        signInToContinue: "Sign in to continue",
        devMode: "Development mode",
        authHint:
          "Access to this dashboard requires authentication. Continue to launch the login flow.",
        devHint:
          "Make sure DEV_USER_EMAIL and DATABASE_URL are configured in .env, MySQL is running, then refresh this page.",
        signIn: "Sign in",
        retry: "Retry",
        backHome: "Back home",
      };

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    const loginUrl = getLoginUrl();
    const isSamePage =
      typeof window !== "undefined" && loginUrl === window.location.href;
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              {isOAuthConfigured() ? text.signInToContinue : text.devMode}
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {isOAuthConfigured() ? text.authHint : text.devHint}
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            {isOAuthConfigured() && !isSamePage ? (
              <Button
                onClick={() => {
                  window.location.href = loginUrl;
                }}
                size="lg"
                className="w-full shadow-lg hover:shadow-xl transition-all"
              >
                {text.signIn}
              </Button>
            ) : (
              <Button
                onClick={() => window.location.reload()}
                size="lg"
                variant="outline"
                className="w-full"
              >
                {text.retry}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => setLocation(ROUTE_PATHS.home)}
              className="w-full"
            >
              {text.backHome}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${SIDEBAR_WIDTH}px` } as React.CSSProperties}
    >
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const isZh = language === "zh";
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const menuItems = DASHBOARD_NAV_ITEMS.map(item => ({
    ...item,
    label: pickLocalizedText(item.label, isZh),
  }));
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();
  const text = isZh
    ? {
        expand: "展开侧边栏",
        collapse: "收起侧边栏",
        navigation: "导航",
        logout: "登出",
        menu: "菜单",
        switchToLanguage: "English",
      }
    : {
        expand: "Expand sidebar",
        collapse: "Collapse sidebar",
        navigation: "Navigation",
        logout: "Log out",
        menu: "Menu",
        switchToLanguage: "中文",
      };

  return (
    <>
      <div className="relative">
        <Sidebar collapsible="icon" className="border-r-0">
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full group-data-[collapsible=icon]:justify-center">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label={isCollapsed ? text.expand : text.collapse}
                title={isCollapsed ? text.expand : text.collapse}
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-2 min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="font-semibold tracking-tight truncate">
                  {text.navigation}
                </span>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
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

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={toggleLanguage}
                  className="cursor-pointer"
                >
                  <Globe className="mr-2 h-4 w-4" />
                  <span>{text.switchToLanguage}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    setLocation(ROUTE_PATHS.home);
                  }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{text.logout}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarRail />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? text.menu}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
