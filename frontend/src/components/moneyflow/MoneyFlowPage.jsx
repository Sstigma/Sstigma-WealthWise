import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, Legend, AreaChart, Area,
} from 'recharts';
import useExpenseStore from '../../store/expenseStore';
import TransactionForm from './TransactionForm';
import AccountForm from './AccountForm';
import EmptyState from '../shared/EmptyState';
import {
  formatCurrency, formatDate, formatMonth,
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, CATEGORY_COLORS,
  ACCOUNT_TYPES, currentYearMonth, buildMonthlyChartData,
} from '../../utils/formatters';
 
const ACCOUNT_TYPE_ICONS = { bank: '🏦', savings: '🏧', cash: '💵', credit: '💳' };
 
export default function MoneyFlowPage() {
  const {
    transactions, summary, accounts, loading,
    fetchTransactions, fetchSummary, fetchAccounts,
    deleteTransaction, deleteAccount,
  } = useExpenseStore();
 
  const [selectedMonth, setSelectedMonth]   = useState(currentYearMonth());
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [typeFilter, setTypeFilter]         = useState('all'); // all | income | expense
  const [showTxForm, setShowTxForm]         = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editTx, setEditTx]                 = useState(null);
  const [editAccount, setEditAccount]       = useState(null);
  const [deletingId, setDeletingId]         = useState(null);
  const [activeTab, setActiveTab]           = useState('transactions'); // transactions | accounts
 
  useEffect(() => {
    fetchAccounts();
    fetchSummary();
  }, []);
 
  useEffect(() => {
    fetchTransactions(
      selectedMonth,
      selectedAccount !== 'all' ? selectedAccount : undefined
    );
  }, [selectedMonth, selectedAccount]);
 
  // ── Derived data ────────────────────────────────────────────────────────────
  const currentSummary = summary.find(s => s.month === selectedMonth);
  const totalIncome    = currentSummary?.totalIncome   ?? 0;
  const totalExpenses  = currentSummary?.totalExpenses ?? 0;
  const netPL          = currentSummary?.netPL         ?? 0;
 
  // Per-account P&L for the selected month
  const accountPL = currentSummary?.byAccount ?? {};
 
  // Cash Net Worth = sum of each account's opening balance + all-time income − expenses
  // Opening balances come from accounts list; transaction delta from full summary
  const cashNetWorth = useMemo(() => {
    // Sum all opening balances across accounts
    const totalOpening = accounts.reduce((s, a) => s + (a.openingBalance ?? 0), 0);
    // Add cumulative income minus expenses from all recorded months
    const totalTxDelta = summary.reduce((s, m) => s + m.netPL, 0);
    return totalOpening + totalTxDelta;
  }, [accounts, summary]);
 
  // Filtered transactions list
  const filtered = transactions.filter(t =>
    typeFilter === 'all' ? true : t.type === typeFilter
  );
 
  // Trend chart: last 6 months income vs expenses
  const trendData = buildMonthlyChartData(summary, 6);
 
  // Month options
  const monthOptions = Array.from(
    new Set([...summary.map(s => s.month), currentYearMonth()])
  ).sort((a, b) => b.localeCompare(a));
 
  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleDeleteTx = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    setDeletingId(id);
    try { await deleteTransaction(id); } finally { setDeletingId(null); }
  };
 
  const handleDeleteAccount = async (id) => {
    if (!confirm('Delete this account? Transactions linked to it will become unassigned.')) return;
    setDeletingId(id);
    try { await deleteAccount(id); } finally { setDeletingId(null); }
  };
 
  const openEditTx = (tx) => { setEditTx(tx); setShowTxForm(true); };
  const closeTxForm = () => { setShowTxForm(false); setEditTx(null); };
  const openEditAccount = (acc) => { setEditAccount(acc); setShowAccountForm(true); };
  const closeAccountForm = () => { setShowAccountForm(false); setEditAccount(null); };
 
  const accountName = (id) => accounts.find(a => a.id === id)?.name ?? '—';
 
  return (
    <div className="space-y-6">
 
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl text-text-primary">Money Flow</h1>
          <p className="text-text-secondary text-sm mt-1">Track income, expenses and account balances</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowAccountForm(true); setEditAccount(null); }} className="btn-ghost text-sm">
            + Account
          </button>
          <button onClick={() => { setShowTxForm(true); setEditTx(null); }} className="btn-primary">
            + Transaction
          </button>
        </div>
      </div>
 
      {/* ── Overall stat cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label={`Income — ${formatMonth(selectedMonth)}`}
          value={formatCurrency(totalIncome)}
          positive
        />
        <StatCard
          label={`Expenses — ${formatMonth(selectedMonth)}`}
          value={formatCurrency(totalExpenses)}
          negative
        />
        <StatCard
          label={`Net P&L — ${formatMonth(selectedMonth)}`}
          value={formatCurrency(netPL)}
          positive={netPL >= 0}
          negative={netPL < 0}
        />
        <StatCard
          label="Cash Net Worth"
          value={formatCurrency(cashNetWorth)}
          accent
          positive={cashNetWorth >= 0}
          negative={cashNetWorth < 0}
          sub="opening balance + transactions"
        />
      </div>
 
      {/* ── Per-Account P&L cards ───────────────────────────────────────────── */}
      {accounts.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-3">
            P&amp;L by Account — {formatMonth(selectedMonth)}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {accounts.map(acc => {
              const pl      = accountPL[acc.name] ?? { income: 0, expenses: 0, netPL: 0 };
              const opening = acc.openingBalance ?? 0;
              const balance = opening + pl.income - pl.expenses; // true running balance
              const icon    = ACCOUNT_TYPE_ICONS[acc.type] || '🏦';
              return (
                <div key={acc.id} className="card hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{icon}</span>
                    <p className="text-sm font-medium text-text-primary truncate">{acc.name}</p>
                  </div>
                  <div className="space-y-1 text-xs">
                    {opening !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-text-muted">Opening</span>
                        <span className="text-text-secondary font-mono">{formatCurrency(opening)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-text-muted">Income</span>
                      <span className="text-green font-mono">{formatCurrency(pl.income)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Expenses</span>
                      <span className="text-red font-mono">{formatCurrency(pl.expenses)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1 mt-1">
                      <span className="text-text-secondary font-medium">Balance</span>
                      <span className={`font-mono font-semibold ${balance >= 0 ? 'text-green' : 'text-red'}`}>
                        {formatCurrency(balance)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
 
      {/* ── Trend chart ─────────────────────────────────────────────────────── */}
      <div className="card">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-4">
            Income vs Expenses — Last 6 Months
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trendData} barGap={4}>
              <XAxis dataKey="month" tick={{ fill: '#9090b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9090b8', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(1)}k` : `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #252535', borderRadius: 12 }}
                formatter={(v, name) => [formatCurrency(v), name]}
              />
              <Legend formatter={v => <span style={{ color: '#9090b8', fontSize: 11 }}>{v}</span>} />
              <Bar dataKey="Income"   fill="#34d399" radius={[4,4,0,0]} maxBarSize={32} />
              <Bar dataKey="Expenses" fill="#f87171" radius={[4,4,0,0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
 
      {/* ── Tabs: Transactions | Accounts ───────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-surface rounded-xl w-fit">
        {['transactions', 'accounts'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              activeTab === tab ? 'bg-card text-text-primary shadow-sm border border-border' : 'text-text-secondary hover:text-text-primary'
            }`}>
            {tab === 'transactions' ? `Transactions` : `Accounts (${accounts.length})`}
          </button>
        ))}
      </div>
 
      {/* ── TRANSACTIONS TAB ────────────────────────────────────────────────── */}
      {activeTab === 'transactions' && (
        <div className="card">
          {/* Filters bar */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            {/* Month */}
            <select className="input w-auto text-sm"
              value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              {monthOptions.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
            </select>
 
            {/* Account filter */}
            <select className="input w-auto text-sm"
              value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
              <option value="all">All Accounts</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
 
            {/* Type filter pills */}
            <div className="flex gap-1">
              {[['all','All'],['income','Income'],['expense','Expenses']].map(([val, label]) => (
                <button key={val} onClick={() => setTypeFilter(val)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    typeFilter === val
                      ? val === 'income'  ? 'bg-green/20 text-green border border-green/30'
                      : val === 'expense' ? 'bg-red/20 text-red border border-red/30'
                      : 'bg-accent/20 text-accent border border-accent/30'
                      : 'bg-surface text-text-secondary border border-border hover:text-text-primary'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
 
            <span className="text-xs text-text-muted ml-auto">{filtered.length} transactions</span>
          </div>
 
          {/* Table */}
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="💸"
              title="No transactions"
              description="Add your first income or expense for this period."
              action={<button className="btn-primary" onClick={() => setShowTxForm(true)}>+ Add Transaction</button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Date','Description','Category','Account','Type','Amount',''].map(h => (
                      <th key={h} className={`py-3 px-2 text-text-muted font-medium uppercase text-xs tracking-wider ${h === 'Amount' || h === '' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(tx => (
                    <tr key={tx.id} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3 px-2 text-text-secondary font-mono text-xs whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="py-3 px-2 text-text-primary max-w-[160px] truncate">{tx.detail}</td>
                      <td className="py-3 px-2">
                        {tx.category ? (
                          <span className="badge text-xs"
                            style={{
                              backgroundColor: (CATEGORY_COLORS[tx.category] || '#9090b8') + '22',
                              color: CATEGORY_COLORS[tx.category] || '#9090b8',
                              border: `1px solid ${(CATEGORY_COLORS[tx.category] || '#9090b8')}44`,
                            }}>
                            {tx.category}
                          </span>
                        ) : <span className="text-text-muted text-xs">—</span>}
                      </td>
                      <td className="py-3 px-2 text-text-secondary text-xs">{tx.accountId ? accountName(tx.accountId) : '—'}</td>
                      <td className="py-3 px-2">
                        <span className={`badge text-xs ${tx.type === 'income' ? 'bg-green/10 text-green border border-green/20' : 'bg-red/10 text-red border border-red/20'}`}>
                          {tx.type === 'income' ? '+ Income' : '− Expense'}
                        </span>
                      </td>
                      <td className={`py-3 px-2 text-right font-mono font-medium ${tx.type === 'income' ? 'text-green' : 'text-red'}`}>
                        {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditTx(tx)}
                            className="text-text-muted hover:text-accent text-xs px-2 py-1 rounded-lg hover:bg-accent/10 transition-colors">
                            Edit
                          </button>
                          <button onClick={() => handleDeleteTx(tx.id)} disabled={deletingId === tx.id}
                            className="text-text-muted hover:text-red text-xs px-2 py-1 rounded-lg hover:bg-red/10 transition-colors">
                            {deletingId === tx.id ? '…' : 'Del'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Footer totals */}
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td colSpan={4} className="py-3 px-2 text-xs text-text-muted uppercase tracking-wider">
                      {formatMonth(selectedMonth)} · {selectedAccount !== 'all' ? accountName(selectedAccount) : 'All Accounts'}
                    </td>
                    <td className="py-3 px-2" />
                    <td className="py-3 px-2 text-right">
                      <div className="space-y-0.5">
                        <div className="flex justify-end gap-3 text-xs">
                          <span className="text-text-muted">Income</span>
                          <span className="text-green font-mono">{formatCurrency(totalIncome)}</span>
                        </div>
                        <div className="flex justify-end gap-3 text-xs">
                          <span className="text-text-muted">Expenses</span>
                          <span className="text-red font-mono">{formatCurrency(totalExpenses)}</span>
                        </div>
                        <div className="flex justify-end gap-3 text-xs font-semibold border-t border-border pt-1">
                          <span className="text-text-secondary">Net</span>
                          <span className={`font-mono ${netPL >= 0 ? 'text-green' : 'text-red'}`}>{formatCurrency(netPL)}</span>
                        </div>
                      </div>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
 
      {/* ── ACCOUNTS TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'accounts' && (
        <div className="card">
          {accounts.length === 0 ? (
            <EmptyState
              icon="🏦"
              title="No accounts yet"
              description="Add your bank accounts to track P&L per account."
              action={<button className="btn-primary" onClick={() => setShowAccountForm(true)}>+ Add Account</button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Account','Type','Opening Balance','Income (this month)','Expenses (this month)','Current Balance',''].map(h => (
                      <th key={h} className={`py-3 px-3 text-text-muted font-medium uppercase text-xs tracking-wider ${h === '' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {accounts.map(acc => {
                    const pl        = accountPL[acc.name] ?? { income: 0, expenses: 0, netPL: 0 };
                    const opening   = acc.openingBalance ?? 0;
                    const balance   = opening + pl.income - pl.expenses;
                    const icon      = ACCOUNT_TYPE_ICONS[acc.type] || '🏦';
                    const typeLabel = ACCOUNT_TYPES.find(t => t.value === acc.type)?.label ?? acc.type;
                    return (
                      <tr key={acc.id} className="hover:bg-surface/50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{icon}</span>
                            <span className="text-text-primary font-medium">{acc.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-text-secondary text-xs">{typeLabel}</td>
                        <td className="py-3 px-3 font-mono text-text-secondary">{formatCurrency(opening)}</td>
                        <td className="py-3 px-3 font-mono text-green">{formatCurrency(pl.income)}</td>
                        <td className="py-3 px-3 font-mono text-red">{formatCurrency(pl.expenses)}</td>
                        <td className={`py-3 px-3 font-mono font-semibold ${balance >= 0 ? 'text-green' : 'text-red'}`}>
                          {formatCurrency(balance)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEditAccount(acc)}
                              className="text-text-muted hover:text-accent text-xs px-2 py-1 rounded-lg hover:bg-accent/10 transition-colors">
                              Edit
                            </button>
                            <button onClick={() => handleDeleteAccount(acc.id)} disabled={deletingId === acc.id}
                              className="text-text-muted hover:text-red text-xs px-2 py-1 rounded-lg hover:bg-red/10 transition-colors">
                              {deletingId === acc.id ? '…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
 
      {/* ── Monthly summary strip ─────────────────────────────────────────── */}
      {summary.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-4">Monthly Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {summary.slice(-6).map(s => (
              <button key={s.month} onClick={() => setSelectedMonth(s.month)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  s.month === selectedMonth ? 'border-accent/50 bg-accent/10' : 'border-border bg-surface hover:border-border/80'
                }`}>
                <p className="text-xs text-text-muted mb-1">{formatMonth(s.month)}</p>
                <p className="text-xs text-green font-mono">+{formatCurrency(s.totalIncome)}</p>
                <p className="text-xs text-red font-mono">−{formatCurrency(s.totalExpenses)}</p>
                <p className={`text-xs font-mono font-semibold mt-1 ${s.netPL >= 0 ? 'text-green' : 'text-red'}`}>
                  {formatCurrency(s.netPL)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
 
      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showTxForm      && <TransactionForm transaction={editTx}      onClose={closeTxForm} />}
      {showAccountForm && <AccountForm     account={editAccount}     onClose={closeAccountForm} />}
    </div>
  );
}
 
// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, accent, positive, negative, sub }) {
  return (
    <div className={`stat-card ${accent ? 'border-accent/30 bg-accent/5' : ''}`}>
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${positive ? 'text-green' : negative ? 'text-red' : ''}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-text-muted">{sub}</span>}
    </div>
  );
}