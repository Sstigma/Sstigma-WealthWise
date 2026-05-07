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
