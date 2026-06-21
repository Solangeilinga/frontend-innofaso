import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formulairesAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import { Search, Plus, FilePlus, Settings, Clock, X, History, Archive, ChevronDown, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const freqBadge = {
  JOURNALIER:'badge-blue', HEBDO:'badge-green', MENSUEL:'badge-yellow',
  TRIMESTRIEL:'badge-orange', SEMESTRIEL:'badge-red', ANNUEL:'badge-gray', AU_BESOIN:'badge-purple'
};
const FREQUENCES = ['JOURNALIER','HEBDO','MENSUEL','TRIMESTRIEL','SEMESTRIEL','ANNUEL','AU_BESOIN'];
const MODULES    = ['MAINTENANCE','PRODUCTION'];

function ModalCreer({ onClose, onCreated }) {
  const [form, setForm] = useState({ code:'', titre:'', module:'MAINTENANCE', frequence:'MENSUEL', description:'' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(p => ({...p,[k]:v}));

  const submit = async e => {
    e.preventDefault();
    if (!form.code || !form.titre) return toast.error('Code et titre requis');
    setLoading(true);
    try {
      const { data } = await formulairesAPI.creer(form);
      toast.success('Formulaire créé !');
      onCreated(data.id);
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Erreur lors de la création');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-bold">Nouveau formulaire</h3>
          <button onClick={onClose}><X size={18} className="text-gray-500"/></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label-req">Code</label>
            <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())}
              placeholder="ex: MAINT-QUOT-001" className="input font-mono"/>
            <p className="text-xs text-gray-400 mt-1">Identifiant unique, sera mis en majuscules</p>
          </div>
          <div>
            <label className="label-req">Titre</label>
            <input value={form.titre} onChange={e => set('titre', e.target.value)}
              placeholder="ex: Contrôle quotidien groupe électrogène" className="input"/>
          </div>
          <div>
            <label className="label">Description (optionnel)</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} placeholder="Objectif ou contexte du formulaire…" className="input resize-none"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-req">Module</label>
              <div className="relative">
                <select value={form.module} onChange={e => set('module', e.target.value)}
                  className="input appearance-none pr-8 cursor-pointer">
                  {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
              </div>
            </div>
            <div>
              <label className="label-req">Fréquence</label>
              <div className="relative">
                <select value={form.frequence} onChange={e => set('frequence', e.target.value)}
                  className="input appearance-none pr-8 cursor-pointer">
                  {FREQUENCES.map(f => <option key={f} value={f}>{f.charAt(0)+f.slice(1).toLowerCase().replace('_',' ')}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Création…' : 'Créer et configurer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FormulaireListPage() {
  const { peutGerer, moduleScope, isAdmin } = useAuth();
  const canManage = peutGerer();
  const navigate = useNavigate();
  const [formulaires, setFormulaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [module, setModule] = useState(moduleScope || '');
  const [frequence, setFrequence] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    setLoading(true);
    formulairesAPI.lister({
      search: search||undefined,
      module: module||undefined,
      frequence: frequence||undefined,
      actif: showArchived ? 'false' : true
    })
      .then(r => setFormulaires(r.data?.data || (Array.isArray(r.data) ? r.data : [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, module, frequence, showArchived]);

  const handleArchiver = async (f) => {
    if (!confirm(`Archiver "${f.titre}" ? Il ne sera plus accessible pour remplissage.`)) return;
    try {
      await formulairesAPI.supprimer(f.id);
      toast.success('Formulaire archivé.');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  // ✅ NOUVELLE FONCTION : Restaurer un formulaire
  const handleRestaurer = async (f) => {
    if (!confirm(`Restaurer "${f.titre}" ? Il sera à nouveau accessible pour remplissage.`)) return;
    try {
      await formulairesAPI.restaurer(f.id);
      toast.success('Formulaire restauré !');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const grouped = formulaires.reduce((acc, f) => {
    if (!acc[f.module]) acc[f.module] = [];
    acc[f.module].push(f); return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {showModal && (
        <ModalCreer
          onClose={() => setShowModal(false)}
          onCreated={id => { setShowModal(false); navigate(`/formulaires/${id}/builder`); }}
        />
      )}

      {/* Filtres */}
      <div className="card">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input placeholder="Rechercher par titre ou code…" value={search} onChange={e => setSearch(e.target.value)}
              className="input pl-9"/>
          </div>
          <div className="relative">
            <select value={module} onChange={e => setModule(e.target.value)}
              className="input w-44 appearance-none pr-8 cursor-pointer">
              <option value="">Tous les modules</option>
              {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
          </div>
          <div className="relative">
            <select value={frequence} onChange={e => setFrequence(e.target.value)}
              className="input w-44 appearance-none pr-8 cursor-pointer">
              <option value="">Toutes fréquences</option>
              {FREQUENCES.map(f => <option key={f} value={f}>{f.charAt(0)+f.slice(1).toLowerCase().replace('_',' ')}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
          </div>
          {canManage && (
            <button onClick={() => setShowArchived(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                ${showArchived ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              <Archive size={14}/> {showArchived ? 'Archivés' : 'Actifs'}
            </button>
          )}
          {canManage && !showArchived && (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 ml-auto">
              <Plus size={16}/> Nouveau formulaire
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card text-center py-16 space-y-3">
          <p className="text-gray-400">
            {showArchived ? 'Aucun formulaire archivé.' : 'Aucun formulaire trouvé.'}
          </p>
          {canManage && !showArchived && (
            <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus size={16}/> Créer un formulaire
            </button>
          )}
        </div>
      ) : Object.entries(grouped).map(([mod, items]) => (
        <div key={mod}>
          <h3 className="font-display text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className={mod === 'MAINTENANCE' ? 'badge-blue' : 'badge-green'}>{mod}</span>
            <span className="text-sm font-normal text-gray-400">{items.length} formulaire{items.length>1?'s':''}</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map(f => (
              <div key={f.id} className="card hover:shadow-md transition-shadow group relative flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <span className="font-mono text-xs bg-primary/5 text-primary px-2 py-1 rounded-lg">{f.code}</span>
                  <span className={freqBadge[f.frequence]||'badge-gray'}>
                    {f.frequence.charAt(0)+f.frequence.slice(1).toLowerCase().replace('_',' ')}
                  </span>
                </div>
                <h4 className="font-medium text-gray-800 text-sm leading-snug mb-3 line-clamp-2 flex-1">{f.titre}</h4>
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                  <span className="badge-gray">{f.nb_champs || 0} champ{+f.nb_champs>1?'s':''}</span>
                  {f.derniere_soumission && (
                    <span className="flex items-center gap-1">
                      <Clock size={11}/>
                      {formatDistanceToNow(new Date(f.derniere_soumission),{addSuffix:true,locale:fr})}
                    </span>
                  )}
                </div>
                
                {/* MODE ARCHIVÉ : bouton Restaurer */}
                {showArchived ? (
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-orange-500 italic">Formulaire archivé</div>
                    {canManage && (
                      <button onClick={() => handleRestaurer(f)}
                        className="text-xs py-1.5 px-3 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 flex items-center gap-1 transition-colors">
                        <RefreshCw size={13}/> Restaurer
                      </button>
                    )}
                  </div>
                ) : (
                  // MODE ACTIF : boutons habituels
                  <div className={`grid gap-2 ${canManage ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <Link to={`/formulaires/${f.id}/remplir`}
                      className="btn-primary text-xs py-2 flex items-center justify-center gap-1">
                      <FilePlus size={13}/> Remplir
                    </Link>
                    {canManage && (
                      <Link to={`/formulaires/${f.id}/builder`}
                        className="btn-secondary text-xs py-2 flex items-center justify-center gap-1">
                        <Settings size={13}/> Config.
                      </Link>
                    )}
                    <Link to={`/historique?formulaire_id=${f.id}&module=${f.module}`}
                      className="btn-ghost text-xs py-2 flex items-center justify-center gap-1 border border-gray-200 rounded-lg">
                      <History size={13}/> Historique
                    </Link>
                  </div>
                )}
                
                {/* Bouton Archiver (visible uniquement en mode actif) */}
                {canManage && !showArchived && (
                  <button onClick={() => handleArchiver(f)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-300
                      hover:text-orange-400 hover:bg-orange-50 opacity-0 group-hover:opacity-100 transition-all"
                    title="Archiver ce formulaire">
                    <Archive size={14}/>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}