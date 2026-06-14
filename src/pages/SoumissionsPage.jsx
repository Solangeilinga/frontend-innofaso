import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { soumissionsAPI, formulairesAPI, downloadExcel } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import { Eye, ChevronLeft, ChevronRight, Download, CheckCircle, XCircle, ChevronDown, Calendar } from 'lucide-react';
import { format, subDays, subWeeks, subMonths, subYears } from 'date-fns';
import { fr } from 'date-fns/locale';

const SC = { VALIDE:'badge-green', SOUMIS:'badge-blue', BROUILLON:'badge-gray', REJETE:'badge-red' };
const MC = { MAINTENANCE:'badge-blue', PRODUCTION:'badge-green' };
const MODULES = [{ value:'MAINTENANCE', label:'Maintenance' }, { value:'PRODUCTION', label:'Production' }];
const STATUTS = [
  { value:'SOUMIS', label:'Soumis' }, { value:'BROUILLON', label:'Brouillon' },
  { value:'VALIDE', label:'Validé' }, { value:'REJETE', label:'Rejeté' }
];
const PERIODES = [
  { value: '', label: 'Toutes' },
  { value: 'jour', label: 'Aujourd\'hui' },
  { value: 'semaine', label: 'Cette semaine' },
  { value: 'mois', label: 'Ce mois' },
  { value: 'annee', label: 'Cette année' }
];

