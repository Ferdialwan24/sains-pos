import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';

const navigationByRole = {
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard' },
    { label: 'Users', path: '/admin/users' },
    { label: 'Tables', path: '/admin/tables' },
    { label: 'Products', path: '/admin/products' },
    { label: 'Inventory', path: '/admin/inventory' },
    { label: 'Cashier Tables', path: '/cashier/tables' },
    { label: 'Transactions', path: '/cashier/transactions' }
  ],
  cashier: [
    { label: 'Table Billing', path: '/cashier/tables' },
    { label: 'Point of Sale', path: '/cashier/pos' },
    { label: 'Transactions', path: '/cashier/transactions' }
  ]
};

export function AppShell() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { showToast } = useToast();
  const navigation = navigationByRole[user?.role] ?? [];

  const handleLogout = () => {
    logout();
    showToast({
      title: 'Logged out',
      message: 'Your session has been closed.',
      type: 'info'
    });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <p className="brand-kicker">Sains POS</p>
          <h1>Operations</h1>
        </div>
        <div className="user-summary">
          <strong>{user?.fullName}</strong>
          <span>{user?.role}</span>
        </div>
        <nav className="nav-list">
          {navigation.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                className={`nav-link${isActive ? ' nav-link-active' : ''}`}
                to={item.path}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button className="secondary-button logout-button" onClick={handleLogout} type="button">
          Logout
        </button>
      </aside>
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}
