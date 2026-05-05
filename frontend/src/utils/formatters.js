export function formatCurrency(value, currency = "SGD") {
  if (value == null || isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value, decimals = 2) {
  if (value == null || isNaN(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatMonth(yyyyMm) {
  if (!yyyyMm) return "";
  const [year, month] = yyyyMm.split("-").map(Number);
  return new Date(year, month - 1).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });
}

export function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const EXPENSE_CATEGORIES = [
  "Housing",
  "Food & Dining",
  "Transportation",
  "Health",
  "Entertainment",
  "Shopping",
  "Utilities",
  "Education",
  "Travel",
  "Subscriptions",
  "Other",
];

export const CATEGORY_COLORS = {
  Housing: "#7c6aff",
  "Food & Dining": "#f5c542",
  Transportation: "#34d399",
  Health: "#f87171",
  Entertainment: "#60a5fa",
  Shopping: "#fb923c",
  Utilities: "#a78bfa",
  Education: "#4ade80",
  Travel: "#38bdf8",
  Subscriptions: "#f472b6",
  Other: "#9090b8",
};
