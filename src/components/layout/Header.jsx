import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, ChevronRight } from 'lucide-react';
import { useAuth } from '../../store/auth';
import { useState, useEffect, useCallback } from 'react';
import { alertesAPI } from '../../services/api';

const TITLES = {
  '/':                 'Tableau de bord',
  '/formulaires':      'Formulaires',
  '/soumissions':      'Soumissions',
  '/historique':       'Historique',
  '/equipements':      'Équipements',
  '/planning':         'Planning — Processus',
  '/plannification':   'Planification',
  '/lignes':           'Lignes de production',
  '/stock':            'Stock pièces',
  '/matieres':         'Matières premières',
  '/alertes':          'Alertes',
  '/utilisateurs':     'Utilisateurs',
  '/generateur-excel': 'Générateur Excel',
  '/maintenancier':    'Espace Technicien',
  '/operateur':        'Espace Opérateur',
};

export default function Header({ onMenuClick }) {
  const { pathname }  = useLocation();
  const navigate      = useNavigate();
  const { user, isAdmin, moduleScope, selectModule } = useAuth();
  const [nbAlertes, setNbAlertes] = useState(0);

  const title = Object.entries(TITLES)
    .find(([k]) => pathname === k || pathname.startsWith(k + '/'))
    ?.[1] || 'InnoFaso';

  const fetchCount = useCallback(() => {
    alertesAPI.countNonLues()
      .then(r => setNbAlertes(r.data?.count || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCount();
    const t = setInterval(fetchCount, 60000);
    return () => clearInterval(t);
  }, [fetchCount, pathname]);

  return (
    <header className="flex-shrink-0 h-16 bg-background border-b border-border flex items-center gap-3 px-3 md:px-5">

      {/* Hamburger — mobile uniquement */}
      <button
        onClick={onMenuClick}
        className="md:hidden flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
        aria-label="Ouvrir le menu"
      >
        <Menu size={22} className="text-foreground" />
      </button>

      {/* Titre */}
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-base md:text-lg text-foreground truncate leading-tight">
          {title}
        </h2>
        <p className="text-xs text-muted-foreground hidden sm:block">
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* Droite */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Badge module (admin) */}
        {isAdmin() && moduleScope && (
          <button
            onClick={() => { selectModule(''); navigate('/modules'); }}
            className={`hidden sm:flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              moduleScope === 'MAINTENANCE'
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
            }`}
          >
            {moduleScope === 'MAINTENANCE' ? 'Maintenance' : 'Production'}
            <ChevronRight size={12} />
          </button>
        )}

        {/* Cloche alertes */}
        <Link
          to="/alertes"
          className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
        >
          <Bell size={20} className={nbAlertes > 0 ? 'text-red-500' : 'text-muted-foreground'} />
          {nbAlertes > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none">
              {nbAlertes > 9 ? '9+' : nbAlertes}
            </span>
          )}
        </Link>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm select-none flex-shrink-0">
          {user?.prenom?.[0]}{user?.nom?.[0]}
        </div>
      </div>
    </header>
  );
}