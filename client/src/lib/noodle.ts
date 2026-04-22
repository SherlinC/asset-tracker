import type { LocalizedText } from "@/lib/navigation";

export type NoodleLocation = {
  id: string;
  name: LocalizedText;
  priceCNY: number;
  lat: number;
  lon: number;
  timezone: string;
};

export const NOODLE_LOCATIONS: readonly NoodleLocation[] = [
  {
    id: "chengdu",
    name: { zh: "成都", en: "Chengdu" },
    priceCNY: 15,
    lat: 30.5728,
    lon: 104.0668,
    timezone: "UTC+8"
  },
  {
    id: "beijing",
    name: { zh: "北京", en: "Beijing" },
    priceCNY: 22,
    lat: 39.9042,
    lon: 116.4074,
    timezone: "UTC+8"
  },
  {
    id: "shanghai",
    name: { zh: "上海", en: "Shanghai" },
    priceCNY: 20,
    lat: 31.2304,
    lon: 121.4737,
    timezone: "UTC+8"
  },
  {
    id: "shenzhen",
    name: { zh: "深圳", en: "Shenzhen" },
    priceCNY: 18,
    lat: 22.5431,
    lon: 114.0579,
    timezone: "UTC+8"
  },
  {
    id: "tokyo",
    name: { zh: "东京", en: "Tokyo" },
    priceCNY: 50,
    lat: 35.6762,
    lon: 139.6503,
    timezone: "UTC+9"
  },
  {
    id: "sydney",
    name: { zh: "悉尼", en: "Sydney" },
    priceCNY: 90,
    lat: -33.8688,
    lon: 151.2093,
    timezone: "UTC+10 / UTC+11"
  },
  {
    id: "london",
    name: { zh: "伦敦", en: "London" },
    priceCNY: 120,
    lat: 51.5074,
    lon: -0.1278,
    timezone: "UTC+0 / UTC+1"
  },
  {
    id: "new-york",
    name: { zh: "纽约", en: "New York" },
    priceCNY: 140,
    lat: 40.7128,
    lon: -74.0060,
    timezone: "UTC-5 / UTC-4"
  },
  {
    id: "san-francisco",
    name: { zh: "旧金山", en: "San Francisco" },
    priceCNY: 150,
    lat: 37.7749,
    lon: -122.4194,
    timezone: "UTC-8 / UTC-7"
  },
  {
    id: "buenos-aires",
    name: { zh: "布宜诺斯艾利斯", en: "Buenos Aires" },
    priceCNY: 30,
    lat: -34.6037,
    lon: -58.3816,
    timezone: "UTC-3"
  },
  {
    id: "sao-paulo",
    name: { zh: "圣保罗", en: "São Paulo" },
    priceCNY: 40,
    lat: -23.5505,
    lon: -46.6333,
    timezone: "UTC-3"
  },
] as const;

export const NOODLE_PANEL_TEXT = {
  eyebrow: {
    zh: "Consumption Singularity",
    en: "Consumption Singularity",
  },
  title: {
    zh: "坐吃山空 · 赛博生存面板",
    en: "Spendover · Cyber Consumption Console",
  },
  description: {
    zh: "把总资产映射成城市生存半径。金色粒子会先聚拢成一碗面，再以克制的立体节奏缓慢旋转，右侧面板展示你的实时消费火力与续航。",
    en: "Map total assets into a city survival radius. Gold particles gather into a noodle bowl, then rotate with a restrained 3D rhythm while the right panel shows your live consumption firepower and runway.",
  },
  totalAssets: {
    zh: "总资产",
    en: "Total assets",
  },
  fxUpdating: {
    zh: "汇率更新中...",
    en: "FX updating...",
  },
  node: {
    zh: "节点",
    en: "Node",
  },
  todayCapacity: {
    zh: "今日可吃",
    en: "Today capacity",
  },
  noYesterdayComparison: {
    zh: "暂无昨日对比",
    en: "No yesterday comparison",
  },
  comparisonLoading: {
    zh: "正在载入对比数据...",
    en: "Loading comparison...",
  },
  threeBowlsPerDay: {
    zh: "每天三碗",
    en: "3 bowls / day",
  },
  yearsUnit: {
    zh: "年",
    en: "yrs",
  },
  runwayDescription: {
    zh: "如果每天吃三碗，你的组合理论续航时长。",
    en: "How long the portfolio theoretically lasts if you eat three bowls every day.",
  },
  inflationStress: {
    zh: "通胀扰动模拟",
    en: "Inflation stress",
  },
  inflationDescription: {
    zh: "按 3% 年化通胀粗略折算，十年后的实际购买力会更低，这个数字帮助你感受长期消费折损。",
    en: "A rough 3% inflation stress over ten years, visualizing how long-term purchasing power fades.",
  },
};
