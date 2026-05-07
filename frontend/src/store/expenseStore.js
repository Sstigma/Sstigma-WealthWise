import { create } from 'zustand';
import api from '../services/api';

const useExpenseStore = create((set, get) => ({
  transactions: [],
  summary: [],
  accounts: [],
  loading: false,
  error: null,

  // ── Accounts ────────────────────────────────────────────────────────────────
  fetchAccounts: async () => {
    try {
      const res = await api.get('/expenses/accounts');
      set({ accounts: res.data.data });
    } catch (err) { console.error('fetchAccounts', err.message); }
  },

  addAccount: async (data) => {
    const res = await api.post('/expenses/accounts', data);
    set(s => ({ accounts: [...s.accounts, res.data.data] }));
    return res.data.data;
  },

  updateAccount: async (id, data) => {
    const res = await api.put(`/expenses/accounts/${id}`, data);
    set(s => ({ accounts: s.accounts.map(a => a.id === id ? res.data.data : a) }));
    return res.data.data;
  },

  deleteAccount: async (id) => {
    await api.delete(`/expenses/accounts/${id}`);
    set(s => ({ accounts: s.accounts.filter(a => a.id !== id) }));
  },

  // ── Transactions ─────────────────────────────────────────────────────────────
  fetchTransactions: async (month, accountId) => {
    set({ loading: true, error: null });
    try {
      const params = {};
      if (month)     params.month     = month;
      if (accountId) params.accountId = accountId;
      const res = await api.get('/expenses', { params });
      set({ transactions: res.data.data, loading: false });
    } catch (err) { set({ error: err.message, loading: false }); }
  },

  fetchSummary: async () => {
    try {
      const res = await api.get('/expenses/summary');
      set({ summary: res.data.data });
    } catch (err) { console.error('fetchSummary', err.message); }
  },

  addTransaction: async (data) => {
    const res = await api.post('/expenses', data);
    set(s => ({ transactions: [res.data.data, ...s.transactions] }));
    await get().fetchSummary();
    return res.data.data;
  },

  updateTransaction: async (id, data) => {
    const res = await api.put(`/expenses/${id}`, data);
    set(s => ({ transactions: s.transactions.map(t => t.id === id ? res.data.data : t) }));
    await get().fetchSummary();
    return res.data.data;
  },

  deleteTransaction: async (id) => {
    await api.delete(`/expenses/${id}`);
    set(s => ({ transactions: s.transactions.filter(t => t.id !== id) }));
    await get().fetchSummary();
  },
}));

export default useExpenseStore;
