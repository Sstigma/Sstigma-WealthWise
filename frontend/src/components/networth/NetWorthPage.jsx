import { useEffect, useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend,
} from 'recharts';
import useInvestmentStore from '../../store/investmentStore';
import InvestmentForm from './InvestmentForm';
import EmptyState from '../shared/EmptyState';
import { formatCurrency, formatPercent, currentYearMonth, formatMonth } from '../../utils/formatters';

// ── Colours ───────────────────────────────────────────────────────────────────
const TICKER_COLORS = [
  '#7c6aff','#34d399','#f5c542','#f87171','#60a5fa',
  '#fb923c','#a78bfa','#4ade80','#38bdf8','#f472b6',
];

export default function NetWorthPage() {
  const {
    quotes, quotesLoading, quotesError, fetchLiveQuotes,
    investments, fetchInvestments,
    networthHistory, fetchNetWorthHistory,
    saveSnapshot, deleteInvestment,
  } = useInvestmentStore();

  const [showForm,    setShowForm]    = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [deletingId,  setDeletingId]  = useState(null);
  const [savingSnap,  setSavingSnap]  = useState(false);
  const [snapMsg,     setSnapMsg]     = useState('');

  useEffect(() => {
    fetchInvestments();
    fetchLiveQuotes();
    fetchNetWorthHistory();
  }, []);

  // ── Derived totals ──────────────────────────────────────────────────────────
  const totalMarketValue    = quotes.reduce((s, q) => s + (q.marketValue  ?? q.costBasis), 0);
  const totalCostBasis      = quotes.reduce((s, q) => s + q.costBasis, 0);
  const totalUnrealizedPnL  = totalMarketValue - totalCostBasis;
  const totalUnrealizedPct  = totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0;
  const totalDayChange      = quotes.reduce((s, q) => {
    if (q.dayChangePct == null || q.marketValue == null) return s;
    const prevValue = q.marketValue / (1 + q.dayChangePct / 100);
    return s + (q.marketValue - prevValue);
  }, 0);

  // ── Performance chart ───────────────────────────────────────────────────────
  // Build a 6-month skeleton, inject saved snapshots where they exist,
  // and pin the CURRENT month to live portfolio value so the chart is always fresh.
  const perfData = useMemo(() => {
    const lookup = {};
    networthHistory.forEach(h => { lookup[h.month] = h.investmentsValue; });

    const now    = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const isCurrentMonth = (i === 0);
      result.push({
        month: formatMonth(key),
        rawMonth: key,
        Value: isCurrentMonth
          ? totalMarketValue                  // always live for current month
          : (lookup[key] ?? 0),              // snapshot or $0 for past months
      });
    }
    return result;
  }, [networthHistory, totalMarketValue]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const closeForm   = ()    => { setShowForm(false); setEditTarget(null); };
  const openEdit    = (inv) => { setEditTarget(inv); setShowForm(true); };

  const handleDelete = async (id) => {
    if (!confirm('Remove this holding?')) return;
    setDeletingId(id);
    try { await deleteInvestment(id); await fetchLiveQuotes(); }
    finally { setDeletingId(null); }
  };

  const handleRefresh = () => fetchLiveQuotes();

  const handleSaveSnapshot = async () => {
    setSavingSnap(true); setSnapMsg('');
    try {
      const month = currentYearMonth();
      await saveSnapshot({ cash: 0, investmentsValue: totalMarketValue, month });
      await fetchNetWorthHistory();
      setSnapMsg('Snapshot saved');
      setTimeout(() => setSnapMsg(''), 3000);
    } catch (err) {
      setSnapMsg('Failed: ' + err.message);
    } finally { setSavingSnap(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl text-text-primary">Portfolio</h1>
          <p className="text-text-secondary text-sm mt-1">Holdings, performance and allocation</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} disabled={quotesLoading}
            className="btn-ghost text-sm">
            {quotesLoading ? '⟳ Refreshing…' : '⟳ Refresh Quotes'}
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Holding</button>
        </div>
      </div>

      {/* Error banner */}
      {quotesError && (
        <div className="px-4 py-3 bg-red/10 border border-red/30 rounded-xl text-sm flex items-center justify-between gap-3">
          <span className="text-red">⚠ {quotesError}</span>
          <button onClick={handleRefresh} className="text-xs text-red underline">Retry</button>
        </div>
      )}

      {/* ── 3 stat cards — portfolio focused ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card border-accent/30 bg-accent/5">
          <span className="stat-label">Portfolio Value</span>
          <span className="stat-value text-accent-light">{formatCurrency(totalMarketValue)}</span>
          <span className="text-xs text-text-muted">{quotes.length} holding{quotes.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Unrealized P&amp;L</span>
          <span className={`stat-value ${totalUnrealizedPnL >= 0 ? 'text-green' : 'text-red'}`}>
            {totalUnrealizedPnL >= 0 ? '+' : ''}{formatCurrency(totalUnrealizedPnL)}
          </span>
          <span className={`text-xs font-mono ${totalUnrealizedPct >= 0 ? 'text-green' : 'text-red'}`}>
            {formatPercent(totalUnrealizedPct)} all time
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Today's Change</span>
          <span className={`stat-value ${totalDayChange >= 0 ? 'text-green' : 'text-red'}`}>
            {totalDayChange >= 0 ? '+' : ''}{formatCurrency(totalDayChange)}
          </span>
          <span className="text-xs text-text-muted">across all holdings</span>
        </div>
      </div>

      {/* ── Portfolio performance chart ──────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest">
            Portfolio Performance — Last 6 Months
          </h2>
          <div className="flex items-center gap-2">
            {snapMsg && <span className="text-xs text-green">{snapMsg}</span>}
            <button onClick={handleSaveSnapshot} disabled={savingSnap}
              className="text-xs btn-ghost py-1 px-3">
              {savingSnap ? 'Saving…' : '+ Save Snapshot'}
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={perfData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#7c6aff" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#7c6aff" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fill: '#9090b8', fontSize: 11 }}
              axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9090b8', fontSize: 11 }}
              axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`}
              width={52} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #252535', borderRadius: 12 }}
              labelStyle={{ color: '#f0f0ff', fontSize: 12 }}
              formatter={v => [formatCurrency(v), 'Portfolio Value']}
            />
            <Area type="monotone" dataKey="Value" stroke="#7c6aff" strokeWidth={2.5}
              fill="url(#portGrad)"
              dot={(props) => {
                const { cx, cy, payload } = props;
                // Only show dot for current month (last point)
                if (payload.Value === 0) return null;
                return <circle key={payload.rawMonth} cx={cx} cy={cy} r={4}
                  fill="#7c6aff" stroke="#1a1a26" strokeWidth={2} />;
              }}
              activeDot={{ r: 6, fill: '#a89aff', stroke: '#1a1a26', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-xs text-text-muted mt-2 text-center">
          Current month uses live price. Past months use saved snapshots — click "Save Snapshot" at month end to record.
        </p>
      </div>

      {/* ── Holdings table ───────────────────────────────────────────────────── */}
      <div className="card">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-5">Holdings</h2>

        {quotesLoading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-text-muted text-xs">Fetching live prices…</p>
          </div>
        ) : quotes.length === 0 ? (
          <EmptyState icon="📈" title="No holdings yet"
            description="Add your first stock or ETF to start tracking your portfolio."
            action={<button className="btn-primary" onClick={() => setShowForm(true)}>+ Add Holding</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Ticker','Name','Shares','Avg Cost','Current Price','Market Value','P&L','Day Chg',''].map(h => (
                    <th key={h} className={`py-3 px-2 text-text-muted font-medium uppercase text-xs tracking-wider
                      ${['Market Value','P&L','Day Chg',''].includes(h) ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quotes.map((q) => {
                  const pnlPos = (q.unrealizedPnL ?? 0) >= 0;
                  const dayPos = (q.dayChangePct  ?? 0) >= 0;
                  return (
                    <tr key={q.id} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3 px-2 font-mono font-semibold text-accent-light">{q.ticker}</td>
                      <td className="py-3 px-2 text-text-secondary max-w-[140px] truncate">{q.shortName || q.name}</td>
                      <td className="py-3 px-2 font-mono text-text-primary">{q.shares}</td>
                      <td className="py-3 px-2 font-mono text-text-secondary">{formatCurrency(q.avgCost)}</td>
                      <td className="py-3 px-2 font-mono text-text-primary">
                        {q.currentPrice != null
                          ? formatCurrency(q.currentPrice)
                          : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="py-3 px-2 font-mono text-right text-text-primary">
                        {formatCurrency(q.marketValue ?? q.costBasis)}
                      </td>
                      <td className="py-3 px-2 font-mono text-right">
                        {q.unrealizedPnL != null ? (
                          <div className={pnlPos ? 'text-green' : 'text-red'}>
                            <div>{pnlPos ? '+' : ''}{formatCurrency(q.unrealizedPnL)}</div>
                            <div className="text-xs opacity-80">{formatPercent(q.unrealizedPnLPct)}</div>
                          </div>
                        ) : <span className="text-text-muted">—</span>}
                      </td>
                      <td className={`py-3 px-2 font-mono text-right text-xs ${dayPos ? 'text-green' : 'text-red'}`}>
                        {q.dayChangePct != null ? formatPercent(q.dayChangePct) : '—'}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(investments.find(i => i.id === q.id))}
                            className="text-text-muted hover:text-accent text-xs px-2 py-1 rounded-lg hover:bg-accent/10 transition-colors">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(q.id)} disabled={deletingId === q.id}
                            className="text-text-muted hover:text-red text-xs px-2 py-1 rounded-lg hover:bg-red/10 transition-colors">
                            {deletingId === q.id ? '…' : 'Remove'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td colSpan={5} className="py-3 px-2 text-text-secondary text-xs uppercase tracking-wider font-medium">Total</td>
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

      {/* ── Allocation bar ───────────────────────────────────────────────────── */}
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

// ── Allocation bar component ──────────────────────────────────────────────────
function AllocationBar({ quotes, total }) {
  const sorted = [...quotes].sort((a, b) => (b.marketValue ?? b.costBasis) - (a.marketValue ?? a.costBasis));
  return (
    <div>
      <div className="flex h-5 rounded-full overflow-hidden gap-px mb-4">
        {sorted.map((q, i) => {
          const val = q.marketValue ?? q.costBasis;
          const pct = total > 0 ? (val / total) * 100 : 0;
          return (
            <div key={q.id}
              style={{ width: `${pct}%`, backgroundColor: TICKER_COLORS[i % TICKER_COLORS.length] }}
              title={`${q.ticker}: ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4">
        {sorted.map((q, i) => {
          const val = q.marketValue ?? q.costBasis;
          const pct = total > 0 ? (val / total) * 100 : 0;
          return (
            <div key={q.id} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: TICKER_COLORS[i % TICKER_COLORS.length] }} />
              <span className="text-xs text-text-secondary font-mono">{q.ticker}</span>
              <span className="text-xs text-text-muted">{pct.toFixed(1)}%</span>
              <span className="text-xs text-text-muted">{formatCurrency(val)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
