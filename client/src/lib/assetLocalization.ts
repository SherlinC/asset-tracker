const INTERNATIONAL_FUND_ZH_NAMES: Record<string, string> = {
  "LU0124384867.EUFUND": "贝莱德全球基金－可持续能源基金 A2",
  "LU0157308031.EUFUND": "联博－美国收益基金 AT 派息",
  "LU0205439572.EUFUND": "富达亚洲高股息基金 A 美元",
  "LU0266512127.EUFUND": "摩根基金－全球天然资源基金 A（累计）美元",
  "LU0633140727.EUFUND": "联博－新兴市场多元资产组合基金（派息）",
  "LU1128926489.EUFUND": "摩根基金－收益基金 A（月派）美元",
};

export function getLocalizedAssetName(
  symbol: string,
  englishName: string,
  isZh: boolean
): string {
  if (!isZh) {
    return englishName;
  }

  return INTERNATIONAL_FUND_ZH_NAMES[symbol] ?? englishName;
}
