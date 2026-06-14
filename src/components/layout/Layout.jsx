import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header  from './Header';
import { Menu, X } from 'lucide-react';

export default function Layout() {
  const { pathname } = useLocation();
  const compactSidebar = pathname.startsWith('/generateur-excel');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fermer le menu mobile à chaque changement de page
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Overlay mobile ───────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar desktop (toujours visible ≥ md) ─────────────── */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar compact={compactSidebar}/>
      </div>

      {/* ── Sidebar mobile (drawer) ──────────────────────────────── */}
      <div className={`
        fixed inset-y-0 left-0 z-50 flex flex-shrink-0 md:hidden
        transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar compact={false}/>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-[-44px] w-9 h-9 bg-white rounded-full shadow flex items-center justify-center"
        >
          <X size={18} className="text-gray-600"/>
        </button>
      </div>

      {/* ── Contenu principal ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuClick={() => setMobileOpen(o => !o)}/>
        <main className={`
          flex-1 overflow-y-auto animate-fade-in
          ${compactSidebar ? 'p-3 md:p-4' : 'p-3 md:p-6'}
        `}>
          <Outlet/>
        </main>
      </div>
    </div>
  );
}
