import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ConfirmDialog } from '../common/ConfirmDialog.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import navLogoImage from '../../assets/nav-logo.png';

const navigationByRole = {
  admin: [
    { label: 'Dashboard', icon: 'dashboard', path: '/admin/dashboard' },
    { label: 'Sales Reports', icon: 'reports', path: '/admin/reports' },
    { label: 'Users', icon: 'users', path: '/admin/users' },
    { label: 'Tables Management', icon: 'settings', path: '/admin/tables' },
    { label: 'Products', icon: 'products', path: '/admin/products' },
    { label: 'Inventory', icon: 'inventory', path: '/admin/inventory' },
    { label: 'Point of Sale', icon: 'pos', path: '/cashier/pos' },
    { label: 'Tables', icon: 'tables', path: '/cashier/tables' },
    { label: 'Transactions', icon: 'transactions', path: '/cashier/transactions' }
  ],
  cashier: [
    { label: 'Point of Sale', icon: 'pos', path: '/cashier/pos' },
    { label: 'Tables', icon: 'tables', path: '/cashier/tables' },
    { label: 'Transactions', icon: 'transactions', path: '/cashier/transactions' }
  ]
};

function NavIcon({ name }) {
  const icons = {
    dashboard: (
      <path
        d="M4 13h7V4H4v9Zm9 7h7V4h-7v16ZM4 20h7v-5H4v5Zm9 0h7v-2h-7v2Z"
        fill="currentColor"
      />
    ),
    reports: (
      <path
        d="M5 19V9h3v10H5Zm5 0V5h4v14h-4Zm6 0v-7h3v7h-3Z"
        fill="currentColor"
      />
    ),
    users: (
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-6 1.79-6 4v1h12v-1c0-2.21-2.67-4-6-4Z"
        fill="currentColor"
      />
    ),
    settings: (
      <path
        d="m19.14 12.94.86-1.49-1.72-2.98-1.71.5a5.96 5.96 0 0 0-1.29-.75L15 6h-6l-.28 2.22c-.46.18-.89.43-1.29.75l-1.71-.5L4 11.45l.86 1.49a5.97 5.97 0 0 0 0 1.12L4 15.55l1.72 2.98 1.71-.5c.4.32.83.57 1.29.75L9 21h6l.28-2.22c.46-.18.89-.43 1.29-.75l1.71.5L20 15.55l-.86-1.49c.06-.37.06-.75 0-1.12ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"
        fill="currentColor"
      />
    ),
    products: (
      <path
        d="M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.3 5.8 3.2L12 10.7 6.2 7.5 12 4.3Zm-7 5L11 12.7v6.5l-6-3.3V9.3Zm8 9.9v-6.5l6-3.4v6.6l-6 3.3Z"
        fill="currentColor"
      />
    ),
    inventory: (
      <path
        d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Zm2 .95v6.87l5 2.81v-6.86L6 8.45Zm7 9.68 5-2.81V8.45l-5 2.82v6.86Z"
        fill="currentColor"
      />
    ),
    tables: (
      <path
        d="M4 5h16v4H4V5Zm1 5h6v9H5v-9Zm8 0h6v9h-6v-9Z"
        fill="currentColor"
      />
    ),
    transactions: (
      <path
        d="M4 6h16v12H4V6Zm2 2v2h12V8H6Zm0 4v4h5v-4H6Zm7 0h5v2h-5v-2Z"
        fill="currentColor"
      />
    ),
    pos: (
      <path
        d="M6 4h12a2 2 0 0 1 2 2v10H4V6a2 2 0 0 1 2-2Zm0 2v2h12V6H6Zm2 5a2 2 0 1 0 0 4h8v-4H8Zm-2 9h12v2H6v-2Z"
        fill="currentColor"
      />
    )
  };

  return (
    <svg aria-hidden="true" className="nav-link-icon" viewBox="0 0 24 24">
      {icons[name] ?? icons.products}
    </svg>
  );
}

