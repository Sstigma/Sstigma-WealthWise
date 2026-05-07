import { create } from 'zustand';
import api from '../services/api';

const useInvestmentStore = create((set) => ({
  investments: [],
  quotes: [],
  netWorth: null,
  networthHistory: [],
  loading: false,
  quotesLoading: false,
  quotesError: null,
  error: null,

  fetchInvestments: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/investments');
      set({ investments: res.data.data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchLiveQuotes: async () => {
    set({ quotesLoading: true, quotesError: null });
    try {
      const res = await api.get('/investments/quotes');
      set({ quotes: res.data.data, quotesLoading: false, quotesError: null });
    } catch (err) {
      set({ quotesLoading: false, quotesError: err.message });
      console.error('Failed to fetch quotes:', err.message);
    }
  },

  addInvestment: async (data) => {
    const res = await api.post('/investments', data);
    set((state) => ({ investments: [res.data.data, ...state.investments] }));
    return res.data.data;
  },

  updateInvestment: async (id, data) => {
    const res = await api.put(`/investments/${id}`, data);
    set((state) => ({
      investments: state.investments.map((i) => (i.id === id ? res.data.data : i)),
    }));
    return res.data.data;
  },

  deleteInvestment: async (id) => {
    await api.delete(`/investments/${id}`);
    set((state) => ({ investments: state.investments.filter((i) => i.id !== id) }));
  },

  fetchNetWorth: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/networth');
      set({ netWorth: res.data.data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchNetWorthHistory: async () => {
    try {
      const res = await api.get('/networth/history');
      set({ networthHistory: res.data.data });
    } catch (err) {
      console.error('Failed to fetch net worth history', err.message);
    }
  },

  saveSnapshot: async ({ cash, investmentsValue, month }) => {
    const res = await api.post('/networth/snapshot', { cash, investmentsValue, month });
    return res.data.data;
  },
}));

export default useInvestmentStore;
