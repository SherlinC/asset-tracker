const NASDAQ_LISTED_URL =
  "https://www.nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt";
const OTHER_LISTED_URL =
  "https://www.nasdaqtrader.com/dynamic/symdir/otherlisted.txt";
const CACHE_MS = 12 * 60 * 60 * 1000;

const EXCHANGE_LABELS: Record<string, string> = {
  A: "NYSE American",
  N: "NYSE",
  P: "NYSE Arca",
  Q: "NASDAQ",
  V: "IEX",
  Z: "Cboe BZX",
};

const ISSUER_ALIASES: Record<string, string[]> = {
  blackrock: ["blackrock", "ishares"],
  ishares: ["ishares", "blackrock"],
  vanguard: ["vanguard"],
  spdr: ["spdr", "state street"],
  invesco: ["invesco"],
};

type NasdaqListedRow = {
  Symbol: string;
  "Security Name": string;
  "Test Issue": string;
  ETF: string;
};

type OtherListedRow = {
  "ACT Symbol": string;
  "Security Name": string;
  Exchange: string;
  ETF: string;
  "Test Issue": string;
  "NASDAQ Symbol": string;
};

export type NasdaqEtfSearchResult = {
  symbol: string;
  name: string;
  exchange: string;
  issuer: string;
  market: string;
  keywords: string[];
};

let cachedEtfs: NasdaqEtfSearchResult[] = [];
let cacheTime = 0;

function parsePipeFile(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !line.startsWith("File Creation Time:"));

  if (lines.length < 2) {
    return [] as Record<string, string>[];
  }

  const [headerLine, ...rows] = lines;
  const headers = headerLine.split("|");

  return rows.map(row => {
    const values = row.split("|");
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index]?.trim() ?? "";
      return acc;
    }, {});
  });
}

function normalizeIssuer(name: string) {
  const normalized = name.toLowerCase();

  if (normalized.includes("ishares")) {
    return "iShares / BlackRock";
  }

  if (normalized.includes("vanguard")) {
    return "Vanguard";
  }

  if (normalized.includes("spdr")) {
    return "SPDR / State Street";
  }

  if (normalized.includes("invesco")) {
    return "Invesco";
  }

  if (normalized.includes("wisdomtree")) {
    return "WisdomTree";
  }

  if (normalized.includes("global x")) {
    return "Global X";
  }

  if (normalized.includes("direxion")) {
    return "Direxion";
  }

  if (normalized.includes("ft vest") || normalized.includes("first trust")) {
    return "First Trust";
  }

  const match = name.match(/^[^-(),]+/);
  return match?.[0]?.trim() || "ETF";
}

function normalizeSecurityName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

function buildKeywords(symbol: string, name: string, issuer: string) {
  const loweredName = name.toLowerCase();
  const loweredIssuer = issuer.toLowerCase();
  const aliasKeywords = Object.entries(ISSUER_ALIASES)
    .filter(([, aliases]) =>
      aliases.some(
        alias => loweredName.includes(alias) || loweredIssuer.includes(alias)
      )
    )
    .flatMap(([, aliases]) => aliases);

  const nameParts = name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(part => part.length > 1);

  return Array.from(
    new Set([
      symbol.toLowerCase(),
      loweredName,
      loweredIssuer,
      ...aliasKeywords,
      ...nameParts,
    ])
  );
}

function fromNasdaqListed(row: NasdaqListedRow): NasdaqEtfSearchResult | null {
  if (row.ETF !== "Y" || row["Test Issue"] === "Y") {
    return null;
  }

  const symbol = row.Symbol.trim();
  const name = normalizeSecurityName(row["Security Name"]);
  const issuer = normalizeIssuer(name);

  if (!symbol || !name) {
    return null;
  }

  return {
    symbol,
    name,
    issuer,
    exchange: "NASDAQ",
    market: "US ETF",
    keywords: buildKeywords(symbol, name, issuer),
  };
}

