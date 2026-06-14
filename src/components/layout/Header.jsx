import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, ChevronRight } from 'lucide-react';
import { useAuth } from '../../store/auth';
import { useState, useEffect, useCallback } from 'react';
import { alertesAPI } from '../../services/api';

const TITLES = {
  '/':                'Tableau de bord',
  '/formulaires':     'Formulaires',
  '/soumissions':     'Soumissions',
  '/historique':      'Historique',
  '/equipements':     'Équipements',
  '/planning':        'Planning',
  '/lignes':          'Lignes de production',
  '/stock':           'Stock pièces',
  '/matieres':        'Matières premières',
  '/alertes':         'Alertes',
  '/utilisateurs':    'Utilisateurs',
  '/generateur-excel':'Générateur Excel',
  '/maintenancier':   'Espace Technicien',
  '/operateur':       'Espace Opérateur',
};

export default function Header({ onMenuClick }) {
  const { pathname }   = useLocation();
  const navigate       = useNavigate();
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
    <header className="h-14 md:h-16 bg-background border-b border-border flex items-center justify-between px-3 md:px-6 flex-shrink-0 gap-3">

      {/* Bouton menu hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
      >
        <Menu size={20} className="text-foreground"/>
      </button>

      {/* Titre de la page */}
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-base md:text-xl text-foreground truncate">{title}</h2>
        <p className="text-xs text-muted-foreground hidden md:block">
          {new Date().toLocaleDateString('fr-FR', {
            weekday:'long', year:'numeric', month:'long', day:'numeric'
          })}
        </p>
      </div>

      {/* Actions droite */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Changer de module (admin) */}
        {isAdmin() && moduleScope && (
          <button
            onClick={() => { selectModule(''); navigate('/modules'); }}
            className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-colors
              ${moduleScope === 'MAINTENANCE'
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : 'bg-secondary/10 text-secondary hover:bg-secondary/20'}`}
          >
            {moduleScope === 'MAINTENANCE' ? 'Maintenance' : 'Production'}
            <ChevronRight size={12}/>
          </button>
        )}

        {/* Cloche alertes */}
        <Link to="/alertes" className="relative p-2 rounded-xl hover:bg-muted transition-colors">
          <Bell size={20} className={nbAlertes > 0 ? 'text-red-500' : 'text-muted-foreground'}/>
          {nbAlertes > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
              {nbAlertes > 99 ? '99+' : nbAlertes > 9 ? '9+' : nbAlertes}
            </span>
          )}
        </Link>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm select-none flex-shrink-0">
          {user?.prenom?.[0]}{user?.nom?.[0]}
        </div>
      </div>
    </header>
  );
}
