import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import AuthPage from './components/shared/AuthPage';
import Layout from './components/shared/Layout';
import DashboardPage from './components/dashboard/DashboardPage';
import MoneyFlowPage from './components/moneyflow/MoneyFlowPage';
import NetWorthPage from './components/networth/NetWorthPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) return <FullScreenLoader />;
  return user ? children : <Navigate to="/auth" replace />;
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary text-sm">Loading WealthWise…</p>
      </div>
    </div>
  );
}

export default function App() {
  const init = useAuthStore(s => s.init);
  useEffect(() => { const unsub = init(); return unsub; }, [init]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"   element={<DashboardPage />} />
          <Route path="money-flow"  element={<MoneyFlowPage />} />
          <Route path="networth"    element={<NetWorthPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
