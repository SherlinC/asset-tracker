export const TYPE_PALETTES: Record<string, string[]> = {
  currency: ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"],
  crypto: ["#ca8a04", "#eab308", "#facc15", "#fde047", "#fef08a"],
  stock: ["#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0"],
  fund: ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"],
};

const GRAY_PALETTE = ["#4b5563", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb"];

const TYPE_ORDER: Record<string, number> = {
  currency: 0,
  crypto: 1,
  stock: 2,
  fund: 3,
};

export const TYPE_LABELS_ZH: Record<string, string> = {
  currency: "货币",
  crypto: "虚拟货币",
  stock: "股票",
  fund: "基金",
};

export function getTypeOrder(type: string): number {
  return TYPE_ORDER[type] ?? 4;
}

export function getColorByType(type: string): string {
  const palette = TYPE_PALETTES[type] ?? GRAY_PALETTE;
  return palette[0];
}
