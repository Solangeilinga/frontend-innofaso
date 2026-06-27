import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { alertesAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import {
  Bell, CheckCheck, Zap, Wrench, RefreshCw, FileWarning,
  ChevronDown, Package, ArrowRight, CircleCheck, Filter, Clock,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Config types ─────────────────────────────────────────────────
const TYPE_CFG = {
  MAINTENANCE_PREVENTIVE: {
    icon: Wrench, label: 'Maintenance préventive', severity: 'neutral',
    lien: '/planning', lienLabel: 'Voir le planning',
  },
  FORMULAIRE_EN_RETARD: {
    icon: FileWarning, label: 'Formulaire en retard', severity: 'warning',
    lien: '/formulaires', lienLabel: 'Accéder aux formulaires',
  },
  PANNE_CRITIQUE: {
    icon: Zap, label: 'Panne critique', severity: 'danger',
    lien: '/equipements', lienLabel: 'Voir les équipements',
  },
  MAINTENANCE_CORRECTIVE: {
    icon: Wrench, label: 'Maintenance corrective', severity: 'warning',
    lien: '/plannification', lienLabel: 'Planifier',
  },
  STOCK_BAS: {
    icon: Package, label: 'Stock pièces insuffisant', severity: 'warning',
    lien: '/stock', lienLabel: 'Gérer le stock',
  },
  VALIDATION: {
    icon: CircleCheck, label: 'Validation requise', severity: 'neutral',
    lien: '/soumissions', lienLabel: 'Voir les soumissions',
  },
};

// ── Styles par sévérité ───────────────────────────────────────────
const SEV = {
  danger: {
    card:   'bg-red-50 border-red-200',
    icon:   'bg-red-600 text-white',
    badge:  'bg-red-600 text-white text-xs',
    label:  'text-red-700',
    link:   'text-red-700 hover:text-red-900',
    action: 'text-red-600 hover:text-red-800',
    dot:    'bg-red-500',
    meta:   'text-red-500',
  },
  warning: {
    card:   'bg-amber-50 border-amber-200',
    icon:   'bg-amber-500 text-white',
    badge:  'bg-amber-500 text-white text-xs',
    label:  'text-amber-700',
    link:   'text-amber-700 hover:text-amber-900',
    action: 'text-amber-600 hover:text-amber-800',
    dot:    'bg-amber-400',
    meta:   'text-amber-500',
  },
  neutral: {
    card:   'bg-white border-gray-200',
    icon:   'bg-gray-100 text-gray-500',
    badge:  'bg-gray-100 text-gray-600 text-xs',
    label:  'text-gray-600',
    link:   'text-primary hover:underline',
    action: 'text-primary hover:underline',
    dot:    'bg-blue-500',
    meta:   'text-gray-400',
  },
};

const TYPES = [
  { value: '', label: 'Tous les types' },
  ...Object.entries(TYPE_CFG).map(([v, c]) => ({ value: v, label: c.label })),
];

const MODULES = [
  { value: '', label: 'Tous les modules' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'PRODUCTION',  label: 'Production'  },
];

// ── Carte alerte ─────────────────────────────────────────────────
function AlerteCard({ a, onLue, onTraitee, canTraiter }) {
  const cfg  = TYPE_CFG[a.type_alerte] || { icon: Bell, label: a.type_alerte, severity: 'neutral' };
  const sev  = SEV[cfg.severity] || SEV.neutral;
  const Icon = cfg.icon;
  const isNonLue = a.statut === 'NON_LUE';
  const isLue    = a.statut === 'LUE';

  return (
    <div className={`relative rounded-xl border p-4 transition-opacity ${sev.card} ${!isNonLue ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">

        {/* Icône */}
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${sev.icon}`}>
          <Icon size={15} aria-hidden="true"/>
        </div>

        {/* Corps */}
        <div className="min-w-0 flex-1 space-y-1.5">

          {/* Ligne 1 : badge + module + temps */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded px-2 py-0.5 font-medium ${sev.badge}`}>
              {cfg.label}
            </span>
            {a.module && (
              <span className={`text-xs font-medium ${sev.label}`}>
                {a.module === 'MAINTENANCE' ? 'Maintenance' : 'Production'}
              </span>
            )}
            <span className="ml-auto text-xs text-gray-400">
              {formatDistanceToNow(new Date(a.date_creation), { addSuffix: true, locale: fr })}
            </span>
          </div>

          {/* Message */}
          <p className="text-sm leading-relaxed text-gray-800">{a.message}</p>

          {/* Contexte */}
          {(a.equipement_nom || a.formulaire_titre) && (
            <p className={`text-xs ${sev.meta}`}>
              {[a.equipement_nom, a.formulaire_titre].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-4 pt-0.5">
            {cfg.lien && (
              <Link to={cfg.lien}
                className={`flex items-center gap-1 text-xs font-medium transition-colors ${sev.link}`}>
                {cfg.lienLabel}
                <ArrowRight size={11}/>
              </Link>
            )}
            {isNonLue && (
              <button onClick={() => onLue(a.id)}
                className={`text-xs transition-colors ${sev.action}`}>
                Marquer comme lu
              </button>
            )}
            {isLue && canTraiter && (
              <button onClick={() => onTraitee(a.id)}
                className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-800 transition-colors">
                <CircleCheck size={11}/>
                Marquer traité
              </button>
            )}
            <span className="ml-auto text-xs text-gray-300">
              {format(new Date(a.date_creation), 'dd/MM/yyyy HH:mm', { locale: fr })}
            </span>
          </div>
        </div>

        {/* Dot non lue */}
        {isNonLue && (
          <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${sev.dot}`}/>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────
export default function AlertesPage() {
  const { peutValider, moduleScope } = useAuth();
  const canTraiter = peutValider();

  const [alertes, setAlertes]           = useState([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [syncing, setSyncing]           = useState(false);
  const [filtre, setFiltre]             = useState('NON_LUE');
  const [typeFiltre, setTypeFiltre]     = useState('');
  const [moduleFiltre, setModuleFiltre] = useState(moduleScope || '');
  const [page, setPage]                 = useState(1);
  const LIMIT = 20;

  const load = () => {
    setLoading(true);
    alertesAPI.lister({
      statut:      filtre       || undefined,
      type_alerte: typeFiltre   || undefined,
      module:      moduleFiltre || undefined,
      page, limit: LIMIT,
    })
      .then(r => { setAlertes(r.data?.data || r.data || []); setTotal(r.data?.total || 0); })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filtre, typeFiltre, moduleFiltre, page]);

  const refresh = () => { setSyncing(true); load(); setSyncing(false); toast.success('Alertes actualisées'); };

  const marquerLue = async (id) => {
    try { await alertesAPI.marquerLue(id); setAlertes(p => p.map(a => a.id === id ? { ...a, statut: 'LUE' } : a)); }
    catch { toast.error('Erreur'); }
  };

  const marquerTraitee = async (id) => {
    try {
      await alertesAPI.marquerTraitee(id);
      setAlertes(p => p.map(a => a.id === id ? { ...a, statut: 'TRAITEE' } : a));
      toast.success('Alerte traitée');
    } catch { toast.error('Erreur'); }
  };

  const toutesLues = async () => {
    try {
      await alertesAPI.toutesLues();
      setAlertes(p => p.map(a => ({ ...a, statut: 'LUE' })));
      toast.success('Toutes les alertes marquées comme lues');
    } catch { toast.error('Erreur'); }
  };

  const nonLues = alertes.filter(a => a.statut === 'NON_LUE');
  const counts  = {
    critique: nonLues.filter(a => a.type_alerte === 'PANNE_CRITIQUE').length,
    retard:   nonLues.filter(a => a.type_alerte === 'FORMULAIRE_EN_RETARD').length,
    stock:    nonLues.filter(a => ['STOCK_BAS','STOCK_MP_BAS'].includes(a.type_alerte)).length,
  };
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="mx-auto max-w-3xl space-y-5">

      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Alertes</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {total} alerte{total > 1 ? 's' : ''} · {nonLues.length} non lue{nonLues.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filtre === 'NON_LUE' && nonLues.length > 0 && (
            <button onClick={toutesLues}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <CheckCheck size={13}/>
              Tout marquer lu
            </button>
          )}
          <button onClick={refresh} disabled={syncing}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''}/>
            Actualiser
          </button>
        </div>
      </div>

      {/* Compteurs critiques */}
      {filtre === 'NON_LUE' && (counts.critique > 0 || counts.retard > 0 || counts.stock > 0) && (
        <div className="flex flex-wrap gap-2">
          {counts.critique > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2">
              <Zap size={13} className="text-red-600"/>
              <span className="text-sm font-semibold text-red-700">
                {counts.critique} panne{counts.critique > 1 ? 's' : ''} critique{counts.critique > 1 ? 's' : ''}
              </span>
            </div>
          )}
          {counts.retard > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
              <Clock size={13} className="text-amber-600"/>
              <span className="text-sm font-semibold text-amber-700">
                {counts.retard} formulaire{counts.retard > 1 ? 's' : ''} en retard
              </span>
            </div>
          )}
          {counts.stock > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
              <Package size={13} className="text-amber-600"/>
              <span className="text-sm font-semibold text-amber-700">
                {counts.stock} alerte{counts.stock > 1 ? 's' : ''} de stock
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={13} className="text-gray-400 flex-shrink-0"/>
        {[
          { v: 'NON_LUE', l: 'Non lues' },
          { v: 'LUE',     l: 'Lues'     },
          { v: 'TRAITEE', l: 'Traitées' },
          { v: '',        l: 'Toutes'   },
        ].map(({ v, l }) => (
          <button key={v} onClick={() => { setFiltre(v); setPage(1); }}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              filtre === v
                ? 'bg-gray-900 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}>
            {l}
          </button>
        ))}

        <div className="relative ml-auto">
          <select value={moduleFiltre} onChange={e => { setModuleFiltre(e.target.value); setPage(1); }}
            disabled={!!moduleScope}
            className="appearance-none rounded-md border border-gray-200 bg-white py-1 pl-3 pr-7 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300 cursor-pointer">
            {MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"/>
        </div>

        <div className="relative">
          <select value={typeFiltre} onChange={e => { setTypeFiltre(e.target.value); setPage(1); }}
            className="appearance-none rounded-md border border-gray-200 bg-white py-1 pl-3 pr-7 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300 cursor-pointer">
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"/>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600"/>
        </div>
      ) : alertes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-20">
          <Bell size={28} className="mb-3 text-gray-300"/>
          <p className="text-sm text-gray-400">Aucune alerte pour ce filtre</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alertes.map(a => (
            <AlerteCard key={a.id} a={a} canTraiter={canTraiter}
              onLue={marquerLue} onTraitee={marquerTraitee}/>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
            Précédent
          </button>
          <span className="text-xs text-gray-400">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}