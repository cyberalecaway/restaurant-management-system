import { safeNextPath } from './safe-next-path.mjs';

const RMS_PATHS = [
  '/dashboard', '/menu', '/menu-management', '/orders', '/users', '/user-management',
  '/activity', '/activity-history', '/reports', '/settings', '/messages', '/inventory', '/stock',
];
const CUSTOMER_PATHS = ['/my-orders'];
const ADMIN_PATHS = ['/users', '/user-management', '/settings', '/inventory', '/stock'];

function matchesPath(pathname, prefixes) {
  return prefixes.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function pathOnly(path) {
  return path.split(/[?#]/, 1)[0] || '/';
}

export function isRmsRoute(pathname) {
  return matchesPath(pathname, RMS_PATHS);
}

export function isAdminOnlyRoute(pathname) {
  return matchesPath(pathname, ADMIN_PATHS);
}

export function isCustomerOnlyRoute(pathname) {
  return matchesPath(pathname, CUSTOMER_PATHS);
}

export function getRoleRedirect(role, status, requestedPath) {
  if (status !== 'ACTIVE') return null;
  if (role !== 'ADMIN' && role !== 'STAFF' && role !== 'CUSTOMER') return null;

  const defaultPath = role === 'CUSTOMER' ? '/' : '/dashboard';
  if (!requestedPath) return defaultPath;

  const target = safeNextPath(requestedPath, 'https://hba.invalid');
  const pathname = pathOnly(target);
  if (role === 'ADMIN' && isCustomerOnlyRoute(pathname)) return defaultPath;
  if (role === 'CUSTOMER') return isRmsRoute(pathname) ? '/' : target;
  if (role === 'STAFF' && (isAdminOnlyRoute(pathname) || isCustomerOnlyRoute(pathname))) return defaultPath;
  if (target === '/' || pathname === '/login' || pathname === '/register') {
    return defaultPath;
  }
  return target;
}
