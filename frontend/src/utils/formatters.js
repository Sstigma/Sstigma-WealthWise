export function formatCurrency(value, currency = 'SGD') {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-SG', {
    style: 'currency', currency,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value, decimals = 2) {
  if (value == null || isNaN(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-SG', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatMonth(yyyyMm) {
  if (!yyyyMm) return '';
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('en-SG', { year: 'numeric', month: 'short' });
}

export function currentYearMonth() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

export const EXPENSE_CATEGORIES = [
  'Housing', 'Food & Dining', 'Transportation', 'Health',
  'Entertainment', 'Shopping', 'Utilities', 'Education',
  'Travel', 'Subscriptions', 'Other',
];

export const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Dividends', 'Interest',
  'Rental', 'Business', 'Gift', 'Other Income',
];

export const ACCOUNT_TYPES = [
  { value: 'bank',    label: 'Bank Account' },
  { value: 'savings', label: 'Savings Account' },
  { value: 'cash',    label: 'Cash' },
  { value: 'credit',  label: 'Credit Card' },
];

export const CATEGORY_COLORS = {
  Housing: '#7c6aff', 'Food & Dining': '#f5c542', Transportation: '#34d399',
  Health: '#f87171', Entertainment: '#60a5fa', Shopping: '#fb923c',
  Utilities: '#a78bfa', Education: '#4ade80', Travel: '#38bdf8',
  Subscriptions: '#f472b6', Other: '#9090b8',
  Salary: '#34d399', Freelance: '#4ade80', Dividends: '#f5c542',
  Interest: '#60a5fa', Rental: '#a78bfa', Business: '#38bdf8',
  Gift: '#f472b6', 'Other Income': '#9090b8',
};

/**
 * Returns an array of the last N months as YYYY-MM strings,
 * always ending with the current month, padded with zeros where no data exists.
 *
 * @param {Array}  summary   - array of { month, totalIncome, totalExpenses, netPL, ... }
 * @param {number} months    - how many months to show (default 6)
 * @returns {Array} sorted ascending, every month present
 */
export function buildMonthlyChartData(summary, months = 6) {
  // Build a lookup from the real summary
  const lookup = {};
  summary.forEach(s => { lookup[s.month] = s; });

  const result = [];
  const now    = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const s   = lookup[key];
    result.push({
      month:         formatMonth(key),
      rawMonth:      key,
      Income:        s?.totalIncome   ?? 0,
      Expenses:      s?.totalExpenses ?? 0,
      'Net P&L':     s?.netPL         ?? 0,
      totalNetWorth: 0, // filled separately for networth chart
    });
  }

  return result;
}

/**
 * Same idea for net worth history snapshots.
 * Merges saved snapshots into a 6-month window, filling gaps with 0.
 */
export function buildNetworthChartData(history, months = 6) {
  const lookup = {};
  history.forEach(h => { lookup[h.month] = h; });

  const result = [];
  const now    = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const h   = lookup[key];
    result.push({
      month:            formatMonth(key),
      rawMonth:         key,
      'Net Worth':      h?.totalNetWorth    ?? 0,
      Investments:      h?.investmentsValue ?? 0,
      Cash:             h?.cash            ?? 0,
    });
  }

  return result;
}
