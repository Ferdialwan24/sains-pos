import { useAuth } from './useAuth.js';

const roleLabels = {
  admin: 'Admin',
  cashier: 'Cashier',
  demo: 'Demo'
};

export const useRoleEyebrow = (fallback = 'User') => {
  const { user } = useAuth();

  return roleLabels[user?.role] ?? fallback;
};
