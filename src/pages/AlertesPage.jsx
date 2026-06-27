import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { alertesAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import {
  Bell, CheckCheck, AlertTriangle, Zap, Wrench,
  RefreshCw, FileWarning, ChevronDown, Package,
  Circle, CheckCircle2, Clock, ArrowRight, Filter,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Configuration des types d'alertes ────────────────────────────
const TYPE_CFG = {
  MAINTENANCE_PREVENTIVE: {
    icon: Wrench,
    label: 'Maintenance préventive',
    severity: 'info',
    lien: '/planning',
    lienLabel: 'Voir le planning',
  },
  FORMULAIRE_EN_RETARD: {
    icon: FileWarning,
    label: 'Formulaire en retard',
    severity: 'warning',
    lien: '/formulaires',
    lienLabel: 'Accéder aux formulaires',
  },
  PANNE_CRITIQUE: {
    icon: Zap,
    label: 'Panne critique',
    severity: 'critical',
    lien: '/equipements',
    lienLabel: 'Voir les équipements',
  },
  MAINTENANCE_CORRECTIVE: {
    icon: Wrench,
    label: 'Maintenance corrective',
    severity: 'warning',
    lien: '/plannification',
    lienLabel: 'Planifier',
  },
  STOCK_BAS: {
    icon: Package,
    label: 'Stock pièces insuffisant',
    severity: 'warning',
    lien: '/stock',
    lienLabel: 'Gérer le stock',
  },
  VALIDATION: {
    icon: CheckCircle2,
    label: 'Validation requise',
    severity: 'info',
    lien: '/soumissions',
    lienLabel: 'Voir les soumissions',
  },
};

// ── Severity styles ───────────────────────────────────────────────
const SEVERITY = {
  critical: {
    bar:    'bg-red-500',
    icon:   'text-red-600',
    badge:  'bg-red-50 text-red-700 ring-red-100',
  },
  warning: {
    bar:    'bg-amber-400',
    icon:   'text-amber-600',
    badge:  'bg-amber-50 text-amber-700 ring-amber-100',
  },
  info: {
    bar:    'bg-blue-400',
    icon:   'text-slate-500',
    badge:  'bg-slate-50 text-slate-600 ring-slate-100',
  },
};

const STATUT_CFG = {
  NON_LUE: { label: 'Non lue',  dot: 'bg-blue-500' },
  LUE:     { label: 'Lue',      dot: 'bg-slate-300' },
  TRAITEE: { label: 'Traitée',  dot: 'bg-green-500' },
};

const MODULES = [
  { value: '', label: 'Tous les modules' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'PRODUCTION',  label: 'Production'  },
];

const TYPES = [
  { value: '', label: 'Tous les types' },
  ...Object.entries(TYPE_CFG).map(([value, c]) => ({ value, label: c.label })),
];

// ── Carte alerte ─────────────────────────────────────────────────
function AlerteCard({ a, onMarquerLue, onMarquerTraitee, canTraiter }) {
  const cfg  = TYPE_CFG[a.type_alerte] || { icon: Bell, label: a.type_alerte, severity: 'info' };
  const sev  = SEVERITY[cfg.severity] || SEVERITY.info;
  const Icon = cfg.icon;
  const isNonLue  = a.statut === 'NON_LUE';
  const isLue     = a.statut === 'LUE';

  return (
    <div className={`relative flex gap-4 rounded-xl border bg-white px-5 py-4 transition-all
      ${isNonLue ? 'border-slate-200 shadow-sm' : 'border-slate-100 opacity-65'}`}>

      {/* Barre de sévérité gauche */}
      <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full ${sev.bar}`}/>

      {/* Icône type */}
      <div className="flex-shrink-0 mt-0.5">
        <Icon size={16} className={sev.icon}/>
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Ligne 1 : type + temps */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${sev.badge}`}>
              {cfg.label}
            </span>
            {a.module && (
              <span className="text-xs text-slate-400 font-medium">
                {a.module === 'MAINTENANCE' ? 'Maintenance' : 'Production'}
              </span>
            )}
          </div>
          <span className="flex-shrink-0 text-xs text-slate-400">
            {formatDistanceToNow(new Date(a.date_creation), { addSuffix: true, locale: fr })}
          </span>
        </div>

        {/* Ligne 2 : message */}
        <p className="text-sm text-slate-700 leading-relaxed">{a.message}</p>

        {/* Ligne 3 : contexte équipement / formulaire */}
        {(a.equipement_nom || a.formulaire_titre) && (
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {a.equipement_nom  && <span>{a.equipement_nom}</span>}
            {a.equipement_nom && a.formulaire_titre && <span className="text-slate-200">·</span>}
            {a.formulaire_titre && <span>{a.formulaire_titre}</span>}
          </div>
        )}

        {/* Ligne 4 : actions */}
        <div className="flex items-center gap-4 pt-0.5">
          {cfg.lien && (
            <Link to={cfg.lien}
              className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors">
              {cfg.lienLabel}
              <ArrowRight size={11}/>
            </Link>
          )}
          {isNonLue && (
            <button onClick={() => onMarquerLue(a.id)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Marquer comme lu
            </button>
          )}
          {isLue && canTraiter && (
            <button onClick={() => onMarquerTraitee(a.id)}
              className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 transition-colors">
              <CheckCircle2 size={11}/>
              Marquer traité
            </button>
          )}
          <span className="ml-auto text-xs text-slate-300">
            {format(new Date(a.date_creation), 'dd/MM/yyyy HH:mm', { locale: fr })}
          </span>
        </div>
      </div>

      {/* Dot non lue */}
      {isNonLue && (
        <div className="flex-shrink-0 mt-1.5">
          <span className="block w-2 h-2 rounded-full bg-blue-500"/>
        </div>
      )}
    </div>
  );
}

// ── Bandeau synthèse ─────────────────────────────────────────────
function BandeauSynthese({ counts }) {
  if (!counts.critique && !counts.retard && !counts.stock) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {counts.critique > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
          <Zap size={14} className="text-red-600 flex-shrink-0"/>
          <span className="text-sm font-semibold text-red-700">
            {counts.critique} panne{counts.critique > 1 ? 's' : ''} critique{counts.critique > 1 ? 's' : ''}
          </span>
        </div>
      )}
      {counts.retard > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
          <Clock size={14} className="text-amber-600 flex-shrink-0"/>
          <span className="text-sm font-semibold text-amber-700">
            {counts.retard} formulaire{counts.retard > 1 ? 's' : ''} en retard
          </span>
        </div>
      )}
      {counts.stock > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
          <Package size={14} className="text-slate-600 flex-shrink-0"/>
          <span className="text-sm font-semibold text-slate-700">
            {counts.stock} alerte{counts.stock > 1 ? 's' : ''} de stock
          </span>
        </div>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────
export default function AlertesPage() {
  const { peutValider, moduleScope } = useAuth();
  const canTraiter = peutValider();

  const [alertes, setAlertes]       = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [syncing, setSyncing]       = useState(false);
  const [filtre, setFiltre]         = useState('NON_LUE');
  const [typeFiltre, setTypeFiltre] = useState('');
  const [moduleFiltre, setModuleFiltre] = useState(moduleScope || '');
  const [page, setPage]             = useState(1);
  const LIMIT = 20;

  const load = () => {
    setLoading(true);
    alertesAPI.lister({
      statut:      filtre      || undefined,
      type_alerte: typeFiltre  || undefined,
      module:      moduleFiltre|| undefined,
      page, limit: LIMIT,
    })
      .then(r => {
        setAlertes(r.data?.data || r.data || []);
        setTotal(r.data?.total || 0);
      })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filtre, typeFiltre, moduleFiltre, page]);

  const refresh = () => {
    setSyncing(true);
    load();
    setSyncing(false);
    toast.success('Alertes actualisées');
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
      toast.success('Alerte traitée');
    } catch { toast.error('Erreur'); }
  };

  const toutesLues = async () => {
    try {
      await alertesAPI.toutesLues();
      setAlertes(prev => prev.map(a => ({ ...a, statut: 'LUE' })));
      toast.success('Toutes les alertes marquées comme lues');
    } catch { toast.error('Erreur'); }
  };

  const nonLues = alertes.filter(a => a.statut === 'NON_LUE');
  const counts  = {
    critique: nonLues.filter(a => a.type_alerte === 'PANNE_CRITIQUE').length,
    retard:   nonLues.filter(a => a.type_alerte === 'FORMULAIRE_EN_RETARD').length,
    stock:    nonLues.filter(a => ['STOCK_BAS', 'STOCK_MP_BAS'].includes(a.type_alerte)).length,
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="mx-auto max-w-3xl space-y-5">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Alertes</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {total} alerte{total > 1 ? 's' : ''} · {nonLues.length} non lue{nonLues.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filtre === 'NON_LUE' && nonLues.length > 0 && (
            <button onClick={toutesLues}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              <CheckCheck size={13}/>
              Tout marquer lu
            </button>
          )}
          <button onClick={refresh} disabled={syncing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''}/>
            Actualiser
          </button>
        </div>
      </div>

      {/* Synthèse critique */}
      {filtre === 'NON_LUE' && <BandeauSynthese counts={counts}/>}

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={13} className="text-slate-400 flex-shrink-0"/>

        {['NON_LUE', 'LUE', 'TRAITEE', ''].map(s => (
          <button key={s}
            onClick={() => { setFiltre(s); setPage(1); }}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              filtre === s
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {s === 'NON_LUE' ? 'Non lues' : s === 'LUE' ? 'Lues' : s === 'TRAITEE' ? 'Traitées' : 'Toutes'}
          </button>
        ))}

        <div className="relative ml-auto">
          <select value={moduleFiltre}
            onChange={e => { setModuleFiltre(e.target.value); setPage(1); }}
            disabled={!!(moduleScope)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1 pr-7 text-xs text-slate-600 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-300">
            {MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
        </div>

        <div className="relative">
          <select value={typeFiltre}
            onChange={e => { setTypeFiltre(e.target.value); setPage(1); }}
            className="rounded-md border border-slate-200 bg-white px-3 py-1 pr-7 text-xs text-slate-600 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-300">
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600"/>
        </div>
      ) : alertes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-20 text-center">
          <Bell size={28} className="mb-3 text-slate-300"/>
          <p className="text-sm text-slate-400">Aucune alerte pour ce filtre</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alertes.map(a => (
            <AlerteCard
              key={a.id}
              a={a}
              canTraiter={canTraiter}
              onMarquerLue={marquerLue}
              onMarquerTraitee={marquerTraitee}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
            Précédent
          </button>
          <span className="text-xs text-slate-400">
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}