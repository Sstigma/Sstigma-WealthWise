import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const NAV = [
  { to: '/dashboard',  label: 'Dashboard',   icon: '⬡' },
  { to: '/money-flow', label: 'Money Flow',   icon: '⇄' },
  { to: '/networth',   label: 'Net Worth',    icon: '◈' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate('/auth'); };

  return (
    <div className="min-h-screen bg-bg flex">
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-border bg-surface">
        <div className="px-6 py-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center text-sm">💰</div>
            <span className="font-display text-lg text-text-primary">WealthWise</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive ? 'bg-accent/15 text-accent border border-accent/20'
                         : 'text-text-secondary hover:text-text-primary hover:bg-border/60'}`}>
              <span className="text-base">{icon}</span>{label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-border">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-text-muted truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-red hover:bg-red/10 transition-all duration-150">
            <span>⎋</span>Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8 page-enter"><Outlet /></div>
      </main>
    </div>
  );
}
