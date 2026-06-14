import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, FileCheck, Wrench, Bell, Calendar,
  Package, Users, LogOut, Zap, FileSpreadsheet, History, Layers, Wheat
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../store/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const nav = [
  { to:'/',             label:'Tableau de bord',     icon:LayoutDashboard, end:true, modules:['MAINTENANCE','PRODUCTION'] },
  { to:'/formulaires',  label:'Formulaires',          icon:ClipboardList,             modules:['MAINTENANCE','PRODUCTION'] },
  { to:'/soumissions',  label:'Soumissions',          icon:FileCheck,                 modules:['MAINTENANCE','PRODUCTION'] },
  { to:'/historique',   label:'Historique',           icon:History,                   modules:['MAINTENANCE','PRODUCTION'] },
  { to:'/alertes',      label:'Alertes',              icon:Bell,                      modules:['MAINTENANCE','PRODUCTION'] },
  { to:'/matieres',     label:'Stocks Matières premières',   icon:Wheat,                     modules:['MAINTENANCE','PRODUCTION'] },
  // Maintenance seulement
  { to:'/equipements',  label:'Équipements',          icon:Wrench,                    modules:['MAINTENANCE'] },
  { to:'/planning',     label:'Planning',             icon:Calendar,                  modules:['MAINTENANCE'] },
  { to:'/lignes',       label:'Lignes de production', icon:Layers,                    modules:['MAINTENANCE'] },
  { to:'/stock',        label:'Stock pièces',         icon:Package,                   modules:['MAINTENANCE'] },
];

const admin = [
  { to:'/generateur-excel', label:'Générateur Excel', icon:FileSpreadsheet, modules:['MAINTENANCE','PRODUCTION'] },
  { to:'/utilisateurs',     label:'Utilisateurs',     icon:Users,           modules:['MAINTENANCE','PRODUCTION'] },
];

export default function Sidebar({ compact = false }) {
  const { user, logout, isAdmin, moduleScope } = useAuth();

  const filterByModule = (item) => {
    if (!moduleScope) return true;
    return !item.modules || item.modules.includes(moduleScope);
  };

  const navItemClass = (isActive) => {
    const activeClass = isActive
      ? 'bg-primary/10 text-primary shadow-sm shadow-primary/10'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground';
    return compact
      ? `flex h-10 items-center justify-center rounded-xl px-0 text-sm font-medium transition-all duration-200 ${activeClass}`
      : `flex h-10 items-center rounded-xl px-3 text-sm font-medium transition-all duration-200 ${activeClass}`;
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: compact ? 80 : 256 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="relative flex h-full flex-col border-r border-border/70 bg-background/95 shadow-[0_0_0_1px_rgba(15,23,42,0.02)] backdrop-blur-xl"
    >
      <div className={`${compact ? 'px-3' : 'px-5'} flex h-16 items-center border-b border-border/70`}>
        <div className={`flex w-full items-center ${compact ? 'justify-center' : 'gap-3'}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
            <Zap size={18}/>
          </div>
          {!compact && (
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold leading-none text-foreground">InnoFaso</h1>
              <p className="mt-1 text-xs text-muted-foreground">Gestion Digitale v2</p>
              {moduleScope && (
                <Badge variant="outline" className={`mt-2 border-transparent ${
                  moduleScope === 'MAINTENANCE' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                }`}>
                  {moduleScope === 'MAINTENANCE' ? 'Maintenance' : 'Production'}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <ScrollArea className="flex-1 px-3 py-4">
          <div className="space-y-4">
            {!compact && <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Navigation</p>}
            <div className="space-y-1">
              {nav.filter(filterByModule).map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} title={compact ? label : undefined}
                  className={({ isActive }) => navItemClass(isActive)}>
                  <Icon size={18} className="shrink-0"/>
                  {!compact && <span className="ml-3 truncate">{label}</span>}
                </NavLink>
              ))}
            </div>

            {isAdmin() && (
              <>
                <Separator className="my-2 bg-border/80"/>
                {!compact && <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Administration</p>}
                <div className="space-y-1">
                  {admin.filter(filterByModule).map(({ to, label, icon: Icon }) => (
                    <NavLink key={to} to={to} title={compact ? label : undefined}
                      className={({ isActive }) => navItemClass(isActive)}>
                      <Icon size={18} className="shrink-0"/>
                      {!compact && <span className="ml-3 truncate">{label}</span>}
                    </NavLink>
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border/70 p-3">
          <div className={`flex items-center ${compact ? 'justify-center' : 'gap-3'} rounded-2xl bg-muted/40 px-3 py-2.5`}>
            <Avatar className="h-9 w-9 border border-border/70 bg-background">
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {user?.prenom?.[0]}{user?.nom?.[0]}
              </AvatarFallback>
            </Avatar>
            {!compact && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{user?.prenom} {user?.nom}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.role}</p>
              </div>
            )}
          </div>
          <button onClick={logout} title={compact ? 'Déconnexion' : undefined}
            className={`mt-3 flex h-10 w-full items-center rounded-xl px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 ${compact ? 'justify-center px-0' : ''}`}>
            <LogOut size={18} className="shrink-0"/>
            {!compact && <span className="ml-3">Déconnexion</span>}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
