import { create } from "zustand";
import api from "../services/api";

// Returns YYYY-MM for a given offset from current month (0 = current, -1 = previous, etc.)
function monthKey(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const useInvestmentStore = create((set, get) => ({
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
      const res = await api.get("/investments");
      set({ investments: res.data.data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchLiveQuotes: async () => {
    set({ quotesLoading: true, quotesError: null });
    try {
      const res = await api.get("/investments/quotes");
      set({ quotes: res.data.data, quotesLoading: false, quotesError: null });
    } catch (err) {
      set({ quotesLoading: false, quotesError: err.message });
      console.error("Failed to fetch quotes:", err.message);
    }
  },

  addInvestment: async (data) => {
    const res = await api.post("/investments", data);
    set((state) => ({ investments: [res.data.data, ...state.investments] }));
    return res.data.data;
  },

  updateInvestment: async (id, data) => {
    const res = await api.put(`/investments/${id}`, data);
    set((state) => ({
      investments: state.investments.map((i) =>
        i.id === id ? res.data.data : i,
      ),
    }));
    return res.data.data;
  },

  deleteInvestment: async (id) => {
    await api.delete(`/investments/${id}`);
    set((state) => ({
      investments: state.investments.filter((i) => i.id !== id),
    }));
  },

  fetchNetWorth: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get("/networth");
      set({ netWorth: res.data.data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchNetWorthHistory: async () => {
    try {
      const res = await api.get("/networth/history");
      set({ networthHistory: res.data.data });
    } catch (err) {
      console.error("Failed to fetch net worth history", err.message);
    }
  },

  saveSnapshot: async ({ cash, investmentsValue, month }) => {
    const res = await api.post("/networth/snapshot", {
      cash,
      investmentsValue,
      month,
    });
    // Refresh history after saving
    const histRes = await api.get("/networth/history");
    set({ networthHistory: histRes.data.data });
    return res.data.data;
  },

  /**
   * Called from the Dashboard after quotes + summary + history are all loaded.
   * Checks the previous month — if no snapshot exists yet, silently saves one.
   * Uses the live portfolio value at time of call (best approximation of previous
   * month-end if visited early in a new month).
   *
   * @param {number} cashByMonth  - map of { 'YYYY-MM': cumulativeCash } built from summary
   */
  autoSnapshotPreviousMonth: async (cashByMonth) => {
    try {
      const prevMonth = monthKey(-1);
      const { networthHistory, quotes } = get();

      // Already have a snapshot for previous month — nothing to do
      const alreadyExists = networthHistory.some((h) => h.month === prevMonth);
      if (alreadyExists) return;

      // No investments at all — no point snapshotting zeros
      if (quotes.length === 0) return;

      const investmentsValue = quotes.reduce(
        (s, q) => s + (q.marketValue ?? q.costBasis),
        0,
      );

      // Only snapshot if portfolio has real value
      if (investmentsValue === 0) return;

      const cash = cashByMonth[prevMonth] ?? 0;

      console.info(`[WealthWise] Auto-saving snapshot for ${prevMonth}`);
      await api.post("/networth/snapshot", {
        cash,
        investmentsValue,
        month: prevMonth,
      });

      // Refresh history so charts update immediately
      const histRes = await api.get("/networth/history");
      set({ networthHistory: histRes.data.data });
    } catch (err) {
      // Silent — never surface auto-snapshot errors to the user
      console.warn("[WealthWise] Auto-snapshot failed silently:", err.message);
    }
  },
}));

export default useInvestmentStore;
