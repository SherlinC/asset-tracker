import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_ROUTES, type RouteComponentKey } from "@/lib/navigation";

import ErrorBoundary from "./components/ErrorBoundary";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";

const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ImportPreviewPage = lazy(() => import("./pages/ImportPreviewPage"));
const NoodlePage = lazy(() => import("./pages/NoodlePage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const StrategyPage = lazy(() => import("./pages/StrategyPage"));
const WalletPlanningPage = lazy(() => import("./pages/WalletPlanningPage"));

const ROUTE_COMPONENTS: Record<RouteComponentKey, () => React.JSX.Element> = {
  home: Home,
  dashboard: Dashboard,
  importPreview: ImportPreviewPage,
  spendover: NoodlePage,
  aiStrategy: StrategyPage,
  walletPlanning: WalletPlanningPage,
  page2: StrategyPage,
  notFound: NotFound,
};

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <Switch>
        {APP_ROUTES.map(route => {
          const Component = ROUTE_COMPONENTS[route.component];

          return (
            <Route key={route.path} path={route.path}>
              {() => <Component />}
            </Route>
          );
        })}
        {/* Redirect root path to /home */}
        <Route path="/">
          {() => {
            window.location.href = "/home";
            return null;
          }}
        </Route>
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider
          defaultTheme="dark"
          switchable
        >
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
