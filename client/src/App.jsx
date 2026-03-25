import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute.jsx';
import { AppShell } from './components/layout/AppShell.jsx';
import { useAuth } from './hooks/useAuth.js';
import { DashboardPage } from './pages/admin/DashboardPage.jsx';
import { InventoryPage } from './pages/admin/InventoryPage.jsx';
import { ProductsPage } from './pages/admin/ProductsPage.jsx';
import { SalesReportsPage } from './pages/admin/SalesReportsPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { TablesPage } from './pages/admin/TablesPage.jsx';
import { UsersPage } from './pages/admin/UsersPage.jsx';
import { PosPage } from './pages/cashier/PosPage.jsx';
import { TableBillingPage } from './pages/cashier/TableBillingPage.jsx';
import { TransactionsPageLive } from './pages/cashier/TransactionsPageLive.jsx';
import { TransactionReceiptPage } from './pages/shared/TransactionReceiptPage.jsx';

function HomeRedirect() {
  const { isAuthenticated, isBootstrapping, user } = useAuth();

  if (isBootstrapping) {
    return <div className="page-status">Loading session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/cashier/tables'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route element={<ProtectedRoute allowedRoles={['cashier', 'admin']} />}>
            <Route path="/cashier/tables" element={<TableBillingPage />} />
            <Route path="/cashier/pos" element={<PosPage />} />
            <Route path="/cashier/transactions" element={<TransactionsPageLive />} />
            <Route path="/transactions/:transactionId" element={<TransactionReceiptPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<DashboardPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/tables" element={<TablesPage />} />
            <Route path="/admin/products" element={<ProductsPage />} />
            <Route path="/admin/inventory" element={<InventoryPage />} />
            <Route path="/admin/reports" element={<SalesReportsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
