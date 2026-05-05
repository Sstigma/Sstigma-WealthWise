import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import useExpenseStore from '../../store/expenseStore';
import useInvestmentStore from '../../store/investmentStore';
import { formatCurrency, formatMonth, CATEGORY_COLORS, currentYearMonth } from '../../utils/formatters';

export default function DashboardPage() {
  const { summary, fetchSummary, expenses, fetchExpenses } = useExpenseStore();
  const { netWorth, fetchNetWorth, quotes, fetchLiveQuotes } = useInvestmentStore();

  useEffect(() => {
    fetchSummary();
    fetchExpenses(currentYearMonth());
    fetchNetWorth();
    fetchLiveQuotes();
  }, []);

  const currentMonth = currentYearMonth();
  const thisMonthSummary = summary.find((s) => s.month === currentMonth);
  const totalSpentThisMonth = thisMonthSummary?.total ?? 0;

  // Category pie data from this month
  const pieData = thisMonthSummary
    ? Object.entries(thisMonthSummary.byCategory).map(([name, value]) => ({ name, value }))
    : [];

  // Area chart: last 6 months spending
  const areaData = summary.slice(-6).map((s) => ({
    month: formatMonth(s.month),
    Expenses: s.total,
  }));

  const totalInvestments = quotes.reduce((s, q) => s + (q.marketValue ?? q.costBasis), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl text-text-primary">Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Net Worth"
          value={formatCurrency(netWorth?.totalNetWorth)}
          sub="cash + investments"
          accent
        />
        <StatCard
          label="Portfolio Value"
          value={formatCurrency(totalInvestments)}
          sub={`${quotes.length} holding${quotes.length !== 1 ? 's' : ''}`}
        />
        <StatCard
          label={`Spent — ${formatMonth(currentMonth)}`}
          value={formatCurrency(totalSpentThisMonth)}
          sub={`${expenses.length} transactions`}
          negative={totalSpentThisMonth > 0}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Spending trend */}
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-4">
            Monthly Spending Trend
          </h2>
          {areaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c6aff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c6aff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#9090b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9090b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #252535', borderRadius: 12 }}
                  labelStyle={{ color: '#f0f0ff', fontSize: 12 }}
                  itemStyle={{ color: '#a89aff' }}
                  formatter={(v) => [formatCurrency(v), 'Expenses']}
                />
                <Area type="monotone" dataKey="Expenses" stroke="#7c6aff" strokeWidth={2} fill="url(#expGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">
              No spending data yet — <Link to="/expenses" className="text-accent ml-1">add expenses</Link>
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="card">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-4">
            This Month by Category
          </h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#9090b8'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #252535', borderRadius: 12 }}
                  formatter={(v) => [formatCurrency(v)]}
                />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: '#9090b8', fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Recent expenses + Top holdings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent expenses */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest">Recent Expenses</h2>
            <Link to="/expenses" className="text-xs text-accent hover:text-accent-light transition-colors">View all →</Link>
          </div>
          {expenses.length > 0 ? (
            <div className="space-y-3">
              {expenses.slice(0, 5).map((e) => (
                <div key={e.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[e.category] || '#9090b8' }}
                    />
                    <div>
                      <p className="text-sm text-text-primary">{e.detail}</p>
                      <p className="text-xs text-text-muted">{e.category}</p>
                    </div>
                  </div>
                  <span className="text-sm font-mono text-red">{formatCurrency(e.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm text-center py-8">No expenses this month</p>
          )}
        </div>

        {/* Top holdings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest">Portfolio Holdings</h2>
            <Link to="/networth" className="text-xs text-accent hover:text-accent-light transition-colors">View all →</Link>
          </div>
          {quotes.length > 0 ? (
            <div className="space-y-3">
              {quotes.slice(0, 5).map((q) => (
                <div key={q.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-primary font-mono">{q.ticker}</p>
                    <p className="text-xs text-text-muted">{q.shares} shares</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-text-primary">{formatCurrency(q.marketValue)}</p>
                    {q.unrealizedPnLPct != null && (
                      <p className={`text-xs font-mono ${q.unrealizedPnLPct >= 0 ? 'text-green' : 'text-red'}`}>
                        {q.unrealizedPnLPct >= 0 ? '+' : ''}{q.unrealizedPnLPct.toFixed(2)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm text-center py-8">No holdings yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent, negative }) {
  return (
    <div className={`stat-card ${accent ? 'border-accent/30 bg-accent/5' : ''}`}>
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${accent ? 'text-accent-light' : negative ? 'text-red' : ''}`}>{value}</span>
      {sub && <span className="text-xs text-text-muted">{sub}</span>}
    </div>
  );
}
