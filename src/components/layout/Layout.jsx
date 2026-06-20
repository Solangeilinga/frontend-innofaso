import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationStream from '../NotificationStream';
import Header  from './Header';

export default function Layout() {
  const { pathname } = useLocation();
  const compactSidebar = pathname.startsWith('/generateur-excel');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fermer le drawer à chaque changement de page
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Bloquer le scroll du body quand le drawer est ouvert
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NotificationStream />

      {/* ── Overlay sombre (mobile) ───────────────────────────── */}
      <div
        onClick={() => setMobileOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.5)',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s',
        }}
        className="md:hidden"
      />

      {/* ── Sidebar desktop (≥ md, toujours visible) ────────── */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar compact={compactSidebar} />
      </div>

      {/* ── Sidebar mobile (drawer) ──────────────────────────── */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          zIndex: 50,
          width: 272,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
        className="md:hidden"
      >
        <Sidebar
          compact={false}
          onClose={() => setMobileOpen(false)}
        />
      </div>

      {/* ── Contenu principal ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuClick={() => setMobileOpen(o => !o)} />
        <main className={`flex-1 overflow-y-auto animate-fade-in ${
          compactSidebar ? 'p-3 md:p-4' : 'p-3 md:p-6'
        }`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}