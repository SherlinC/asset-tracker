import { renderHook, waitFor } from "@testing-library/react";
import { usePortfolioData } from "./usePortfolioData";
import { useAuth } from "@/_core/hooks/useAuth";
import { useGuestPortfolio } from "./useGuestPortfolio";
import { trpc } from "@/lib/trpc";

// Mock dependencies
vi.mock("@/_core/hooks/useAuth");
vi.mock("./useGuestPortfolio");
vi.mock("@/lib/trpc");

describe("usePortfolioData", () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock useAuth
    (useAuth as jest.Mock).mockReturnValue({
      loading: false,
      user: null,
    });
    
    // Mock useGuestPortfolio
    (useGuestPortfolio as jest.Mock).mockReturnValue({
      holdings: [],
      assets: [],
      history: [],
      previewInput: {},
      ensureHistoryComparisonSeed: vi.fn(),
      recordHistorySnapshot: vi.fn(),
    });
    
    // Mock trpc
    (trpc.portfolio.summary.useQuery as jest.Mock).mockReturnValue({
      data: {
        totalValueUSD: 10000,
        totalValueCNY: 70000,
        exchangeRate: 7,
        assets: [],
      },
      isLoading: false,
      refetch: vi.fn(),
    });
    
    (trpc.portfolio.preview.useQuery as jest.Mock).mockReturnValue({
      data: {
        totalValueUSD: 10000,
        totalValueCNY: 70000,
        exchangeRate: 7,
        assets: [],
      },
      isLoading: false,
      refetch: vi.fn(),
    });
    
    (trpc.holdings.list.useQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    });
    
    (trpc.assets.list.useQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    });
    
    (trpc.portfolioHistory.get.useQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  test("should return initial state with default options", async () => {
    const { result } = renderHook(() => usePortfolioData());
    
    expect(result.current.isReady).toBe(true);
    expect(result.current.authLoading).toBe(false);
    expect(result.current.isGuestMode).toBe(false);
    expect(result.current.isAuthenticatedMode).toBe(true);
  });

  test("should return guest mode when user is guest", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      loading: false,
      user: { loginMethod: "guest-access" },
    });
    
    const { result } = renderHook(() => usePortfolioData());
    
    expect(result.current.isGuestMode).toBe(true);
    expect(result.current.isAuthenticatedMode).toBe(false);
  });

  test("should return loading state when auth is loading", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      loading: true,
      user: null,
    });
    
    const { result } = renderHook(() => usePortfolioData());
    
    expect(result.current.isReady).toBe(false);
    expect(result.current.authLoading).toBe(true);
  });

  test("should refetch all data when refetchAll is called", async () => {
    const refetchSummaryMock = vi.fn();
    const refetchAssetsMock = vi.fn();
    const refetchHoldingsMock = vi.fn();
    const refetchHistoryMock = vi.fn();
    
    (trpc.portfolio.summary.useQuery as jest.Mock).mockReturnValue({
      data: {
        totalValueUSD: 10000,
        totalValueCNY: 70000,
        exchangeRate: 7,
        assets: [],
      },
      isLoading: false,
      refetch: refetchSummaryMock,
    });
    
    (trpc.holdings.list.useQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      refetch: refetchHoldingsMock,
    });
    
    (trpc.assets.list.useQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      refetch: refetchAssetsMock,
    });
    
    (trpc.portfolioHistory.get.useQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      refetch: refetchHistoryMock,
    });
    
    const { result } = renderHook(() => usePortfolioData({
      includeSummary: true,
      includeAssets: true,
      includeHoldings: true,
      includeHistory: true,
    }));
    
    await result.current.refetchAll();
    
    expect(refetchSummaryMock).toHaveBeenCalled();
    expect(refetchAssetsMock).toHaveBeenCalled();
    expect(refetchHoldingsMock).toHaveBeenCalled();
    expect(refetchHistoryMock).toHaveBeenCalled();
  });
});
