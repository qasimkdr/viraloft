import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const getSurface = (pathname) => {
  if (pathname === '/') return 'home';
  if (['/login', '/register', '/verify-email'].includes(pathname)) return 'auth';
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/create-order') ||
    pathname.startsWith('/support') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/staff')
  ) return 'workspace';
  return 'public';
};

export default function RouteTheme({ children }) {
  const { pathname } = useLocation();

  useEffect(() => {
    const surface = getSurface(pathname);
    document.body.dataset.surface = surface;
    document.body.dataset.route = pathname.replace(/^\//, '').replace(/[^a-z0-9-]/gi, '-') || 'home';
    return () => {
      delete document.body.dataset.surface;
      delete document.body.dataset.route;
    };
  }, [pathname]);

  return (
    <div className="route-theme">
      <div className="route-ambient" aria-hidden="true" />
      {children}
    </div>
  );
}
