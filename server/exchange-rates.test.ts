import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchExchangeRates } from "./priceService";

describe("fetchExchangeRates", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses a consensus rate when providers disagree", async () => {
    const fetchMock = vi.fn(async (input: unknown) => {
      const url = String(input);

      if (
        url ===
        "https://api.frankfurter.app/latest?from=CNY&to=USD,HKD,EUR,AUD,JPY,RUB"
      ) {
        return {
          ok: true,
          json: async () => ({
            rates: {
              USD: 0.14501,
              HKD: 1.1355,
              EUR: 0.12634,
              AUD: 0.2235,
              JPY: 23.077,
              RUB: 12.73,
            },
          }),
        };
      }

      if (url === "https://api.exchangerate-api.com/v4/latest/CNY") {
        return {
          ok: true,
          json: async () => ({
            rates: {
              USD: 0.145,
              HKD: 1.136,
              EUR: 0.1263,
              AUD: 0.2232,
              JPY: 23.05,
              RUB: 12.8,
            },
          }),
        };
      }

      if (url === "https://open.er-api.com/v6/latest/CNY") {
        return {
          ok: true,
          json: async () => ({
            rates: {
              USD: 0.144717,
              HKD: 1.1337,
              EUR: 0.1261,
              AUD: 0.2228,
              JPY: 22.98,
              RUB: 12.65,
            },
          }),
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const rates = await fetchExchangeRates();

    expect(rates.USD).toBeCloseTo(6.8966, 3);
    expect(rates.HKD).toBeCloseTo(0.8807, 3);
    expect(rates.EUR).toBeCloseTo(7.9177, 3);
    expect(rates.AUD).toBeCloseTo(4.48, 2);
  });
});