function fromOtherListed(row: OtherListedRow): NasdaqEtfSearchResult | null {
  if (row.ETF !== "Y" || row["Test Issue"] === "Y") {
    return null;
  }

  const symbol = (row["NASDAQ Symbol"] || row["ACT Symbol"]).trim();
  const name = normalizeSecurityName(row["Security Name"]);
  const issuer = normalizeIssuer(name);

  if (!symbol || !name) {
    return null;
  }

  return {
    symbol,
    name,
    issuer,
    exchange: (EXCHANGE_LABELS[row.Exchange] ?? row.Exchange) || "Other",
    market: "US ETF",
    keywords: buildKeywords(symbol, name, issuer),
  };
}

export function parseNasdaqEtfDirectory(text: string) {
  return parsePipeFile(text)
    .map(row => fromNasdaqListed(row as unknown as NasdaqListedRow))
    .filter((item): item is NasdaqEtfSearchResult => item !== null);
}

export function parseOtherListedEtfDirectory(text: string) {
  return parsePipeFile(text)
    .map(row => fromOtherListed(row as unknown as OtherListedRow))
    .filter((item): item is NasdaqEtfSearchResult => item !== null);
}

export async function fetchNasdaqEtfList(): Promise<NasdaqEtfSearchResult[]> {
  if (Date.now() - cacheTime < CACHE_MS && cachedEtfs.length > 0) {
    return cachedEtfs;
  }

  try {
    const [nasdaqListedRes, otherListedRes] = await Promise.all([
      fetch(NASDAQ_LISTED_URL),
      fetch(OTHER_LISTED_URL),
    ]);

    if (!nasdaqListedRes.ok) {
      throw new Error(`Nasdaq listed HTTP ${nasdaqListedRes.status}`);
    }

    if (!otherListedRes.ok) {
      throw new Error(`Other listed HTTP ${otherListedRes.status}`);
    }

    const [nasdaqListedText, otherListedText] = await Promise.all([
      nasdaqListedRes.text(),
      otherListedRes.text(),
    ]);

    const merged = [
      ...parseNasdaqEtfDirectory(nasdaqListedText),
      ...parseOtherListedEtfDirectory(otherListedText),
    ];

    cachedEtfs = Array.from(
      new Map(merged.map(item => [item.symbol, item])).values()
    ).sort((a, b) => a.symbol.localeCompare(b.symbol));
    cacheTime = Date.now();

    console.log(`[Nasdaq ETF] Loaded ${cachedEtfs.length} ETFs`);

    return cachedEtfs;
  } catch (err) {
    console.warn(
      "[Nasdaq ETF] Failed to fetch ETF list:",
      (err as Error).message
    );

    if (cachedEtfs.length > 0) {
      return cachedEtfs;
    }

    return [];
  }
}

export async function searchNasdaqEtfs(
  q: string,
  limit: number = 50
): Promise<NasdaqEtfSearchResult[]> {
  const etfs = await fetchNasdaqEtfList();
  const keyword = q.trim().toLowerCase();

  if (!keyword) {
    return etfs.slice(0, limit);
  }

  const ranked = etfs
    .map(item => {
      let score = 0;

      if (item.symbol.toLowerCase() === keyword) {
        score += 100;
      } else if (item.symbol.toLowerCase().startsWith(keyword)) {
        score += 60;
      } else if (item.symbol.toLowerCase().includes(keyword)) {
        score += 30;
      }

      if (item.name.toLowerCase().startsWith(keyword)) {
        score += 40;
      } else if (item.name.toLowerCase().includes(keyword)) {
        score += 25;
      }

      if (item.issuer.toLowerCase().includes(keyword)) {
        score += 20;
      }

      if (item.keywords.some(term => term.includes(keyword))) {
        score += 10;
      }

      return { item, score };
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.item.symbol.localeCompare(b.item.symbol);
    })
    .slice(0, limit)
    .map(entry => entry.item);

  return ranked;
}
