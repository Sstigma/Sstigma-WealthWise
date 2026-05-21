import { useState } from 'react';
import Modal from '../shared/Modal';
import useExpenseStore from '../../store/expenseStore';
import { ACCOUNT_TYPES } from '../../utils/formatters';
 
export default function AccountForm({ account, onClose }) {
  const { addAccount, updateAccount } = useExpenseStore();
  const isEdit = Boolean(account);
 
  const [form, setForm] = useState({
    name:           account?.name           || '',
    type:           account?.type           || 'bank',
    openingBalance: account?.openingBalance ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
 
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Account name is required.'); return; }
    const balance = parseFloat(form.openingBalance);
    if (form.openingBalance !== '' && isNaN(balance)) {
      setError('Opening balance must be a number.'); return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name:           form.name.trim(),
        type:           form.type,
        openingBalance: form.openingBalance === '' ? 0 : balance,
      };
      if (isEdit) await updateAccount(account.id, payload);
      else        await addAccount(payload);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally { setSubmitting(false); }
  };
 
  return (
    <Modal title={isEdit ? 'Edit Account' : 'Add Account'} onClose={onClose}>
      {error && (
        <div className="mb-4 px-4 py-3 bg-red/10 border border-red/30 rounded-xl text-red text-sm">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Account Name</label>
          <input
            type="text" className="input"
            placeholder="e.g. DBS Everyday, OCBC 360, Cash Wallet"
            value={form.name} onChange={set('name')} required
          />
        </div>
        <div>
          <label className="label">Account Type</label>
          <select className="input" value={form.type} onChange={set('type')}>
            {ACCOUNT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">
            {isEdit ? 'Opening Balance (SGD)' : 'Current Balance (SGD)'}
          </label>
          <input
            type="number" className="input font-mono"
            placeholder="0.00"
            value={form.openingBalance}
            onChange={set('openingBalance')}
            step="0.01"
          />
          <p className="text-xs text-text-muted mt-1.5">
            {isEdit
              ? 'The starting balance when you first set up this account. Transactions recorded in the app are added on top.'
              : 'Enter the current balance of this account today. Future transactions you log will be added on top of this.'}
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Update' : 'Add Account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}