const pageTitleByPath = {
  '/admin/dashboard': 'Sales Dashboard',
  '/admin/reports': 'Sales Reports',
  '/admin/users': 'User Management',
  '/admin/tables': 'Tables Management',
  '/admin/products': 'Manage Products',
  '/admin/inventory': 'Inventory',
  '/cashier/pos': 'Point of Sale',
  '/cashier/tables': 'Tables',
  '/cashier/transactions': 'Transactions'
};

export function AppShell() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { showToast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const navigation = navigationByRole[user?.role] ?? [];
  const currentPageTitle = pageTitleByPath[location.pathname] ?? 'Page';
  const pageContentClassName = location.pathname.startsWith('/cashier/pos')
    ? 'page-content page-content-pos'
    : 'page-content';
  const appShellClassName = `app-shell${isSidebarOpen ? ' app-shell-sidebar-open' : ' app-shell-sidebar-collapsed'}`;
  const sidebarClassName = `sidebar${isSidebarOpen ? ' sidebar-open' : ' sidebar-collapsed'}`;

  const handleLogout = () => {
    logout();
    setIsLogoutDialogOpen(false);
    showToast({
      title: 'Logged out',
      message: 'Your session has been closed.',
      type: 'info'
    });
  };

  const toggleSidebar = () => setIsSidebarOpen((current) => !current);
  const handleNavigationClick = () => {
    if (window.matchMedia('(max-width: 900px)').matches) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className={appShellClassName}>
      <aside className={sidebarClassName}>
        <div className="sidebar-topbar">
          <button
            aria-label={isSidebarOpen ? 'Collapse navigation' : 'Expand navigation'}
            className="sidebar-toggle"
            onClick={toggleSidebar}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path
                d={
                  isSidebarOpen
                    ? 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z'
                    : 'm8.59 16.59 1.41 1.41 6-6-6-6-1.41 1.41L13.17 12z'
                }
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        <nav className="nav-list">
          {navigation.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                aria-label={item.label}
                className={`nav-link${isActive ? ' nav-link-active' : ''}`}
                data-tooltip={item.label}
                onClick={handleNavigationClick}
                title={!isSidebarOpen ? item.label : undefined}
                to={item.path}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <strong>{user?.fullName}</strong>
            <span>{user?.role}</span>
          </div>
          <button
            aria-label="Logout"
            className="logout-button"
            data-tooltip="Logout"
            onClick={() => setIsLogoutDialogOpen(true)}
            title={!isSidebarOpen ? 'Logout' : undefined}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path
                d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4v-2H6V6h4V4Zm5.59 3.59L14.17 9l2.58 2.59H9v2h7.75L14.17 16l1.42 1.41L20.59 12l-5-4.41Z"
                fill="currentColor"
              />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <button
        aria-hidden={!isSidebarOpen}
        className={`sidebar-backdrop${isSidebarOpen ? ' sidebar-backdrop-visible' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
        tabIndex={isSidebarOpen ? 0 : -1}
        type="button"
      />
      <main className={pageContentClassName}>
        <button
          aria-label={isSidebarOpen ? 'Collapse navigation' : 'Expand navigation'}
          className={`shell-fab-toggle${isSidebarOpen ? '' : ' shell-fab-toggle-visible'}`}
          onClick={toggleSidebar}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path
              d="M4 7h16v2H4V7Zm0 4h16v2H4v-2Zm0 4h16v2H4v-2Z"
              fill="currentColor"
            />
          </svg>
        </button>
        <div className="shell-page-header">
          <img alt="Sains POS logo" className="shell-page-logo" src={navLogoImage} />
          <div className="shell-page-title">{currentPageTitle}</div>
          
        </div>
        <Outlet />
        <ConfirmDialog
          cancelLabel="Stay"
          confirmLabel="Logout"
          confirmButtonClassName="logout-confirm-button"
          isOpen={isLogoutDialogOpen}
          message="You will end the current session and return to the login page."
          onClose={() => setIsLogoutDialogOpen(false)}
          onConfirm={handleLogout}
          title="Logout now?"
        />
      </main>
    </div>
  );
}
