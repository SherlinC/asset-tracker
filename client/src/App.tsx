import { Route, Switch } from "wouter";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_ROUTES, type RouteComponentKey } from "@/lib/navigation";
import AssetDetail from "@/pages/AssetDetail";
import Dashboard from "@/pages/Dashboard";
import NoodlePage from "@/pages/NoodlePage";
import NotFound from "@/pages/NotFound";
import StrategyPage from "@/pages/StrategyPage";
import WalletPlanningPage from "@/pages/WalletPlanningPage";

import ErrorBoundary from "./components/ErrorBoundary";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

const ROUTE_COMPONENTS: Record<RouteComponentKey, () => React.JSX.Element> = {
  home: Home,
  dashboard: Dashboard,
  spendover: NoodlePage,
  aiStrategy: StrategyPage,
  walletPlanning: WalletPlanningPage,
  page2: StrategyPage,
  assetDetail: AssetDetail,
  notFound: NotFound,
};

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      {APP_ROUTES.map(route => {
        const Component = ROUTE_COMPONENTS[route.component];

        return (
          <Route key={route.path} path={route.path}>
            {() => <Component />}
          </Route>
        );
      })}
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
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
          defaultTheme="light"
          // switchable
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
