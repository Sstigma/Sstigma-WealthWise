import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend,
} from 'recharts';
import useInvestmentStore from '../../store/investmentStore';
import InvestmentForm from './InvestmentForm';
import EmptyState from '../shared/EmptyState';
import {
  formatCurrency, formatPercent, formatMonth, currentYearMonth,
} from '../../utils/formatters';

export default function NetWorthPage() {
  const {
    quotes, quotesLoading, quotesError, fetchLiveQuotes,
    investments, fetchInvestments,
    netWorth, fetchNetWorth,
    networthHistory, fetchNetWorthHistory,
    deleteInvestment, saveSnapshot,
  } = useInvestmentStore();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState('');

  useEffect(() => {
    fetchInvestments();
    fetchLiveQuotes();
    fetchNetWorth();
    fetchNetWorthHistory();
  }, []);

  const closeForm = () => { setShowForm(false); setEditTarget(null); };
  const openEdit = (inv) => { setEditTarget(inv); setShowForm(true); };

  const handleDelete = async (id) => {
    if (!confirm('Remove this holding?')) return;
    setDeletingId(id);
    try { await deleteInvestment(id); await fetchLiveQuotes(); await fetchNetWorth(); }
    finally { setDeletingId(null); }
  };

  const handleRefresh = async () => {
    await fetchLiveQuotes();
    await fetchNetWorth();
  };

  const handleSaveSnapshot = async () => {
    setSavingSnapshot(true);
    setSnapshotMsg('');
    try {
      const month = currentYearMonth();
      const cash = netWorth?.cash ?? 0;
      const investmentsValue = netWorth?.investmentsValue ?? 0;
      await saveSnapshot({ cash, investmentsValue, month });
      await fetchNetWorthHistory();
      setSnapshotMsg(`Snapshot saved for ${formatMonth(month)}`);
      setTimeout(() => setSnapshotMsg(''), 3000);
    } catch (err) {
      setSnapshotMsg('Failed to save snapshot: ' + err.message);
    } finally {
      setSavingSnapshot(false);
    }
  };

  const totalMarketValue = quotes.reduce((s, q) => s + (q.marketValue ?? q.costBasis), 0);
  const totalCostBasis = quotes.reduce((s, q) => s + q.costBasis, 0);
  const totalUnrealizedPnL = totalMarketValue - totalCostBasis;
  const totalUnrealizedPct = totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0;

  // History chart data
  const historyData = networthHistory.map((h) => ({
    month: formatMonth(h.month),
    'Net Worth': h.totalNetWorth,
    Investments: h.investmentsValue,
    Cash: h.cash,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl text-text-primary">Net Worth</h1>
          <p className="text-text-secondary text-sm mt-1">Portfolio holdings and total wealth overview</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="btn-ghost text-sm" disabled={quotesLoading}>
            {quotesLoading ? '⟳ Refreshing…' : '⟳ Refresh Quotes'}
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Holding</button>
        </div>
      </div>

      {/* Quotes error banner */}
      {quotesError && (
        <div className="px-4 py-3 bg-red/10 border border-red/30 rounded-xl text-sm flex items-center justify-between gap-3">
          <span className="text-red">
            ⚠ Could not load live prices: {quotesError}
          </span>
          <button onClick={handleRefresh} className="text-xs text-red hover:text-red/80 underline whitespace-nowrap">
            Retry
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Net Worth"
          value={formatCurrency(netWorth?.totalNetWorth)}
          accent
        />
        <StatCard
          label="Portfolio Value"
          value={formatCurrency(totalMarketValue)}
          sub={
            <span className={totalUnrealizedPnL >= 0 ? 'text-green' : 'text-red'}>
              {formatPercent(totalUnrealizedPct)} all time
            </span>
          }
        />
        <StatCard
          label="Unrealized P&amp;L"
          value={formatCurrency(totalUnrealizedPnL)}
          sub={formatPercent(totalUnrealizedPct)}
          positive={totalUnrealizedPnL >= 0}
          negative={totalUnrealizedPnL < 0}
        />
        <StatCard
          label="Cash Balance"
          value={formatCurrency(netWorth?.cash)}
          sub="income minus expenses"
          positive={(netWorth?.cash ?? 0) >= 0}
          negative={(netWorth?.cash ?? 0) < 0}
        />
      </div>

      {/* Net Worth History Chart */}
      {historyData.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest">
              Net Worth History
            </h2>
            <div className="flex items-center gap-2">
              {snapshotMsg && (
                <span className="text-xs text-green">{snapshotMsg}</span>
              )}
              <button
                onClick={handleSaveSnapshot}
                disabled={savingSnapshot}
                className="text-xs btn-ghost py-1 px-3"
              >
                {savingSnapshot ? 'Saving…' : '+ Save Snapshot'}
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={historyData}>
              <defs>
                <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c6aff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c6aff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: '#9090b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9090b8', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #252535', borderRadius: 12 }}
                labelStyle={{ color: '#f0f0ff', fontSize: 12 }}
                formatter={(v, name) => [formatCurrency(v), name]}
              />
              <Legend formatter={(v) => <span style={{ color: '#9090b8', fontSize: 11 }}>{v}</span>} />
              <Area type="monotone" dataKey="Net Worth" stroke="#7c6aff" strokeWidth={2} fill="url(#nwGrad)" />
              <Area type="monotone" dataKey="Investments" stroke="#34d399" strokeWidth={2} fill="url(#invGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* No snapshot state */}
      {historyData.length === 0 && (
        <div className="card flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-text-primary font-medium">Save your first net worth snapshot</p>
            <p className="text-text-secondary text-sm mt-1">
              Snapshots let you track your wealth over time month by month.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {snapshotMsg && <span className="text-xs text-green">{snapshotMsg}</span>}
            <button onClick={handleSaveSnapshot} disabled={savingSnapshot} className="btn-primary">
              {savingSnapshot ? 'Saving…' : 'Save Snapshot'}
            </button>
          </div>
        </div>
      )}

      {/* Portfolio holdings table */}
      <div className="card">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-5">
          Holdings
        </h2>

        {quotesLoading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-text-muted text-xs">Fetching live prices…</p>
          </div>
        ) : quotes.length === 0 ? (
          <EmptyState
            icon="📈"
            title="No holdings yet"
            description="Add your first investment to start tracking your portfolio."
            action={
              <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add Holding</button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Ticker', 'Name', 'Shares', 'Avg Cost', 'Current Price', 'Market Value', 'P&L', 'Day Chg', ''].map((h) => (
                    <th key={h} className={`py-3 px-2 text-text-muted font-medium uppercase text-xs tracking-wider ${h === '' || h === 'Market Value' || h === 'P&L' || h === 'Day Chg' ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quotes.map((q) => {
                  const pnlPositive = (q.unrealizedPnL ?? 0) >= 0;
                  const dayPositive = (q.dayChangePct ?? 0) >= 0;
                  return (
                    <tr key={q.id} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3 px-2 font-mono font-semibold text-accent-light">{q.ticker}</td>
                      <td className="py-3 px-2 text-text-secondary max-w-[140px] truncate">{q.shortName || q.name}</td>
                      <td className="py-3 px-2 font-mono text-text-primary">{q.shares}</td>
                      <td className="py-3 px-2 font-mono text-text-secondary">{formatCurrency(q.avgCost)}</td>
                      <td className="py-3 px-2 font-mono text-text-primary">
                        {q.currentPrice != null ? formatCurrency(q.currentPrice) : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="py-3 px-2 font-mono text-right text-text-primary">
                        {q.marketValue != null ? formatCurrency(q.marketValue) : formatCurrency(q.costBasis)}
                      </td>
                      <td className="py-3 px-2 font-mono text-right">
                        {q.unrealizedPnL != null ? (
                          <div className={pnlPositive ? 'text-green' : 'text-red'}>
                            <div>{pnlPositive ? '+' : ''}{formatCurrency(q.unrealizedPnL)}</div>
                            <div className="text-xs">{formatPercent(q.unrealizedPnLPct)}</div>
                          </div>
                        ) : <span className="text-text-muted">—</span>}
                      </td>
                      <td className={`py-3 px-2 font-mono text-right text-xs ${dayPositive ? 'text-green' : 'text-red'}`}>
                        {q.dayChangePct != null ? formatPercent(q.dayChangePct) : '—'}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(investments.find((i) => i.id === q.id))}
                            className="text-text-muted hover:text-accent transition-colors text-xs px-2 py-1 rounded-lg hover:bg-accent/10"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            disabled={deletingId === q.id}
                            className="text-text-muted hover:text-red transition-colors text-xs px-2 py-1 rounded-lg hover:bg-red/10"
                          >
                            {deletingId === q.id ? '…' : 'Remove'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Footer totals */}
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td colSpan={5} className="py-3 px-2 text-text-secondary text-xs uppercase tracking-wider">Total</td>
                  <td className="py-3 px-2 font-mono font-semibold text-right text-text-primary">
                    {formatCurrency(totalMarketValue)}
                  </td>
                  <td className="py-3 px-2 font-mono font-semibold text-right">
                    <span className={totalUnrealizedPnL >= 0 ? 'text-green' : 'text-red'}>
                      {totalUnrealizedPnL >= 0 ? '+' : ''}{formatCurrency(totalUnrealizedPnL)}
                    </span>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Allocation bar */}
      {quotes.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-4">
            Portfolio Allocation
          </h2>
          <AllocationBar quotes={quotes} total={totalMarketValue} />
        </div>
      )}

      {showForm && <InvestmentForm investment={editTarget} onClose={closeForm} />}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent, positive, negative }) {
  return (
    <div className={`stat-card ${accent ? 'border-accent/30 bg-accent/5' : ''}`}>
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${accent ? 'text-accent-light' : positive ? 'text-green' : negative ? 'text-red' : ''}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-text-muted">{sub}</span>}
    </div>
  );
}

const TICKER_COLORS = [
  '#7c6aff', '#34d399', '#f5c542', '#f87171', '#60a5fa',
  '#fb923c', '#a78bfa', '#4ade80', '#38bdf8', '#f472b6',
];

function AllocationBar({ quotes, total }) {
  const sorted = [...quotes].sort((a, b) => (b.marketValue ?? b.costBasis) - (a.marketValue ?? a.costBasis));

  return (
    <div>
      {/* Stacked bar */}
      <div className="flex h-5 rounded-full overflow-hidden gap-px mb-4">
        {sorted.map((q, i) => {
          const val = q.marketValue ?? q.costBasis;
          const pct = total > 0 ? (val / total) * 100 : 0;
          return (
            <div
              key={q.id}
              style={{ width: `${pct}%`, backgroundColor: TICKER_COLORS[i % TICKER_COLORS.length] }}
              title={`${q.ticker}: ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {sorted.map((q, i) => {
          const val = q.marketValue ?? q.costBasis;
          const pct = total > 0 ? (val / total) * 100 : 0;
          return (
            <div key={q.id} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: TICKER_COLORS[i % TICKER_COLORS.length] }} />
              <span className="text-xs text-text-secondary font-mono">{q.ticker}</span>
              <span className="text-xs text-text-muted">{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
