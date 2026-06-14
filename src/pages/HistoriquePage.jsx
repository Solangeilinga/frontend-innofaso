import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { soumissionsAPI, alertesAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import {
  Eye, ChevronLeft, ChevronRight, FileText, Bell,
  CheckCircle, Activity, ChevronDown, Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUT_COLORS = {
  SOUMIS:    'badge-blue',
  BROUILLON: 'badge-gray',
  VALIDE:    'badge-green',
  REJETE:    'badge-red',
};

const MODULES = [
  { value: '',             label: 'Tous les modules' },
  { value: 'MAINTENANCE',  label: 'Maintenance'       },
  { value: 'PRODUCTION',   label: 'Production'        },
];

const STATUTS = [
  { value: '',         label: 'Tous statuts' },
  { value: 'SOUMIS',   label: 'Soumis'       },
  { value: 'BROUILLON',label: 'Brouillon'    },
  { value: 'VALIDE',   label: 'Validé'       },
  { value: 'REJETE',   label: 'Rejeté'       },
];

const PERIODES = [
  { value: '',        label: "Toutes"          },
  { value: 'jour',    label: "Aujourd'hui"     },
  { value: 'semaine', label: "Cette semaine"   },
  { value: 'mois',    label: "Ce mois"         },
  { value: 'annee',   label: "Cette année"     },
];

const TYPE_ALERTE_CFG = {
  FORMULAIRE_EN_RETARD:   { label: '✅ Formulaire résolu',           badge: 'bg-green-100 text-green-700',  card: 'bg-green-50 border-green-100'  },
  MAINTENANCE_PREVENTIVE: { label: 'Maintenance préventive',         badge: 'bg-blue-100 text-blue-700',    card: 'bg-blue-50 border-blue-100'    },
  PANNE_CRITIQUE:         { label: 'Panne critique',                  badge: 'bg-red-100 text-red-700',      card: 'bg-red-50 border-red-100'      },
  STOCK_BAS:              { label: 'Stock bas pièces',               badge: 'bg-yellow-100 text-yellow-700',card: 'bg-yellow-50 border-yellow-100'},
  STOCK_MP_BAS:           { label: 'Stock bas matières premières',   badge: 'bg-amber-100 text-amber-700',  card: 'bg-amber-50 border-amber-100'  },
};

export default function HistoriquePage() {
  const { isAdmin, moduleScope } = useAuth();
  const [activeTab, setActiveTab] = useState('soumissions');

  // ── Soumissions ───────────────────────────────────────────────
  const [soumissions, setSoumissions]       = useState([]);
  const [soumissionsTotal, setSoumissionsTotal] = useState(0);
  const [loadingSoumissions, setLoadingSoumissions] = useState(true);
  const [page, setPage]           = useState(1);
  const [module, setModule]       = useState(moduleScope || '');
  const [statut, setStatut]       = useState('');
  const [periode, setPeriode]     = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin]     = useState('');

  // ── Alertes traitées ─────────────────────────────────────────
  const [alertes, setAlertes]             = useState([]);
  const [alertesTotal, setAlertesTotal]   = useState(0);
  const [loadingAlertes, setLoadingAlertes] = useState(false);
  const [alertesPage, setAlertesPage]     = useState(1);
  const [alerteType, setAlerteType]       = useState('');

  const LIMIT = 20;

  // ── Gestion des périodes ─────────────────────────────────────
  const handlePeriodeChange = (value) => {
    setPeriode(value);
    const now = new Date();
    if (value === 'jour') {
      const d = format(now, 'yyyy-MM-dd');
      setDateDebut(d); setDateFin(d);
    } else if (value === 'semaine') {
      setDateDebut(format(new Date(now - 7 * 86400000), 'yyyy-MM-dd'));
      setDateFin(format(new Date(), 'yyyy-MM-dd'));
    } else if (value === 'mois') {
      const d = new Date(now); d.setMonth(d.getMonth() - 1);
      setDateDebut(format(d, 'yyyy-MM-dd'));
      setDateFin(format(new Date(), 'yyyy-MM-dd'));
    } else if (value === 'annee') {
      const d = new Date(now); d.setFullYear(d.getFullYear() - 1);
      setDateDebut(format(d, 'yyyy-MM-dd'));
      setDateFin(format(new Date(), 'yyyy-MM-dd'));
    } else {
      setDateDebut(''); setDateFin('');
    }
    setPage(1);
  };

  // ── Charger les soumissions ───────────────────────────────────
  useEffect(() => {
    setLoadingSoumissions(true);
    soumissionsAPI.lister({
      page, limit: LIMIT,
      module:     module   || undefined,
      statut:     statut   || undefined,
      date_debut: dateDebut || undefined,
      date_fin:   dateFin   || undefined,
    })
      .then(r => {
        setSoumissions(r.data?.data || []);
        setSoumissionsTotal(r.data?.meta?.total || 0);
      })
      .catch(() => toast.error('Erreur chargement soumissions'))
      .finally(() => setLoadingSoumissions(false));
  }, [page, module, statut, dateDebut, dateFin]);

  // ── Charger les alertes traitées ──────────────────────────────
  useEffect(() => {
    if (activeTab !== 'alertes') return;
    setLoadingAlertes(true);
    alertesAPI.lister({
      page:        alertesPage,
      limit:       LIMIT,
      statut:      'TRAITEE',
      type_alerte: alerteType   || undefined,
      module:      moduleScope  || undefined,
    })
      .then(r => {
        setAlertes(r.data?.data || []);
        setAlertesTotal(r.data?.total || 0);
      })
      .catch(() => toast.error('Erreur chargement alertes'))
      .finally(() => setLoadingAlertes(false));
  }, [alertesPage, alerteType, activeTab, moduleScope]);

  const totalPages       = Math.ceil(soumissionsTotal / LIMIT);
  const alertesTotalPages = Math.ceil(alertesTotal / LIMIT);

  const resetFilters = () => {
    setModule(moduleScope || '');
    setStatut(''); setPeriode('');
    setDateDebut(''); setDateFin('');
    setPage(1);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Historique</h1>
        <p className="text-sm text-gray-400 mt-1">
          Consultez l'historique des soumissions et des alertes résolues
        </p>
      </div>

      {/* ── Onglets ─────────────────────────────────────────────── */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          {[
            { id: 'soumissions', icon: FileText,  label: 'Soumissions',      count: soumissionsTotal },
            { id: 'alertes',     icon: Bell,       label: 'Alertes résolues', count: alertesTotal     },
            ...(isAdmin() ? [{ id: 'actions', icon: Activity, label: 'Actions utilisateurs', count: null }] : []),
          ].map(({ id, icon: Icon, label, count }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2
                ${activeTab === id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Icon size={16}/>
              {label}
              {count !== null && (
                <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">{count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Onglet Soumissions ───────────────────────────────────── */}
      {activeTab === 'soumissions' && (
        <>
          <div className="card space-y-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="relative">
                <label className="label text-xs">Module</label>
                <select value={module}
                  onChange={e => { setModule(e.target.value); setPage(1); }}
                  className="input w-44 appearance-none pr-8 cursor-pointer"
                  disabled={!!moduleScope}>
                  {MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 bottom-3 text-gray-400 pointer-events-none"/>
              </div>
              <div className="relative">
                <label className="label text-xs">Statut</label>
                <select value={statut}
                  onChange={e => { setStatut(e.target.value); setPage(1); }}
                  className="input w-36 appearance-none pr-8 cursor-pointer">
                  {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 bottom-3 text-gray-400 pointer-events-none"/>
              </div>
              <div className="relative">
                <label className="label text-xs">Période</label>
                <select value={periode} onChange={e => handlePeriodeChange(e.target.value)}
                  className="input w-36 appearance-none pr-8 cursor-pointer">
                  {PERIODES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 bottom-3 text-gray-400 pointer-events-none"/>
              </div>
              <div>
                <label className="label text-xs flex items-center gap-1"><Calendar size={12}/> Date début</label>
                <input type="date" value={dateDebut}
                  onChange={e => { setDateDebut(e.target.value); setPeriode(''); setPage(1); }}
                  className="input w-36"/>
              </div>
              <div>
                <label className="label text-xs flex items-center gap-1"><Calendar size={12}/> Date fin</label>
                <input type="date" value={dateFin}
                  onChange={e => { setDateFin(e.target.value); setPeriode(''); setPage(1); }}
                  className="input w-36"/>
              </div>
              <button onClick={resetFilters} className="btn-secondary text-sm px-4 py-2">
                Réinitialiser
              </button>
            </div>

            {(dateDebut || dateFin) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500">Filtres actifs :</span>
                {dateDebut && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                  Du {format(new Date(dateDebut), 'dd/MM/yyyy')}</span>}
                {dateFin && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                  Au {format(new Date(dateFin), 'dd/MM/yyyy')}</span>}
              </div>
            )}
            <p className="text-xs text-gray-400">
              {soumissionsTotal} soumission{soumissionsTotal > 1 ? 's' : ''} trouvée{soumissionsTotal > 1 ? 's' : ''}
            </p>
          </div>

          <div className="card p-0 overflow-hidden">
            {loadingSoumissions ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : soumissions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FileText size={48} className="mx-auto mb-3 text-gray-200"/>
                <p>Aucune soumission trouvée.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Formulaire</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Module</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Opérateur</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {soumissions.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {s.date_soumission
                            ? format(new Date(s.date_soumission), 'dd/MM/yyyy HH:mm', { locale: fr })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800 text-sm truncate max-w-[200px]">
                            {s.formulaire_titre}
                          </div>
                          <span className="font-mono text-xs text-gray-400">{s.formulaire_code}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={s.module === 'MAINTENANCE' ? 'badge-blue' : 'badge-green'}>
                            {s.module}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={STATUT_COLORS[s.statut] || 'badge-gray'}>{s.statut}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {s.operateur_prenom} {s.operateur_nom}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link to={`/soumissions/${s.id}`}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors inline-block"
                            title="Voir détail">
                            <Eye size={15} className="text-gray-500"/>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                <ChevronLeft size={18}/>
              </button>
              <span className="text-sm text-gray-600">Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                <ChevronRight size={18}/>
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Onglet Alertes résolues ──────────────────────────────── */}
      {activeTab === 'alertes' && (
        <>
          {/* Bandeau explicatif */}
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
            <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-medium text-green-800">Résolution automatique</p>
              <p className="text-xs text-green-600 mt-0.5">
                Quand un formulaire en retard est soumis, son alerte est automatiquement
                résolue et apparaît ici. Les autres alertes (stock, pannes) apparaissent
                après traitement manuel.
              </p>
            </div>
          </div>

          <div className="card space-y-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="relative flex-1 min-w-[200px]">
                <label className="label text-xs">Type d'alerte</label>
                <select value={alerteType}
                  onChange={e => { setAlerteType(e.target.value); setAlertesPage(1); }}
                  className="input w-full appearance-none pr-8 cursor-pointer">
                  <option value="">Tous les types</option>
                  <option value="FORMULAIRE_EN_RETARD">✅ Formulaire résolu</option>
                  <option value="MAINTENANCE_PREVENTIVE">Maintenance préventive</option>
                  <option value="PANNE_CRITIQUE">Panne critique</option>
                  <option value="STOCK_BAS">Stock bas pièces</option>
                  <option value="STOCK_MP_BAS">Stock bas matières premières</option>
                </select>
                <ChevronDown size={14} className="absolute right-2 bottom-3 text-gray-400 pointer-events-none"/>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              {alertesTotal} alerte{alertesTotal > 1 ? 's' : ''} résolue{alertesTotal > 1 ? 's' : ''}
            </p>
          </div>

          <div className="space-y-2">
            {loadingAlertes ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : alertes.length === 0 ? (
              <div className="card text-center py-12 text-gray-400">
                <CheckCircle size={48} className="mx-auto mb-3 text-gray-200"/>
                <p>Aucune alerte résolue trouvée.</p>
                <p className="text-xs mt-2 text-gray-300">
                  Les alertes sont résolues automatiquement quand les formulaires sont soumis.
                </p>
              </div>
            ) : alertes.map(a => {
              const cfg = TYPE_ALERTE_CFG[a.type_alerte] || {
                label: a.type_alerte,
                badge: 'bg-gray-100 text-gray-700',
                card:  'bg-gray-50 border-gray-100',
              };
              return (
                <div key={a.id} className={`card p-4 border ${cfg.card}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(a.date_creation), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-snug">{a.message}</p>
                      {a.type_alerte === 'FORMULAIRE_EN_RETARD' && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <CheckCircle size={11}/> Résolu — formulaire soumis
                        </p>
                      )}
                    </div>
                    <CheckCircle size={20} className="text-green-400 shrink-0 mt-0.5"/>
                  </div>
                </div>
              );
            })}
          </div>

          {alertesTotalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setAlertesPage(p => Math.max(1, p-1))}
                disabled={alertesPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                <ChevronLeft size={18}/>
              </button>
              <span className="text-sm text-gray-600">Page {alertesPage} / {alertesTotalPages}</span>
              <button onClick={() => setAlertesPage(p => Math.min(alertesTotalPages, p+1))}
                disabled={alertesPage === alertesTotalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                <ChevronRight size={18}/>
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Onglet Actions utilisateurs ──────────────────────────── */}
      {activeTab === 'actions' && isAdmin() && (
        <div className="card p-8 text-center text-gray-400">
          <Activity size={48} className="mx-auto mb-3 text-gray-200"/>
          <p className="text-sm">Module en développement.</p>
          <p className="text-xs mt-2">
            Prochainement : historique des connexions, modifications, validations, etc.
          </p>
        </div>
      )}
    </div>
  );
}