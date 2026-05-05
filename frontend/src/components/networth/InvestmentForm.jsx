import { useState } from 'react';
import Modal from '../shared/Modal';
import useInvestmentStore from '../../store/investmentStore';

export default function InvestmentForm({ investment, onClose }) {
  const { addInvestment, updateInvestment } = useInvestmentStore();
  const isEdit = Boolean(investment);

  const [form, setForm] = useState({
    ticker: investment?.ticker || '',
    name: investment?.name || '',
    shares: investment?.shares ?? '',
    avgCost: investment?.avgCost ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.ticker) { setError('Ticker symbol is required.'); return; }
    if (Number(form.shares) <= 0) { setError('Shares must be positive.'); return; }
    if (Number(form.avgCost) <= 0) { setError('Average cost must be positive.'); return; }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateInvestment(investment.id, form);
      } else {
        await addInvestment(form);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Holding' : 'Add Holding'} onClose={onClose}>
      {error && (
        <div className="mb-4 px-4 py-3 bg-red/10 border border-red/30 rounded-xl text-red text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Ticker Symbol</label>
          <input
            type="text"
            className="input font-mono uppercase"
            placeholder="e.g. AAPL, TSLA, SPY"
            value={form.ticker}
            onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))}
            required
            disabled={isEdit}
          />
          <p className="text-xs text-text-muted mt-1">Must be a valid Yahoo Finance ticker</p>
        </div>
        <div>
          <label className="label">Display Name (optional)</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Apple Inc."
            value={form.name}
            onChange={set('name')}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Shares Held</label>
            <input
              type="number"
              className="input font-mono"
              placeholder="0.00"
              value={form.shares}
              onChange={set('shares')}
              step="0.0001"
              min="0.0001"
              required
            />
          </div>
          <div>
            <label className="label">Avg. Cost / Share</label>
            <input
              type="number"
              className="input font-mono"
              placeholder="0.00"
              value={form.avgCost}
              onChange={set('avgCost')}
              step="0.01"
              min="0.01"
              required
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Update' : 'Add Holding'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
