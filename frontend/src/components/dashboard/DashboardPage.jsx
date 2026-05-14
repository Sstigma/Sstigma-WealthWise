import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import useExpenseStore from "../../store/expenseStore";
import useInvestmentStore from "../../store/investmentStore";
import {
  formatCurrency,
  formatMonth,
  CATEGORY_COLORS,
  currentYearMonth,
} from "../../utils/formatters";

export default function DashboardPage() {
  const {
    summary,
    transactions,
    fetchSummary,
    fetchTransactions,
    fetchAccounts,
  } = useExpenseStore();

  const {
    quotes,
    fetchLiveQuotes,
    networthHistory,
    fetchNetWorthHistory,
    autoSnapshotPreviousMonth,
  } = useInvestmentStore();

  useEffect(() => {
    fetchAccounts();
    fetchSummary();
    fetchTransactions(currentYearMonth());
    fetchLiveQuotes();
    fetchNetWorthHistory();
  }, []);

  // Auto-snapshot: once quotes + summary are both loaded, check if previous
  // month needs a snapshot and save one silently if so.
  const hasAutoSnapped = useRef(false);
  useEffect(() => {
    // Wait until we have real quote data and at least one month of summary
    if (hasAutoSnapped.current) return;
    if (quotes.length === 0 || summary.length === 0) return;

    hasAutoSnapped.current = true; // only run once per page load

    // Build cumulative cash map from summary so the snapshot records correct cash
    const sortedSummary = [...summary].sort((a, b) =>
      a.month.localeCompare(b.month),
    );
    let running = 0;
    const cashByMonth = {};
    sortedSummary.forEach((s) => {
      running += s.netPL;
      cashByMonth[s.month] = running;
    });

    autoSnapshotPreviousMonth(cashByMonth);
  }, [quotes, summary]);

  const currentMonth = currentYearMonth();
  const thisMonthData = summary.find((s) => s.month === currentMonth);
  const totalIncome = thisMonthData?.totalIncome ?? 0;
  const totalExpenses = thisMonthData?.totalExpenses ?? 0;
  const netPL = thisMonthData?.netPL ?? 0;

  // Cash = running total of all income minus all expenses across all time
  const totalCash = useMemo(
    () => summary.reduce((acc, s) => acc + s.netPL, 0),
    [summary],
  );

  // Portfolio live value
  const totalPortfolio = quotes.reduce(
    (s, q) => s + (q.marketValue ?? q.costBasis),
    0,
  );

  // Net Worth = cash on hand + live portfolio value
  const totalNetWorth = totalCash + totalPortfolio;

  // ── Net Worth over 6 months chart ─────────────────────────────────────────
  // For each of the last 6 months:
  //   cash   = cumulative netPL up to and including that month
  //   stocks = saved snapshot for that month (or 0 if not yet snapshotted)
  //   current month always uses live portfolio value
  const networthChartData = useMemo(() => {
    const now = new Date();

    // Build cumulative cash map: for each month, sum all summary netPL up to that point
    const sortedSummary = [...summary].sort((a, b) =>
      a.month.localeCompare(b.month),
    );
    let runningCash = 0;
    const cashByMonth = {};
    sortedSummary.forEach((s) => {
      runningCash += s.netPL;
      cashByMonth[s.month] = runningCash;
    });

    // Build snapshot lookup for portfolio value by month
    const snapshotLookup = {};
    networthHistory.forEach((h) => {
      snapshotLookup[h.month] = h.investmentsValue;
    });

    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const isCurrentMonth = i === 0;

      const cash = cashByMonth[key] ?? 0;
      const portfolio = isCurrentMonth
        ? totalPortfolio // always live for current month
        : (snapshotLookup[key] ?? 0); // saved snapshot for past months

      result.push({
        month: formatMonth(key),
        rawMonth: key,
        "Net Worth": cash + portfolio,
        Cash: cash,
        Portfolio: portfolio,
      });
    }
    return result;
  }, [summary, networthHistory, totalPortfolio]);

  // Category pie (this month expenses only)
  const pieData = thisMonthData
    ? Object.entries(thisMonthData.byCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl text-text-primary">Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">
          {new Date().toLocaleDateString("en-SG", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Net Worth = cash + portfolio — computed live, no API call needed */}
        <div className="stat-card border-accent/30 bg-accent/5">
          <span className="stat-label">Net Worth</span>
          <span className="stat-value text-accent-light">
            {formatCurrency(totalNetWorth)}
          </span>
          <span className="text-xs text-text-muted">cash + investments</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Portfolio</span>
          <span className="stat-value">{formatCurrency(totalPortfolio)}</span>
          <span className="text-xs text-text-muted">
            {quotes.length} holdings
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">
            Income — {formatMonth(currentMonth)}
          </span>
          <span className="stat-value text-green">
            {formatCurrency(totalIncome)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">
            Expenses — {formatMonth(currentMonth)}
          </span>
          <span className="stat-value text-red">
            {formatCurrency(totalExpenses)}
          </span>
          <span
            className={`text-xs font-mono ${netPL >= 0 ? "text-green" : "text-red"}`}
          >
            Net {formatCurrency(netPL)}
          </span>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Net Worth over 6 months */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest">
              Net Worth — Last 6 Months
            </h2>
            <span className="text-xs text-text-muted">Cash + Portfolio</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={networthChartData}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c6aff" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#7c6aff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f5c542" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f5c542" stopOpacity={0} />
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
                formatter={(v, name) => [formatCurrency(v), name]}
              />
              <Legend
                formatter={(v) => (
                  <span style={{ color: "#9090b8", fontSize: 11 }}>{v}</span>
                )}
              />
              {/* Net Worth on top as the primary line */}
              <Area
                type="monotone"
                dataKey="Net Worth"
                stroke="#7c6aff"
                strokeWidth={2.5}
                fill="url(#nwGrad)"
                dot={{
                  fill: "#7c6aff",
                  r: 3,
                  stroke: "#1a1a26",
                  strokeWidth: 2,
                }}
                activeDot={{ r: 5 }}
              />
              {/* Cash and Portfolio as secondary reference lines */}
              <Area
                type="monotone"
                dataKey="Cash"
                stroke="#34d399"
                strokeWidth={1.5}
                fill="url(#cashGrad)"
                strokeDasharray="4 3"
                dot={{ fill: "#34d399", r: 2 }}
                activeDot={{ r: 4 }}
              />
              <Area
                type="monotone"
                dataKey="Portfolio"
                stroke="#f5c542"
                strokeWidth={1.5}
                fill="url(#portGrad)"
                strokeDasharray="4 3"
                dot={{ fill: "#f5c542", r: 2 }}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-text-muted mt-1 text-center">
            Portfolio uses live price for current month · past months use saved
            snapshots from the Portfolio page
          </p>
        </div>

        {/* Spending by category */}
        <div className="card">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-4">
            Spending by Category
          </h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={CATEGORY_COLORS[entry.name] || "#9090b8"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a26",
                    border: "1px solid #252535",
                    borderRadius: 12,
                  }}
                  formatter={(v) => [formatCurrency(v)]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => (
                    <span style={{ color: "#9090b8", fontSize: 11 }}>{v}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">
              No expenses this month
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions + Holdings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest">
              Recent Transactions
            </h2>
            <Link
              to="/money-flow"
              className="text-xs text-accent hover:text-accent-light transition-colors"
            >
              View all →
            </Link>
          </div>
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.slice(0, 6).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          tx.type === "income"
                            ? "#34d399"
                            : CATEGORY_COLORS[tx.category] || "#f87171",
                      }}
                    />
                    <div>
                      <p className="text-sm text-text-primary">{tx.detail}</p>
                      <p className="text-xs text-text-muted">
                        {tx.category || tx.type}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-mono ${tx.type === "income" ? "text-green" : "text-red"}`}
                  >
                    {tx.type === "income" ? "+" : "−"}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm text-center py-8">
              No transactions this month
            </p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest">
              Portfolio Holdings
            </h2>
            <Link
              to="/networth"
              className="text-xs text-accent hover:text-accent-light transition-colors"
            >
              View all →
            </Link>
          </div>
          {quotes.length > 0 ? (
            <div className="space-y-3">
              {quotes.slice(0, 5).map((q) => (
                <div key={q.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-primary font-mono">
                      {q.ticker}
                    </p>
                    <p className="text-xs text-text-muted">{q.shares} shares</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-text-primary">
                      {formatCurrency(q.marketValue)}
                    </p>
                    {q.unrealizedPnLPct != null && (
                      <p
                        className={`text-xs font-mono ${q.unrealizedPnLPct >= 0 ? "text-green" : "text-red"}`}
                      >
                        {q.unrealizedPnLPct >= 0 ? "+" : ""}
                        {q.unrealizedPnLPct.toFixed(2)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm text-center py-8">
              No holdings yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