function ModalValider({ soumission, onClose, onDone }) {
  const [statut, setStatut] = useState('VALIDE');
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await soumissionsAPI.valider(soumission.id, { statut, commentaire });
      toast.success(`Soumission ${statut === 'VALIDE' ? 'validée' : 'rejetée'} !`);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md p-6 space-y-4">
        <h3 className="font-display text-lg font-bold">Valider / Rejeter la soumission</h3>
        <p className="text-sm text-gray-500">{soumission.formulaire_titre}</p>
        <div>
          <label className="label">Décision</label>
          <div className="relative">
            <select value={statut} onChange={e => setStatut(e.target.value)}
              className="input appearance-none pr-10 cursor-pointer">
              <option value="VALIDE">✅ Valider</option>
              <option value="REJETE">❌ Rejeter</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
          </div>
        </div>
        <div>
          <label className="label">Commentaire (optionnel)</label>
          <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)}
            rows={3} className="input resize-none" placeholder="Raison du rejet, observation…"/>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={submit} disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-opacity
              ${statut === 'VALIDE' ? 'bg-green-600 hover:opacity-90' : 'bg-red-600 hover:opacity-90'}`}>
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> :
              statut === 'VALIDE' ? <><CheckCircle size={16}/> Valider</> : <><XCircle size={16}/> Rejeter</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SoumissionsPage() {
  const { isAdmin, peutValider, moduleScope } = useAuth();
  const adminUser = isAdmin();
  const canValider = peutValider();
  const [searchParams] = useSearchParams();
  const initialFormulaireId = searchParams.get('formulaire_id') || searchParams.get('formulaire') || '';
  const initialModule = searchParams.get('module') || '';

  const [data, setData] = useState({ data:[], meta:{ total:0, totalPages:1 } });
  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState('');
  const [module, setModule] = useState(initialModule);
  const [formulaireId, setFormulaireId] = useState(initialFormulaireId);
  const [formulaires, setFormulaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [modalValider, setModalValider] = useState(null);
  
  // ✅ AJOUT : États pour les filtres de période
  const [periode, setPeriode] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  // ✅ AJOUT : Fonction pour gérer le changement de période
  const handlePeriodeChange = (value) => {
    setPeriode(value);
    const now = new Date();
    switch(value) {
      case 'jour':
        setDateDebut(format(now, 'yyyy-MM-dd'));
        setDateFin(format(now, 'yyyy-MM-dd'));
        break;
      case 'semaine':
        setDateDebut(format(subDays(now, 7), 'yyyy-MM-dd'));
        setDateFin(format(now, 'yyyy-MM-dd'));
        break;
      case 'mois':
        setDateDebut(format(subMonths(now, 1), 'yyyy-MM-dd'));
        setDateFin(format(now, 'yyyy-MM-dd'));
        break;
      case 'annee':
        setDateDebut(format(subYears(now, 1), 'yyyy-MM-dd'));
        setDateFin(format(now, 'yyyy-MM-dd'));
        break;
      default:
        setDateDebut('');
        setDateFin('');
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    soumissionsAPI.lister({ 
      page, limit: 15,
      statut: statut || undefined, 
      module: module || undefined,
      formulaire_type_id: formulaireId || undefined,
      date_debut: dateDebut || undefined,
      date_fin: dateFin || undefined
    })
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, statut, module, formulaireId, dateDebut, dateFin]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (adminUser && moduleScope) setModule(moduleScope); }, [adminUser, moduleScope]);
  useEffect(() => {
    formulairesAPI.lister({ actif: true, module: module || undefined })
      .then(r => setFormulaires(r.data || [])).catch(() => setFormulaires([]));
  }, [module]);

  const handleModuleChange = (v) => { setModule(v); setFormulaireId(''); setPage(1); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await soumissionsAPI.exporter({ 
        statut: statut || undefined, 
        module: module || undefined, 
        formulaire_type_id: formulaireId || undefined,
        date_debut: dateDebut || undefined,
        date_fin: dateFin || undefined
      });
      downloadExcel(res.data, `soumissions_${new Date().toISOString().slice(0,10)}.xlsx`);
      toast.success('Export Excel téléchargé !');
    } catch { toast.error('Erreur lors de l\'export'); }
    finally { setExporting(false); }
  };

  const rows = data.data || [];
  const meta = data.meta || {};
  const totalPages = meta.totalPages || Math.ceil((meta.total || 0) / 15) || 1;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {modalValider && (
        <ModalValider
          soumission={modalValider}
          onClose={() => setModalValider(null)}
          onDone={() => { setModalValider(null); load(); }}
        />
      )}

      {/* Filtres */}
      <div className="card space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Module */}
          <div className="relative">
            <label className="label text-xs">Module</label>
            <select value={module} onChange={e => handleModuleChange(e.target.value)}
              disabled={adminUser && moduleScope}
              className="input w-44 appearance-none pr-8 cursor-pointer disabled:opacity-60">
              {!(adminUser && moduleScope) && <option value="">Tous les modules</option>}
              {MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 bottom-3 text-gray-400 pointer-events-none"/>
          </div>
          
          {/* ✅ AJOUT : Filtre période */}
          <div className="relative">
            <label className="label text-xs">Période</label>
            <select 
              value={periode} 
              onChange={e => handlePeriodeChange(e.target.value)}
              className="input w-36 appearance-none pr-8 cursor-pointer"
            >
              {PERIODES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 bottom-3 text-gray-400 pointer-events-none"/>
          </div>

          {/* Date début */}
          <div>
            <label className="label text-xs flex items-center gap-1">
              <Calendar size={12}/> Date début
            </label>
            <input 
              type="date" 
              value={dateDebut} 
              onChange={e => { setDateDebut(e.target.value); setPeriode(''); }}
              className="input w-36"
            />
          </div>

          {/* Date fin */}
          <div>
            <label className="label text-xs flex items-center gap-1">
              <Calendar size={12}/> Date fin
            </label>
            <input 
              type="date" 
              value={dateFin} 
              onChange={e => { setDateFin(e.target.value); setPeriode(''); }}
              className="input w-36"
            />
          </div>

          {/* Formulaire */}
          <div className="relative flex-1 min-w-[200px]">
            <label className="label text-xs">Formulaire</label>
            <select value={formulaireId} onChange={e => { setFormulaireId(e.target.value); setPage(1); }}
              className="input w-full appearance-none pr-8 cursor-pointer">
              <option value="">Tous les formulaires</option>
              {formulaires.map(f => <option key={f.id} value={f.id}>{f.titre}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 bottom-3 text-gray-400 pointer-events-none"/>
          </div>

          {/* Statut */}
          <div className="relative">
            <label className="label text-xs">Statut</label>
            <select value={statut} onChange={e => { setStatut(e.target.value); setPage(1); }}
              className="input w-36 appearance-none pr-8 cursor-pointer">
              <option value="">Tous statuts</option>
              {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 bottom-3 text-gray-400 pointer-events-none"/>
          </div>

          {/* Export Excel */}
          <div className="ml-auto">
            <label className="label text-xs opacity-0">a</label>
            <button onClick={handleExport} disabled={exporting}
              className="btn-secondary flex items-center gap-2 whitespace-nowrap disabled:opacity-60">
              {exporting
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                : <Download size={16}/>}
              Exporter Excel
            </button>
          </div>
        </div>
        
        {/* ✅ AJOUT : Affichage des filtres actifs */}
        {(dateDebut || dateFin) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">Filtres actifs :</span>
            {dateDebut && (
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                Du {format(new Date(dateDebut), 'dd/MM/yyyy')}
              </span>
            )}
            {dateFin && (
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                Au {format(new Date(dateFin), 'dd/MM/yyyy')}
              </span>
            )}
            {(dateDebut || dateFin) && (
              <button 
                onClick={() => { setDateDebut(''); setDateFin(''); setPeriode(''); }}
                className="text-xs text-red-500 hover:underline"
              >
                Effacer
              </button>
            )}
          </div>
        )}

        <p className="text-xs text-gray-400">{meta.total || 0} soumission{(meta.total||0)>1?'s':''} trouvée{(meta.total||0)>1?'s':''}</p>
      </div>

      {/* Tableau */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
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
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Équipement</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {s.date_soumission ? format(new Date(s.date_soumission), 'dd/MM/yyyy HH:mm', { locale: fr }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800 text-xs leading-snug max-w-[220px] truncate">{s.formulaire_titre}</div>
                      <span className="font-mono text-xs text-gray-400">{s.formulaire_code}</span>
                    </td>
                    <td className="px-4 py-3"><span className={MC[s.module]||'badge-gray'}>{s.module}</span></td>
                    <td className="px-4 py-3"><span className={SC[s.statut]||'badge-gray'}>{s.statut}</span></td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.operateur_prenom} {s.operateur_nom}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.equipement_nom || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/soumissions/${s.id}`} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Voir détail">
                          <Eye size={15} className="text-gray-500"/>
                        </Link>
                        {canValider && s.statut === 'SOUMIS' && (
                          <button onClick={() => setModalValider(s)}
                            className="flex items-center gap-1 text-xs px-2 py-1 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                            <CheckCircle size={13}/> Valider
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
            <ChevronLeft size={18}/>
          </button>
          <span className="text-sm text-gray-600">Page {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
            <ChevronRight size={18}/>
          </button>
        </div>
      )}
    </div>
  );
}