import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { soumissionsAPI, alertesAPI, planningAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import {
  Eye, ChevronLeft, ChevronRight, FileText, Bell,
  CheckCircle, Activity, ChevronDown, Calendar, Download, Wrench, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUT_COLORS = {
  SOUMIS:    'badge-blue',
  BROUILLON: 'badge-gray',
  VALIDE:    'badge-green',
  REJETE:    'badge-red',
};
const MODULES  = [
  { value:'',            label:'Tous les modules' },
  { value:'MAINTENANCE', label:'Maintenance'       },
  { value:'PRODUCTION',  label:'Production'        },
];
const STATUTS  = [
  { value:'',          label:'Tous statuts' },
  { value:'SOUMIS',    label:'Soumis'       },
  { value:'BROUILLON', label:'Brouillon'    },
  { value:'VALIDE',    label:'Validé'       },
  { value:'REJETE',    label:'Rejeté'       },
];
const PERIODES = [
  { value:'',        label:'Toutes'         },
  { value:'jour',    label:"Aujourd'hui"    },
  { value:'semaine', label:'Cette semaine'  },
  { value:'mois',    label:'Ce mois'        },
  { value:'annee',   label:'Cette année'    },
];

export default function HistoriquePage() {
  const { isAdmin, moduleScope } = useAuth();
  const [activeTab, setActiveTab] = useState('soumissions');

  const [soumissions, setSoumissions]             = useState([]);
  const [soumissionsTotal, setSoumissionsTotal]   = useState(0);
  const [loadingSoumissions, setLoadingSoumissions] = useState(true);
  const [exporting, setExporting]                 = useState(false);
  const [page, setPage]       = useState(1);
  const [module, setModule]   = useState(moduleScope || '');
  const [statut, setStatut]   = useState('');
  const [periode, setPeriode] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin]     = useState('');

  const [alertes, setAlertes]               = useState([]);
  const [alertesTotal, setAlertesTotal]     = useState(0);
  const [loadingAlertes, setLoadingAlertes] = useState(false);
  const [alertesPage, setAlertesPage]       = useState(1);
  const [alerteType, setAlerteType]         = useState('');
  const [signalements, setSignalements]     = useState([]);
  const [loadingSignalements, setLoadingSignalements] = useState(false);

  const LIMIT = 20;

  const handlePeriodeChange = (value) => {
    setPeriode(value);
    const now = new Date();
    if (value === 'jour') {
      const d = format(now,'yyyy-MM-dd'); setDateDebut(d); setDateFin(d);
    } else if (value === 'semaine') {
      setDateDebut(format(new Date(now - 7*86400000),'yyyy-MM-dd'));
      setDateFin(format(now,'yyyy-MM-dd'));
    } else if (value === 'mois') {
      const d = new Date(now); d.setMonth(d.getMonth()-1);
      setDateDebut(format(d,'yyyy-MM-dd')); setDateFin(format(now,'yyyy-MM-dd'));
    } else if (value === 'annee') {
      const d = new Date(now); d.setFullYear(d.getFullYear()-1);
      setDateDebut(format(d,'yyyy-MM-dd')); setDateFin(format(now,'yyyy-MM-dd'));
    } else { setDateDebut(''); setDateFin(''); }
    setPage(1);
  };

  useEffect(() => {
    setLoadingSoumissions(true);
    soumissionsAPI.lister({
      page, limit: LIMIT,
      module:     module    || undefined,
      statut:     statut    || undefined,
      date_debut: dateDebut || undefined,
      date_fin:   dateFin   || undefined,
    })
      .then(r => { setSoumissions(r.data?.data||[]); setSoumissionsTotal(r.data?.meta?.total||0); })
      .catch(() => toast.error('Erreur chargement soumissions'))
      .finally(() => setLoadingSoumissions(false));
  }, [page, module, statut, dateDebut, dateFin]);

  useEffect(() => {
    if (activeTab !== 'alertes') return;
    setLoadingAlertes(true);
    alertesAPI.lister({ page:alertesPage, limit:LIMIT, statut:'TRAITEE',
      type_alerte:alerteType||undefined, module:moduleScope||undefined })
      .then(r => { setAlertes(r.data?.data||[]); setAlertesTotal(r.data?.total||0); })
      .catch(() => toast.error('Erreur chargement alertes'))
      .finally(() => setLoadingAlertes(false));
  }, [alertesPage, alerteType, activeTab, moduleScope]);

  useEffect(() => {
    if (activeTab !== 'signalements') return;
    setLoadingSignalements(true);
    planningAPI.listerSignalements()
      .then(r => setSignalements(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSignalements([]))
      .finally(() => setLoadingSignalements(false));
  }, [activeTab]);

  const totalPages         = Math.ceil(soumissionsTotal / LIMIT);
  const alertesTotalPages  = Math.ceil(alertesTotal / LIMIT);

  const resetFilters = () => {
    setModule(moduleScope||''); setStatut(''); setPeriode('');
    setDateDebut(''); setDateFin(''); setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await soumissionsAPI.exporter({
        module:     module    || undefined,
        statut:     statut    || undefined,
        date_debut: dateDebut || undefined,
        date_fin:   dateFin   || undefined,
      });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `historique_${format(new Date(),'yyyy-MM-dd')}.xlsx`);
      document.body.appendChild(link); link.click(); link.remove();
      toast.success('Export téléchargé !');
    } catch { toast.error('Erreur export'); }
    finally { setExporting(false); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Historique</h1>
          <p className="text-sm text-gray-400 mt-1">Soumissions, alertes résolues et actions</p>
        </div>
        {activeTab === 'soumissions' && (
          <button onClick={handleExport} disabled={exporting}
            className="btn-primary flex items-center gap-2">
            <Download size={15}/>
            {exporting ? 'Export…' : 'Exporter Excel'}
          </button>
        )}
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          {[
            { id:'soumissions',  icon:FileText,  label:'Soumissions',           count:soumissionsTotal },
            { id:'alertes',      icon:Bell,       label:'Alertes résolues',      count:alertesTotal     },
            { id:'signalements', icon:AlertTriangle, label:'Pannes signalées',   count:signalements.length },
            ...(isAdmin() ? [{ id:'actions', icon:Activity, label:'Actions utilisateurs', count:null }] : []),
          ].map(({ id, icon: Icon, label, count }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2
                ${activeTab===id ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon size={16}/>{label}
              {count !== null && <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">{count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Onglet Soumissions ──────────────────────────────────── */}
      {activeTab === 'soumissions' && (
        <>
          <div className="card space-y-3">
            <div className="flex flex-wrap gap-3 items-end">
              {[
                { label:'Module', val:module, set:v=>{setModule(v);setPage(1);}, opts:MODULES, w:'w-44', disabled:!!moduleScope },
                { label:'Statut', val:statut, set:v=>{setStatut(v);setPage(1);}, opts:STATUTS, w:'w-36' },
                { label:'Période',val:periode,set:handlePeriodeChange,            opts:PERIODES,w:'w-36' },
              ].map(({ label, val, set, opts, w, disabled }) => (
                <div key={label} className="relative">
                  <label className="label text-xs">{label}</label>
                  <select value={val} onChange={e=>set(e.target.value)} disabled={disabled}
                    className={`input ${w} appearance-none pr-8 cursor-pointer`}>
                    {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 bottom-3 text-gray-400 pointer-events-none"/>
                </div>
              ))}
              {[
                { label:'Date début', val:dateDebut, set:v=>{setDateDebut(v);setPeriode('');setPage(1);} },
                { label:'Date fin',   val:dateFin,   set:v=>{setDateFin(v);setPeriode('');setPage(1);}   },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="label text-xs flex items-center gap-1"><Calendar size={12}/>{label}</label>
                  <input type="date" value={val} onChange={e=>set(e.target.value)} className="input w-36"/>
                </div>
              ))}
              <button onClick={resetFilters} className="btn-secondary text-sm px-4 py-2">Réinitialiser</button>
            </div>
            <p className="text-xs text-gray-400">
              {soumissionsTotal} soumission{soumissionsTotal>1?'s':''} trouvée{soumissionsTotal>1?'s':''}
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
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Équipement</th>
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
                            ? format(new Date(s.date_soumission),'dd/MM/yyyy HH:mm',{locale:fr})
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800 text-sm truncate max-w-[180px]">
                            {s.formulaire_titre}
                          </div>
                          <span className="font-mono text-xs text-gray-400">{s.formulaire_code}</span>
                        </td>
                        <td className="px-4 py-3">
                          {s.equipement_nom ? (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <Wrench size={12} className="text-primary flex-shrink-0"/>
                              <span className="truncate max-w-[120px]">{s.equipement_nom}</span>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={s.module==='MAINTENANCE' ? 'badge-blue' : 'badge-green'}>
                            {s.module}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={STATUT_COLORS[s.statut]||'badge-gray'}>{s.statut}</span>
                            {s.statut === 'REJETE' && s.commentaire_rejet && (
                              <span title={s.commentaire_rejet} className="text-red-400 cursor-help text-xs">⚠</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {s.operateur_prenom} {s.operateur_nom}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link to={`/soumissions/${s.id}`}
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors inline-flex">
                            <Eye size={15}/>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Page {page} / {totalPages}
                </p>
                <div className="flex gap-2">
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}
                    className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30">
                    <ChevronLeft size={16}/>
                  </button>
                  <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}
                    className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30">
                    <ChevronRight size={16}/>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Onglet Alertes ─────────────────────────────────────── */}
      {activeTab === 'alertes' && (
        <div className="space-y-3">
          {loadingAlertes ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : alertes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Bell size={48} className="mx-auto mb-3 text-gray-200"/>
              <p>Aucune alerte résolue.</p>
            </div>
          ) : alertes.map(a => (
            <div key={a.id} className="card flex items-start gap-3">
              <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5"/>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{a.message}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {a.date_creation ? format(new Date(a.date_creation),'dd/MM/yyyy HH:mm',{locale:fr}) : ''}
                </p>
              </div>
            </div>
          ))}
          {alertesTotalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <button onClick={()=>setAlertesPage(p=>Math.max(1,p-1))} disabled={alertesPage<=1}
                className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30"><ChevronLeft size={16}/></button>
              <span className="text-xs text-gray-400 self-center">Page {alertesPage}/{alertesTotalPages}</span>
              <button onClick={()=>setAlertesPage(p=>Math.min(alertesTotalPages,p+1))} disabled={alertesPage>=alertesTotalPages}
                className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30"><ChevronRight size={16}/></button>
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Pannes signalées ────────────────────────────── */}
      {activeTab === 'signalements' && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-3">Date panne</th>
                  <th className="px-3 py-3">Signalé par</th>
                  <th className="px-3 py-3">Assigné à</th>
                  <th className="px-3 py-3">Observation</th>
                  <th className="px-3 py-3">Statut</th>
                  <th className="px-3 py-3">Date signalement</th>
                </tr>
              </thead>
              <tbody>
                {loadingSignalements ? (
                  <tr><td colSpan={6} className="py-12 text-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"/></td></tr>
                ) : signalements.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Aucun signalement.</td></tr>
                ) : signalements.map(sp => (
                  <tr key={sp.id} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="px-3 py-2.5">{sp.date_panne} {sp.heure_panne?.slice(0,5)}</td>
                    <td className="px-3 py-2.5">{sp.signaleur?.prenom} {sp.signaleur?.nom}</td>
                    <td className="px-3 py-2.5">{sp.assigne?.prenom} {sp.assigne?.nom}</td>
                    <td className="px-3 py-2.5 text-xs max-w-[200px] truncate">{sp.observation || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        sp.statut === 'signale' ? 'bg-amber-100 text-amber-700' :
                        sp.statut === 'planifie' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {sp.statut}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {new Date(sp.cree_le).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}