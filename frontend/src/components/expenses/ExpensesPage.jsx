import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import useExpenseStore from '../../store/expenseStore';
import ExpenseForm from './ExpenseForm';
import EmptyState from '../shared/EmptyState';
import {
  formatCurrency, formatDate, formatMonth,
  EXPENSE_CATEGORIES, CATEGORY_COLORS, currentYearMonth,
} from '../../utils/formatters';

export default function ExpensesPage() {
  const { expenses, summary, fetchExpenses, fetchSummary, deleteExpense, loading } = useExpenseStore();
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth());
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => { fetchSummary(); }, []);
  useEffect(() => { fetchExpenses(selectedMonth); }, [selectedMonth]);

  const thisMonthSummary = summary.find((s) => s.month === selectedMonth);
  const total = thisMonthSummary?.total ?? 0;

  const categoryData = thisMonthSummary
    ? Object.entries(thisMonthSummary.byCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    : [];

  const filtered =
    categoryFilter === 'All'
      ? expenses
      : expenses.filter((e) => e.category === categoryFilter);

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    setDeletingId(id);
    try { await deleteExpense(id); } finally { setDeletingId(null); }
  };

  const openEdit = (expense) => { setEditTarget(expense); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditTarget(null); };

  // Build month options from summary + current month
  const monthOptions = Array.from(
    new Set([...summary.map((s) => s.month), currentYearMonth()])
  ).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-text-primary">Expenses</h1>
          <p className="text-text-secondary text-sm mt-1">Track and categorise your spending</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add Expense</button>
      </div>

      {/* Month selector + total */}
      <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <label className="label">Viewing month</label>
          <select
            className="input w-auto pr-8"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted uppercase tracking-widest">Total Spent</p>
          <p className="font-display text-3xl text-red">{formatCurrency(total)}</p>
        </div>
      </div>

      {/* Category bar chart */}
      {categoryData.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-4">
            Spending by Category
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" tick={{ fill: '#9090b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#9090b8', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #252535', borderRadius: 12 }}
                formatter={(v) => [formatCurrency(v)]}
                cursor={{ fill: 'rgba(124,106,255,0.08)' }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#9090b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter + Table */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {['All', ...EXPENSE_CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 ${
                categoryFilter === cat
                  ? 'bg-accent text-white'
                  : 'bg-surface text-text-secondary hover:text-text-primary border border-border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🧾"
            title="No expenses found"
            description={categoryFilter === 'All' ? 'Add your first expense for this month.' : `No "${categoryFilter}" expenses this month.`}
            action={
              categoryFilter === 'All' && (
                <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add Expense</button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-4 text-text-muted font-medium uppercase text-xs tracking-wider">Date</th>
                  <th className="text-left py-3 pr-4 text-text-muted font-medium uppercase text-xs tracking-wider">Detail</th>
                  <th className="text-left py-3 pr-4 text-text-muted font-medium uppercase text-xs tracking-wider">Category</th>
                  <th className="text-right py-3 pr-4 text-text-muted font-medium uppercase text-xs tracking-wider">Amount</th>
                  <th className="text-right py-3 text-text-muted font-medium uppercase text-xs tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 pr-4 text-text-secondary font-mono text-xs">{formatDate(e.date)}</td>
                    <td className="py-3 pr-4 text-text-primary">{e.detail}</td>
                    <td className="py-3 pr-4">
                      <span
                        className="badge"
                        style={{
                          backgroundColor: (CATEGORY_COLORS[e.category] || '#9090b8') + '22',
                          color: CATEGORY_COLORS[e.category] || '#9090b8',
                          border: `1px solid ${(CATEGORY_COLORS[e.category] || '#9090b8')}44`,
                        }}
                      >
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-red">{formatCurrency(e.amount)}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(e)}
                          className="text-text-muted hover:text-accent transition-colors text-xs px-2 py-1 rounded-lg hover:bg-accent/10"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          disabled={deletingId === e.id}
                          className="text-text-muted hover:text-red transition-colors text-xs px-2 py-1 rounded-lg hover:bg-red/10"
                        >
                          {deletingId === e.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monthly summary strip */}
      {summary.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-4">Monthly Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {summary.slice(-6).map((s) => (
              <button
                key={s.month}
                onClick={() => setSelectedMonth(s.month)}
                className={`p-3 rounded-xl border text-left transition-all duration-150 ${
                  s.month === selectedMonth
                    ? 'border-accent/50 bg-accent/10'
                    : 'border-border hover:border-border/80 bg-surface'
                }`}
              >
                <p className="text-xs text-text-muted">{formatMonth(s.month)}</p>
                <p className="text-sm font-mono text-text-primary mt-1">{formatCurrency(s.total)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && <ExpenseForm expense={editTarget} onClose={closeForm} />}
    </div>
  );
}
