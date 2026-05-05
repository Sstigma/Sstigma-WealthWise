import { create } from 'zustand';
import api from '../services/api';

const useExpenseStore = create((set, get) => ({
  expenses: [],
  summary: [],
  loading: false,
  error: null,

  fetchExpenses: async (month) => {
    set({ loading: true, error: null });
    try {
      const params = month ? { month } : {};
      const res = await api.get('/expenses', { params });
      set({ expenses: res.data.data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchSummary: async () => {
    try {
      const res = await api.get('/expenses/summary');
      set({ summary: res.data.data });
    } catch (err) {
      console.error('Failed to fetch summary', err.message);
    }
  },

  addExpense: async (data) => {
    const res = await api.post('/expenses', data);
    set((state) => ({ expenses: [res.data.data, ...state.expenses] }));
    await get().fetchSummary();
    return res.data.data;
  },

  updateExpense: async (id, data) => {
    const res = await api.put(`/expenses/${id}`, data);
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === id ? res.data.data : e)),
    }));
    await get().fetchSummary();
    return res.data.data;
  },

  deleteExpense: async (id) => {
    await api.delete(`/expenses/${id}`);
    set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }));
    await get().fetchSummary();
  },
}));

export default useExpenseStore;
