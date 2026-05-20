import { useEffect, useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import useInvestmentStore from "../../store/investmentStore";
import InvestmentForm from "./InvestmentForm";
import EmptyState from "../shared/EmptyState";
import {
  formatCurrency,
  formatPercent,
  currentYearMonth,
  formatMonth,
} from "../../utils/formatters";

// ── Constants ─────────────────────────────────────────────────────────────────
const TICKER_COLORS = [
  "#7c6aff",
  "#34d399",
  "#f5c542",
  "#f87171",
  "#60a5fa",
  "#fb923c",
  "#a78bfa",
  "#4ade80",
  "#38bdf8",
  "#f472b6",
];

const MARKET_META = {
  US: { label: "US Markets", flag: "🇺🇸", currency: "USD" },
  SGX: { label: "SGX", flag: "🇸🇬", currency: "SGD" },
  LSE: { label: "LSE", flag: "🇬🇧", currency: "GBP" },
  HKEX: { label: "HKEX", flag: "🇭🇰", currency: "HKD" },
  ASX: { label: "ASX", flag: "🇦🇺", currency: "AUD" },
};

// Format in a specific currency (non-SGD markets show their native symbol)
function formatNative(value, currency = "SGD") {
  if (value == null || isNaN(value)) return "—";
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function NetWorthPage() {
  const {
    quotes,
    quotesLoading,
    quotesError,
    fetchLiveQuotes,
    investments,
    fetchInvestments,
    networthHistory,
    fetchNetWorthHistory,
    saveSnapshot,
    deleteInvestment,
  } = useInvestmentStore();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [savingSnap, setSavingSnap] = useState(false);
  const [snapMsg, setSnapMsg] = useState("");

  useEffect(() => {
    fetchInvestments();
    fetchLiveQuotes();
    fetchNetWorthHistory();
  }, []);

  // ── Group quotes by market ──────────────────────────────────────────────────
  const marketGroups = useMemo(() => {
    const groups = {};
    quotes.forEach((q) => {
      // market is always set by backend detectMarket(); never fall back to 'US'
      const mkt = q.market;
      if (!groups[mkt]) groups[mkt] = [];
      groups[mkt].push(q);
    });
    return groups;
  }, [quotes]);

  // SGX first, then US, then others alphabetically
  const MARKET_ORDER = ["SGX", "US", "LSE", "HKEX", "ASX"];
  const marketKeys = Object.keys(marketGroups).sort((a, b) => {
    const ai = MARKET_ORDER.indexOf(a);
    const bi = MARKET_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  // ── Portfolio-level totals in SGD (aggregated across all markets) ───────────
  const totalValueSGD = quotes.reduce(
    (s, q) => s + (q.marketValueSGD ?? q.costBasisSGD ?? 0),
    0,
  );
  const totalCostSGD = quotes.reduce((s, q) => s + (q.costBasisSGD ?? 0), 0);
  const totalPnLSGD = quotes.reduce((s, q) => s + (q.unrealizedPnLSGD ?? 0), 0);
  const totalPnLPct = totalCostSGD > 0 ? (totalPnLSGD / totalCostSGD) * 100 : 0;
  const totalDayChangeSGD = quotes.reduce(
    (s, q) => s + (q.dayChangeSGD ?? 0),
    0,
  );

  // ── Performance chart (6-month skeleton + live current month) ──────────────
  const perfData = useMemo(() => {
    const lookup = {};
    networthHistory.forEach((h) => {
      lookup[h.month] = h.investmentsValue;
    });
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return {
        month: formatMonth(key),
        rawMonth: key,
        Value: i === 5 ? totalValueSGD : (lookup[key] ?? 0),
      };
    });
  }, [networthHistory, totalValueSGD]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
  };
  const openEdit = (inv) => {
    setEditTarget(inv);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this holding?")) return;
    setDeletingId(id);
    try {
      await deleteInvestment(id);
      await fetchLiveQuotes();
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveSnapshot = async () => {
    setSavingSnap(true);
    setSnapMsg("");
    try {
      await saveSnapshot({
        cash: 0,
        investmentsValue: totalValueSGD,
        month: currentYearMonth(),
      });
      setSnapMsg("Snapshot saved");
      setTimeout(() => setSnapMsg(""), 3000);
    } catch (err) {
      setSnapMsg("Failed: " + err.message);
    } finally {
      setSavingSnap(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl text-text-primary">Portfolio</h1>
          <p className="text-text-secondary text-sm mt-1">
            Holdings grouped by market · totals in SGD
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLiveQuotes()}
            disabled={quotesLoading}
            className="btn-ghost text-sm"
          >
            {quotesLoading ? "⟳ Refreshing…" : "⟳ Refresh Quotes"}
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Add Holding
          </button>
        </div>
      </div>

      {/* Error banner */}
      {quotesError && (
        <div className="px-4 py-3 bg-red/10 border border-red/30 rounded-xl text-sm flex items-center justify-between gap-3">
          <span className="text-red">⚠ {quotesError}</span>
          <button
            onClick={() => fetchLiveQuotes()}
            className="text-xs text-red underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Top stat cards — all in SGD ───────────────────────────────────────── */}
      <div>
        <p className="text-xs text-text-muted uppercase tracking-widest mb-3">
          Total Portfolio in SGD — all markets converted
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card border-accent/30 bg-accent/5">
            <span className="stat-label">Portfolio Value</span>
            <span className="stat-value text-accent-light">
              {formatCurrency(totalValueSGD)}
            </span>
            <span className="text-xs text-text-muted">
              {quotes.length} holding{quotes.length !== 1 ? "s" : ""} ·{" "}
              {marketKeys.length} market{marketKeys.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Unrealized P&amp;L</span>
            <span
              className={`stat-value ${totalPnLSGD >= 0 ? "text-green" : "text-red"}`}
            >
              {totalPnLSGD >= 0 ? "+" : ""}
              {formatCurrency(totalPnLSGD)}
            </span>
            <span
              className={`text-xs font-mono ${totalPnLPct >= 0 ? "text-green" : "text-red"}`}
            >
              {formatPercent(totalPnLPct)} all time
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Today's Change</span>
            <span
              className={`stat-value ${totalDayChangeSGD >= 0 ? "text-green" : "text-red"}`}
            >
              {totalDayChangeSGD >= 0 ? "+" : ""}
              {formatCurrency(totalDayChangeSGD)}
            </span>
            <span className="text-xs text-text-muted">across all holdings</span>
          </div>
        </div>
      </div>

      {/* ── Performance chart ─────────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest">
            Portfolio Performance — Last 6 Months (SGD)
          </h2>
          <div className="flex items-center gap-2">
            {snapMsg && <span className="text-xs text-green">{snapMsg}</span>}
            <button
              onClick={handleSaveSnapshot}
              disabled={savingSnap}
              className="text-xs btn-ghost py-1 px-3"
            >
              {savingSnap ? "Saving…" : "+ Save Snapshot"}
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={perfData}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c6aff" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#7c6aff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tick={{ fill: "#9090b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#9090b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={56}
              tickFormatter={(v) =>
                v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a26",
                border: "1px solid #252535",
                borderRadius: 12,
              }}
              labelStyle={{ color: "#f0f0ff", fontSize: 12 }}
              formatter={(v) => [formatCurrency(v), "Portfolio (SGD)"]}
            />
            <Area
              type="monotone"
              dataKey="Value"
              stroke="#7c6aff"
              strokeWidth={2.5}
              fill="url(#portGrad)"
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (!payload.Value) return null;
                return (
                  <circle
                    key={payload.rawMonth}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill="#7c6aff"
                    stroke="#1a1a26"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{
                r: 6,
                fill: "#a89aff",
                stroke: "#1a1a26",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-xs text-text-muted mt-2 text-center">
          Current month is live · past months use saved snapshots
        </p>
      </div>

      {/* ── Per-market holding tables ─────────────────────────────────────────── */}
      {quotesLoading && quotes.length === 0 ? (
        <div className="card py-12 flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-xs">Fetching live prices…</p>
        </div>
      ) : quotes.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="📈"
            title="No holdings yet"
            description="Add your first stock or ETF to start tracking your portfolio."
            action={
              <button className="btn-primary" onClick={() => setShowForm(true)}>
                + Add Holding
              </button>
            }
          />
        </div>
      ) : (
        marketKeys.map((market) => (
          <MarketSection
            key={market}
            market={market}
            quotes={marketGroups[market]}
            investments={investments}
            deletingId={deletingId}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        ))
      )}

      {/* ── Allocation bar (all markets) ─────────────────────────────────────── */}
      {quotes.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-4">
            Portfolio Allocation (SGD)
          </h2>
          <AllocationBar quotes={quotes} total={totalValueSGD} />
        </div>
      )}

      {showForm && (
        <InvestmentForm investment={editTarget} onClose={closeForm} />
      )}
    </div>
  );
}

// ── MarketSection ─────────────────────────────────────────────────────────────
function MarketSection({
  market,
  quotes,
  investments,
  deletingId,
  onEdit,
  onDelete,
}) {
  const meta = MARKET_META[market] || {
    label: market,
    flag: "🌐",
    currency: "USD",
  };

  // Market-level totals in native currency
  const totalValue = quotes.reduce(
    (s, q) => s + (q.marketValue ?? q.costBasis),
    0,
  );
  const totalCost = quotes.reduce((s, q) => s + q.costBasis, 0);
  const totalPnL = quotes.reduce((s, q) => s + (q.unrealizedPnL ?? 0), 0);
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  // Same totals in SGD for the sub-header
  const totalValueSGD = quotes.reduce(
    (s, q) => s + (q.marketValueSGD ?? q.costBasisSGD ?? 0),
    0,
  );
  const totalPnLSGD = quotes.reduce((s, q) => s + (q.unrealizedPnLSGD ?? 0), 0);

  const isSGD = meta.currency === "SGD";

  return (
    <div className="card">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.flag}</span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              {meta.label}
            </h2>
            <p className="text-xs text-text-muted">
              {meta.currency} · {quotes.length} holding
              {quotes.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {/* Market sub-totals */}
        <div className="flex items-center gap-6 text-right">
          <div>
            <p className="text-xs text-text-muted">Market Value</p>
            <p className="text-sm font-mono text-text-primary">
              {formatNative(totalValue, meta.currency)}
            </p>
            {!isSGD && (
              <p className="text-xs text-text-muted">
                ≈ {formatCurrency(totalValueSGD)}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-text-muted">Unrealized P&amp;L</p>
            <p
              className={`text-sm font-mono ${totalPnL >= 0 ? "text-green" : "text-red"}`}
            >
              {totalPnL >= 0 ? "+" : ""}
              {formatNative(totalPnL, meta.currency)}
            </p>
            {!isSGD && (
              <p
                className={`text-xs ${totalPnLSGD >= 0 ? "text-green" : "text-red"}`}
              >
                ≈ {totalPnLSGD >= 0 ? "+" : ""}
                {formatCurrency(totalPnLSGD)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Holdings table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {[
                "Ticker",
                "Name",
                "Shares",
                "Avg Cost",
                "Current Price",
                "Market Value",
                "P&L",
                "Day Chg",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className={`py-2 px-2 text-text-muted font-medium uppercase text-xs tracking-wider
                  ${["Market Value", "P&L", "Day Chg", ""].includes(h) ? "text-right" : "text-left"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {quotes.map((q) => {
              const pnlPos = (q.unrealizedPnL ?? 0) >= 0;
              const dayPos = (q.dayChangePct ?? 0) >= 0;
              const cur = meta.currency;
              return (
                <tr
                  key={q.id}
                  className="hover:bg-surface/50 transition-colors"
                >
                  <td className="py-3 px-2 font-mono font-semibold text-accent-light">
                    {q.ticker}
                  </td>
                  <td className="py-3 px-2 text-text-secondary max-w-[130px] truncate">
                    {q.shortName || q.name}
                  </td>
                  <td className="py-3 px-2 font-mono text-text-primary">
                    {q.shares}
                  </td>
                  <td className="py-3 px-2 font-mono text-text-secondary">
                    {formatNative(q.avgCost, cur)}
                  </td>
                  <td className="py-3 px-2 font-mono text-text-primary">
                    {q.currentPrice != null ? (
                      formatNative(q.currentPrice, cur)
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="py-3 px-2 font-mono text-right">
                    <div className="text-text-primary">
                      {formatNative(q.marketValue ?? q.costBasis, cur)}
                    </div>
                    {!isSGD && q.marketValueSGD != null && (
                      <div className="text-xs text-text-muted">
                        ≈ {formatCurrency(q.marketValueSGD)}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2 font-mono text-right">
                    {q.unrealizedPnL != null ? (
                      <div className={pnlPos ? "text-green" : "text-red"}>
                        <div>
                          {pnlPos ? "+" : ""}
                          {formatNative(q.unrealizedPnL, cur)}
                        </div>
                        <div className="text-xs opacity-80">
                          {formatPercent(q.unrealizedPnLPct)}
                        </div>
                        {!isSGD && q.unrealizedPnLSGD != null && (
                          <div className="text-xs opacity-60">
                            ≈ {q.unrealizedPnLSGD >= 0 ? "+" : ""}
                            {formatCurrency(q.unrealizedPnLSGD)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td
                    className={`py-3 px-2 font-mono text-right text-xs ${dayPos ? "text-green" : "text-red"}`}
                  >
                    {q.dayChangePct != null
                      ? formatPercent(q.dayChangePct)
                      : "—"}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() =>
                          onEdit(investments.find((i) => i.id === q.id))
                        }
                        className="text-text-muted hover:text-accent text-xs px-2 py-1 rounded-lg hover:bg-accent/10 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(q.id)}
                        disabled={deletingId === q.id}
                        className="text-text-muted hover:text-red text-xs px-2 py-1 rounded-lg hover:bg-red/10 transition-colors"
                      >
                        {deletingId === q.id ? "…" : "Remove"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Market footer total */}
          <tfoot>
            <tr className="border-t-2 border-border">
              <td
                colSpan={5}
                className="py-2 px-2 text-xs text-text-muted uppercase tracking-wider font-medium"
              >
                {meta.label} Total
              </td>
              <td className="py-2 px-2 text-right">
                <div className="font-mono font-semibold text-text-primary text-sm">
                  {formatNative(totalValue, meta.currency)}
                </div>
                {!isSGD && (
                  <div className="font-mono text-text-muted text-xs">
                    ≈ {formatCurrency(totalValueSGD)}
                  </div>
                )}
              </td>
              <td className="py-2 px-2 text-right">
                <span
                  className={`font-mono font-semibold text-sm ${totalPnL >= 0 ? "text-green" : "text-red"}`}
                >
                  {totalPnL >= 0 ? "+" : ""}
                  {formatNative(totalPnL, meta.currency)}
                </span>
                {!isSGD && (
                  <div
                    className={`font-mono text-xs ${totalPnLSGD >= 0 ? "text-green" : "text-red"}`}
                  >
                    ≈ {totalPnLSGD >= 0 ? "+" : ""}
                    {formatCurrency(totalPnLSGD)}
                  </div>
                )}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── AllocationBar ─────────────────────────────────────────────────────────────
function AllocationBar({ quotes, total }) {
  const sorted = [...quotes].sort(
    (a, b) =>
      (b.marketValueSGD ?? b.costBasisSGD ?? 0) -
      (a.marketValueSGD ?? a.costBasisSGD ?? 0),
  );
  return (
    <div>
      <div className="flex h-5 rounded-full overflow-hidden gap-px mb-4">
        {sorted.map((q, i) => {
          const val = q.marketValueSGD ?? q.costBasisSGD ?? 0;
          const pct = total > 0 ? (val / total) * 100 : 0;
          return (
            <div
              key={q.id}
              style={{
                width: `${pct}%`,
                backgroundColor: TICKER_COLORS[i % TICKER_COLORS.length],
              }}
              title={`${q.ticker}: ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4">
        {sorted.map((q, i) => {
          const val = q.marketValueSGD ?? q.costBasisSGD ?? 0;
          const pct = total > 0 ? (val / total) * 100 : 0;
          const meta = MARKET_META[q.market] || { flag: "🌐" };
          return (
            <div key={q.id} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{
                  backgroundColor: TICKER_COLORS[i % TICKER_COLORS.length],
                }}
              />
              <span className="text-xs">{meta.flag}</span>
              <span className="text-xs text-text-secondary font-mono">
                {q.ticker}
              </span>
              <span className="text-xs text-text-muted">{pct.toFixed(1)}%</span>
              <span className="text-xs text-text-muted">
                {formatCurrency(val)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
