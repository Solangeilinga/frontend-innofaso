import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { alertesAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import {
  Bell, CheckCheck, AlertTriangle, Info, Zap, Wrench,
  RefreshCw, FileWarning, ChevronDown, Package, Wheat, X
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_CFG = {
  MAINTENANCE_PREVENTIVE: {
    icon: Wrench, label: 'Maintenance préventive',
    cls: 'badge-blue', bg: 'bg-blue-50 border-blue-100', dot: 'bg-blue-500',
    lien: '/planning', lienLabel: 'Voir planning',
  },
  FORMULAIRE_EN_RETARD: {
    icon: FileWarning, label: 'Formulaire non rempli',
    cls: 'badge-orange', bg: 'bg-orange-50 border-orange-100', dot: 'bg-orange-500',
    lien: '/formulaires', lienLabel: 'Remplir',
  },
  PANNE_CRITIQUE: {
    icon: Zap, label: 'Panne critique',
    cls: 'badge-red', bg: 'bg-red-50 border-red-100', dot: 'bg-red-500',
    lien: '/equipements', lienLabel: 'Voir équipements',
  },
  STOCK_BAS: {
    icon: Package, label: 'Stock pièces bas',
    cls: 'badge-yellow', bg: 'bg-yellow-50 border-yellow-100', dot: 'bg-yellow-500',
    lien: '/stock', lienLabel: 'Voir stock',
  },
  STOCK_MP_BAS: {
    icon: Wheat, label: 'Stock matières premières bas',
    cls: 'badge-yellow', bg: 'bg-amber-50 border-amber-100', dot: 'bg-amber-500',
    lien: '/matieres', lienLabel: 'Voir matières',
  },
};

const STATUT_COLORS = {
  NON_LUE: 'badge-red',
  LUE:     'badge-gray',
  TRAITEE: 'badge-green',
};

const TYPES = Object.entries(TYPE_CFG).map(([value, c]) => ({ value, label: c.label }));
const MODULES = [
  { value: '', label: 'Tous les modules' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'PRODUCTION', label: 'Production' }
];

export default function AlertesPage() {
  const { isAdmin, peutValider, moduleScope } = useAuth();
  const canTraiter = peutValider();

  const [alertes, setAlertes]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState(false);
  const [filtre, setFiltre]     = useState('NON_LUE');
  const [typeFiltre, setTypeFiltre] = useState('');
  const [moduleFiltre, setModuleFiltre] = useState(moduleScope || '');
  const [page, setPage]         = useState(1);
  const LIMIT = 20;

  const load = (withSync = false) => {
    setLoading(true);
    alertesAPI.lister({
      statut: filtre || undefined,
      type_alerte: typeFiltre || undefined,
      module: moduleFiltre || undefined,
      page, limit: LIMIT,
    })
      .then(r => {
        setAlertes(r.data?.data || r.data || []);
        setTotal(r.data?.total || 0);
      })
      .catch(() => toast.error('Erreur chargement alertes'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filtre, typeFiltre, moduleFiltre, page]);

  const refresh = async () => {
    setSyncing(true);
    try { load(true); toast.success('Alertes actualisées'); }
    catch { toast.error('Erreur synchronisation'); }
    finally { setSyncing(false); }
  };

  const marquerLue = async (id) => {
    try {
      await alertesAPI.marquerLue(id);
      setAlertes(prev => prev.map(a => a.id === id ? { ...a, statut: 'LUE' } : a));
    } catch { toast.error('Erreur'); }
  };

  const marquerTraitee = async (id) => {
    try {
      await alertesAPI.marquerTraitee(id);
      setAlertes(prev => prev.map(a => a.id === id ? { ...a, statut: 'TRAITEE' } : a));
      toast.success('Alerte marquée comme traitée.');
    } catch { toast.error('Erreur'); }
  };

  const toutesLues = async () => {
    try {
      await alertesAPI.toutesLues();
      setAlertes(prev => prev.map(a => ({ ...a, statut: 'LUE' })));
      toast.success('Toutes les alertes marquées comme lues.');
    } catch { toast.error('Erreur'); }
  };

  // Compteurs par type (alertes NON_LUE uniquement)
  const nonLues = alertes.filter(a => a.statut === 'NON_LUE');
  const counts = {
    critique: nonLues.filter(a => a.type_alerte === 'PANNE_CRITIQUE').length,
    retard:   nonLues.filter(a => a.type_alerte === 'FORMULAIRE_EN_RETARD').length,
    stock:    nonLues.filter(a => ['STOCK_BAS','STOCK_MP_BAS'].includes(a.type_alerte)).length,
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Alertes</h1>
          <p className="text-sm text-gray-400 mt-1">
            Formulaires en retard · Pannes · Stocks bas · Maintenances préventives
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Bell size={16}/>
          <span>{total} alerte{total > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Bandeaux critiques */}
      {filtre === 'NON_LUE' && (counts.critique > 0 || counts.retard > 0 || counts.stock > 0) && (
        <div className="grid gap-3 sm:grid-cols-3">
          {counts.critique > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <Zap className="mb-2 text-red-600" size={20}/>
              <p className="text-sm font-bold text-red-700">{counts.critique} panne{counts.critique > 1 ? 's' : ''} critique{counts.critique > 1 ? 's' : ''}</p>
            </div>
          )}
          {counts.retard > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <FileWarning className="mb-2 text-orange-600" size={20}/>
              <p className="text-sm font-bold text-orange-700">{counts.retard} formulaire{counts.retard > 1 ? 's' : ''} en retard</p>
            </div>
          )}
          {counts.stock > 0 && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <Package className="mb-2 text-yellow-600" size={20}/>
              <p className="text-sm font-bold text-yellow-700">{counts.stock} alerte{counts.stock > 1 ? 's' : ''} stock</p>
            </div>
          )}
        </div>
      )}

      {/* Filtres */}
      <div className="card flex flex-wrap items-center gap-3">
        {/* Statut */}
        <div className="relative">
          <select value={filtre} onChange={e => { setFiltre(e.target.value); setPage(1); }}
            className="input w-36 appearance-none pr-8 cursor-pointer">
            <option value="NON_LUE">Non lues</option>
            <option value="LUE">Lues</option>
            <option value="TRAITEE">Traitées</option>
            <option value="">Toutes</option>
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
        </div>

        {/* ✅ AJOUT : Filtre par Module */}
        <div className="relative">
          <select 
            value={moduleFiltre} 
            onChange={e => { setModuleFiltre(e.target.value); setPage(1); }}
            className="input w-44 appearance-none pr-8 cursor-pointer"
            disabled={moduleScope && moduleScope !== ''}
          >
            {MODULES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
        </div>

        {/* Type */}
        <div className="relative flex-1 min-w-[180px]">
          <select value={typeFiltre} onChange={e => { setTypeFiltre(e.target.value); setPage(1); }}
            className="input w-full appearance-none pr-8 cursor-pointer">
            <option value="">Tous les types</option>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
        </div>

        <button onClick={refresh} disabled={syncing}
          className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={15} className={syncing ? 'animate-spin' : ''}/>
          Actualiser
        </button>

        {filtre === 'NON_LUE' && alertes.some(a => a.statut === 'NON_LUE') && (
          <button onClick={toutesLues} className="ml-auto btn-secondary flex items-center gap-2 text-sm">
            <CheckCheck size={15}/> Tout marquer lu
          </button>
        )}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"/>
        </div>
      ) : alertes.length === 0 ? (
        <div className="card py-16 text-center">
          <Bell size={40} className="mx-auto mb-3 text-gray-200"/>
          <p className="text-sm text-gray-400">Aucune alerte pour ce filtre.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alertes.map(a => {
            const c = TYPE_CFG[a.type_alerte] || {
              icon: Bell, label: a.type_alerte,
              cls: 'badge-gray', bg: 'bg-gray-50 border-gray-100', dot: 'bg-gray-400',
            };
            const Icon = c.icon;
            const isNonLue = a.statut === 'NON_LUE';

            return (
              <div key={a.id} className={`card flex items-start gap-4 border transition-opacity
                ${c.bg} ${!isNonLue ? 'opacity-70' : ''}`}>
                {/* Dot non lue */}
                {isNonLue && <div className={`shrink-0 mt-1.5 w-2 h-2 rounded-full ${c.dot}`}/>}
                {!isNonLue && <div className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-transparent"/>}

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Icon size={16} className="text-gray-600"/>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold ${c.cls.replace('badge-','text-')} `}>{c.label}</span>
                      <span className={STATUT_COLORS[a.statut] || 'badge-gray'}>{a.statut}</span>
                      {/* ✅ AJOUT : Affichage du module */}
                      {a.module && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${a.module === 'MAINTENANCE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {a.module === 'MAINTENANCE' ? '🔧 Maintenance' : '🏭 Production'}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(a.date_creation), { addSuffix: true, locale: fr })}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 leading-snug">{a.message}</p>

                  {(a.equipement_nom || a.formulaire_titre) && (
                    <p className="mt-1 text-xs text-gray-400">
                      {a.equipement_nom && <span>🔧 {a.equipement_nom}</span>}
                      {a.formulaire_titre && <span> · 📋 {a.formulaire_titre}</span>}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {c.lien && (
                      <Link to={c.lien} className="text-xs text-primary hover:underline font-medium">
                        {c.lienLabel} →
                      </Link>
                    )}
                    {isNonLue && (
                      <button onClick={() => marquerLue(a.id)}
                        className="text-xs text-gray-500 hover:text-gray-700 hover:underline">
                        Marquer lu
                      </button>
                    )}
                    {a.statut === 'LUE' && canTraiter && (
                      <button onClick={() => marquerTraitee(a.id)}
                        className="text-xs text-green-600 hover:underline font-medium">
                        ✓ Marquer traité
                      </button>
                    )}
                    <span className="text-xs text-gray-300 ml-auto">
                      {format(new Date(a.date_creation), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">
            ← Précédent
          </button>
          <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}