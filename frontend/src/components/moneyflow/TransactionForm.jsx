import { useState } from 'react';
import Modal from '../shared/Modal';
import useExpenseStore from '../../store/expenseStore';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../utils/formatters';

const today = () => new Date().toISOString().slice(0, 10);

export default function TransactionForm({ transaction, defaultType = 'expense', onClose }) {
  const { addTransaction, updateTransaction, accounts } = useExpenseStore();
  const isEdit = Boolean(transaction);

  const [form, setForm] = useState({
    date:      transaction ? transaction.date.slice(0, 10) : today(),
    detail:    transaction?.detail || '',
    type:      transaction?.type || defaultType,
    category:  transaction?.category || '',
    amount:    transaction?.amount ?? '',
    accountId: transaction?.accountId || accounts[0]?.id || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const set    = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const setVal = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) {
      setError('Amount must be a positive number.');
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit) await updateTransaction(transaction.id, form);
      else        await addTransaction(form);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally { setSubmitting(false); }
  };

  return (
    <Modal title={isEdit ? 'Edit Transaction' : 'Add Transaction'} onClose={onClose}>
      {error && <div className="mb-4 px-4 py-3 bg-red/10 border border-red/30 rounded-xl text-red text-sm">{error}</div>}

      {/* Income / Expense toggle */}
      {!isEdit && (
        <div className="flex gap-2 mb-5 p-1 bg-surface rounded-xl">
          <button type="button"
            onClick={() => setVal('type', 'expense')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${form.type === 'expense' ? 'bg-red/20 text-red border border-red/30' : 'text-text-secondary hover:text-text-primary'}`}>
            − Expense
          </button>
          <button type="button"
            onClick={() => setVal('type', 'income')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${form.type === 'income' ? 'bg-green/20 text-green border border-green/30' : 'text-text-secondary hover:text-text-primary'}`}>
            + Income
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={form.date} onChange={set('date')} required />
        </div>
        <div>
          <label className="label">Description</label>
          <input type="text" className="input"
            placeholder={form.type === 'income' ? 'e.g. Monthly salary, Freelance project' : 'e.g. Grab lunch, Netflix'}
            value={form.detail} onChange={set('detail')} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={set('category')}>
              <option value="">— Select —</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Account</label>
            <select className="input" value={form.accountId} onChange={set('accountId')}>
              <option value="">— No Account —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Amount (SGD)</label>
          <input type="number" className="input font-mono" placeholder="0.00"
            value={form.amount} onChange={set('amount')} step="0.01" min="0.01" required />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Update' : form.type === 'income' ? '+ Add Income' : '− Add Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
