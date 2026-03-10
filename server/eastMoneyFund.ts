/**
 * 天天基金/东方财富 基金列表与搜索
 * 数据源: http://fund.eastmoney.com/js/fundcode_search.js
 * 返回格式: var r = [ ["代码","拼音简写","名称","类型","拼音全拼"], ... ];
 */

const FUND_LIST_URL =
  "http://fund.eastmoney.com/js/fundcode_search.js";

let cachedList: { symbol: string; name: string; type: string }[] = [];
let cacheTime = 0;
const CACHE_MS = 10 * 60 * 1000; // 10 分钟

export async function fetchEastMoneyFundList(): Promise<
  { symbol: string; name: string; type: string }[]
> {
  if (Date.now() - cacheTime < CACHE_MS && cachedList.length > 0) {
    return cachedList;
  }
  try {
    const res = await fetch(FUND_LIST_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const match = text.match(/var\s+r\s*=\s*(\[[\s\S]*?\])\s*;?\s*$/m);
    if (!match) throw new Error("Could not parse fund list");
    const raw = JSON.parse(match[1]) as [string, string, string, string, string][];
    cachedList = raw.map(([code, , name, typeName]) => ({
      symbol: code,
      name: name || code,
      type: typeName || "其他",
    }));
    cacheTime = Date.now();
    console.log(`[EastMoney] Loaded ${cachedList.length} funds`);
    return cachedList;
  } catch (err) {
    console.warn("[EastMoney] Failed to fetch fund list:", (err as Error).message);
    if (cachedList.length > 0) return cachedList;
    return [];
  }
}

export async function searchEastMoneyFunds(
  q: string,
  limit: number = 50
): Promise<{ symbol: string; name: string; type: string }[]> {
  const list = await fetchEastMoneyFundList();
  if (!q || q.trim() === "") {
    return list.slice(0, limit);
  }
  const lower = q.trim().toLowerCase();
  const filtered = list.filter(
    item =>
      item.symbol.includes(q.trim()) ||
      item.name.toLowerCase().includes(lower) ||
      item.type.toLowerCase().includes(lower)
  );
  return filtered.slice(0, limit);
}
