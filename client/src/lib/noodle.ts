import type { LocalizedText } from "@/lib/navigation";

export type NoodleLocation = {
  id: string;
  name: LocalizedText;
  priceCNY: number;
};

export const NOODLE_LOCATIONS: readonly NoodleLocation[] = [
  {
    id: "chengdu",
    name: { zh: "成都", en: "Chengdu" },
    priceCNY: 15,
  },
  {
    id: "beijing",
    name: { zh: "北京", en: "Beijing" },
    priceCNY: 22,
  },
  {
    id: "shanghai",
    name: { zh: "上海", en: "Shanghai" },
    priceCNY: 20,
  },
  {
    id: "shenzhen",
    name: { zh: "深圳", en: "Shenzhen" },
    priceCNY: 18,
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
