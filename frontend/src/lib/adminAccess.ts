import { User } from '../types';

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'owner']);
const ADMIN_PLAN_CODES = new Set(['internal-full-access']);

export function isOemAdminUser(user: User | null): boolean {
  if (!user) return false;
  const role = (user.role || '').trim().toLowerCase();
  if (ADMIN_ROLES.has(role)) return true;

  const planCode = (user.subscription?.planCode || '').trim().toLowerCase();
  if (ADMIN_PLAN_CODES.has(planCode)) return true;

  const envAllowList = (import.meta.env.VITE_OEM_ADMIN_EMAILS || '')
    .split(',')
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean);
  if (envAllowList.length > 0 && envAllowList.includes(user.email.toLowerCase())) return true;

  return false;
}

