import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import useExpenseStore from '../../store/expenseStore';
import useInvestmentStore from '../../store/investmentStore';
import {
  formatCurrency, formatMonth,
  CATEGORY_COLORS, currentYearMonth,
} from '../../utils/formatters';

export default function DashboardPage() {
  const { summary, transactions, fetchSummary, fetchTransactions, fetchAccounts } = useExpenseStore();
  const { netWorth, fetchNetWorth, quotes, fetchLiveQuotes } = useInvestmentStore();

  useEffect(() => {
    fetchAccounts();
    fetchSummary();
    fetchTransactions(currentYearMonth());
    fetchNetWorth();
    fetchLiveQuotes();
  }, []);

  const currentMonth     = currentYearMonth();
  const thisMonthData    = summary.find(s => s.month === currentMonth);
  const totalIncome      = thisMonthData?.totalIncome   ?? 0;
  const totalExpenses    = thisMonthData?.totalExpenses ?? 0;
  const netPL            = thisMonthData?.netPL         ?? 0;
  const totalInvestments = quotes.reduce((s, q) => s + (q.marketValue ?? q.costBasis), 0);

  const pieData = thisMonthData
    ? Object.entries(thisMonthData.byCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6)
    : [];

  const areaData = summary.slice(-6).map(s => ({
    month:    formatMonth(s.month),
    Income:   s.totalIncome,
    Expenses: s.totalExpenses,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-text-primary">Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">
          {new Date().toLocaleDateString('en-SG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card border-accent/30 bg-accent/5">
          <span className="stat-label">Net Worth</span>
          <span className="stat-value text-accent-light">{formatCurrency(netWorth?.totalNetWorth)}</span>
          <span className="text-xs text-text-muted">cash + investments</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Portfolio</span>
          <span className="stat-value">{formatCurrency(totalInvestments)}</span>
          <span className="text-xs text-text-muted">{quotes.length} holdings</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Income — {formatMonth(currentMonth)}</span>
          <span className="stat-value text-green">{formatCurrency(totalIncome)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Expenses — {formatMonth(currentMonth)}</span>
          <span className="stat-value text-red">{formatCurrency(totalExpenses)}</span>
          <span className={`text-xs font-mono ${netPL >= 0 ? 'text-green' : 'text-red'}`}>Net {formatCurrency(netPL)}</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-4">Income vs Expenses</h2>
          {areaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#34d399" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f87171" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#9090b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9090b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #252535', borderRadius: 12 }} formatter={(v, name) => [formatCurrency(v), name]} />
                <Legend formatter={v => <span style={{ color: '#9090b8', fontSize: 11 }}>{v}</span>} />
                <Area type="monotone" dataKey="Income"   stroke="#34d399" strokeWidth={2} fill="url(#incGrad)" />
                <Area type="monotone" dataKey="Expenses" stroke="#f87171" strokeWidth={2} fill="url(#expGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">
              No data yet — <Link to="/money-flow" className="text-accent ml-1">add transactions</Link>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-4">Spending by Category</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map(entry => <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#9090b8'} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #252535', borderRadius: 12 }} formatter={v => [formatCurrency(v)]} />
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ color: '#9090b8', fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Recent transactions + Holdings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest">Recent Transactions</h2>
            <Link to="/money-flow" className="text-xs text-accent hover:text-accent-light transition-colors">View all →</Link>
          </div>
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.slice(0, 6).map(tx => (
                <div key={tx.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tx.type === 'income' ? '#34d399' : (CATEGORY_COLORS[tx.category] || '#f87171') }} />
                    <div>
                      <p className="text-sm text-text-primary">{tx.detail}</p>
                      <p className="text-xs text-text-muted">{tx.category || tx.type}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-mono ${tx.type === 'income' ? 'text-green' : 'text-red'}`}>
                    {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm text-center py-8">No transactions this month</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest">Portfolio Holdings</h2>
            <Link to="/networth" className="text-xs text-accent hover:text-accent-light transition-colors">View all →</Link>
          </div>
          {quotes.length > 0 ? (
            <div className="space-y-3">
              {quotes.slice(0, 5).map(q => (
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
