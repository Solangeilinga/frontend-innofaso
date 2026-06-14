import { useState, useEffect } from 'react';
import { matieresAPI, downloadExcel } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import {
  Search, Plus, Minus, AlertTriangle, X, Download,
  ChevronDown, Package, TrendingDown, TrendingUp, Edit2, Archive
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Modal mouvement ────────────────────────────────────────────────
function ModalMouvement({ matiere, type, onClose, onDone }) {
  const [quantite, setQuantite] = useState('');
  const [motif, setMotif] = useState('');
  const [bonLivraison, setBonLivraison] = useState('');
  const [lot, setLot] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!quantite || isNaN(quantite) || +quantite <= 0)
      return toast.error('Quantité invalide');
    setLoading(true);
    try {
      await matieresAPI.mouvement({
        matiere_id: matiere.id,
        type_mouvement: type,
        quantite: +quantite,
        motif: motif || null,
        bon_livraison: bonLivraison || null,
        lot: lot || null,
      });
      toast.success(type === 'ENTREE' ? 'Entrée enregistrée !' : 'Sortie enregistrée !');
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally { setLoading(false); }
  };

  const isEntree = type === 'ENTREE';

  return (
    <div className="modal-overlay">
      <div className="modal max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">
            {isEntree ? '📥 Entrée matière' : '📤 Sortie matière'}
          </h3>
          <button onClick={onClose}><X size={18} className="text-gray-400"/></button>
        </div>
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="font-medium text-sm text-gray-800">{matiere.designation}</p>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{matiere.reference}</p>
          <p className="text-xs text-gray-500 mt-1">
            Stock actuel : <strong>{matiere.quantite_stock} {matiere.unite}</strong>
          </p>
        </div>
        <div>
          <label className="label-req text-sm">Quantité ({matiere.unite})</label>
          <input type="number" step="0.001" min="0.001" value={quantite}
            onChange={e => setQuantite(e.target.value)} className="input" autoFocus/>
        </div>
        {isEntree && (
          <>
            <div>
              <label className="label text-sm">N° Bon de livraison</label>
              <input value={bonLivraison} onChange={e => setBonLivraison(e.target.value)}
                className="input" placeholder="BL-2024-001"/>
            </div>
            <div>
              <label className="label text-sm">N° Lot</label>
              <input value={lot} onChange={e => setLot(e.target.value)}
                className="input" placeholder="LOT-ABC-001"/>
            </div>
          </>
        )}
        <div>
          <label className="label text-sm">Motif {!isEntree && '*'}</label>
          <input value={motif} onChange={e => setMotif(e.target.value)}
            className="input" placeholder={isEntree ? 'Livraison fournisseur…' : 'Ligne de production, perte…'}/>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={submit} disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg font-medium text-white px-4 py-2
              ${isEntree ? 'bg-green-600 hover:opacity-90' : 'bg-orange-600 hover:opacity-90'}`}>
            {loading
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
              : isEntree ? <><TrendingUp size={15}/> Entrer</> : <><TrendingDown size={15}/> Sortir</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal créer / modifier ──────────────────────────────────────────
function ModalMatiere({ matiere, categories, onClose, onDone }) {
  const isEdit = !!matiere;
  const [f, setF] = useState({
    reference:      matiere?.reference || '',
    designation:    matiere?.designation || '',
    categorie:      matiere?.categorie || '',
    fournisseur:    matiere?.fournisseur || '',
    unite:          matiere?.unite || 'kg',
    quantite_stock: matiere?.quantite_stock ?? 0,
    seuil_alerte:   matiere?.seuil_alerte ?? 50,
    prix_unitaire:  matiere?.prix_unitaire || '',
    emplacement:    matiere?.emplacement || '',
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.reference || !f.designation) return toast.error('Référence et désignation requises');
    setLoading(true);
    try {
      const payload = { ...f, prix_unitaire: f.prix_unitaire || null };
      if (isEdit) await matieresAPI.modifier(matiere.id, payload);
      else        await matieresAPI.creer(payload);
      toast.success(isEdit ? 'Matière modifiée !' : 'Matière créée !');
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">
            {isEdit ? 'Modifier la matière' : 'Nouvelle matière première'}
          </h3>
          <button onClick={onClose}><X size={18} className="text-gray-400"/></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-req text-sm">Référence</label>
            <input value={f.reference} onChange={e => set('reference', e.target.value.toUpperCase())}
              className="input font-mono" placeholder="MP-SUCRE-001" disabled={isEdit}/>
          </div>
          <div>
            <label className="label-req text-sm">Unité</label>
            <div className="relative">
              <select value={f.unite} onChange={e => set('unite', e.target.value)}
                className="input appearance-none pr-8 cursor-pointer">
                {['kg','g','L','mL','T','m','m²','m³','sac','palette','pièce','boîte'].map(u =>
                  <option key={u} value={u}>{u}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
            </div>
          </div>
        </div>
        <div>
          <label className="label-req text-sm">Désignation</label>
          <input value={f.designation} onChange={e => set('designation', e.target.value)}
            className="input" placeholder="ex: Sucre blanc cristallisé"/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label text-sm">Catégorie</label>
            <input list="cats-list" value={f.categorie} onChange={e => set('categorie', e.target.value)}
              className="input" placeholder="ex: Sucres, Huiles…"/>
            <datalist id="cats-list">
              {categories.map(c => <option key={c} value={c}/>)}
            </datalist>
          </div>
          <div>
            <label className="label text-sm">Fournisseur</label>
            <input value={f.fournisseur} onChange={e => set('fournisseur', e.target.value)}
              className="input" placeholder="Nom du fournisseur"/>
          </div>
        </div>
        {!isEdit && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-sm">Qté initiale</label>
              <input type="number" step="0.001" min="0" value={f.quantite_stock}
                onChange={e => set('quantite_stock', e.target.value)} className="input"/>
            </div>
            <div>
              <label className="label text-sm">Seuil d'alerte</label>
              <input type="number" step="0.001" min="0" value={f.seuil_alerte}
                onChange={e => set('seuil_alerte', e.target.value)} className="input"/>
            </div>
          </div>
        )}
        {isEdit && (
          <div>
            <label className="label text-sm">Seuil d'alerte ({f.unite})</label>
            <input type="number" step="0.001" min="0" value={f.seuil_alerte}
              onChange={e => set('seuil_alerte', e.target.value)} className="input"/>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label text-sm">Prix unitaire (FCFA)</label>
            <input type="number" step="0.01" min="0" value={f.prix_unitaire}
              onChange={e => set('prix_unitaire', e.target.value)} className="input" placeholder="0"/>
          </div>
          <div>
            <label className="label text-sm">Emplacement</label>
            <input value={f.emplacement} onChange={e => set('emplacement', e.target.value)}
              className="input" placeholder="ex: Entrepôt A, Zone 2"/>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={submit} disabled={loading} className="btn-primary flex-1">
            {loading ? 'Enregistrement…' : isEdit ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal historique mouvements ─────────────────────────────────────
function ModalHistorique({ matiere, onClose }) {
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    matieresAPI.mouvements(matiere.id)
      .then(r => setMouvements(r.data || []))
      .finally(() => setLoading(false));
  }, [matiere.id]);

  return (
    <div className="modal-overlay">
      <div className="modal max-w-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold">Historique des mouvements</h3>
            <p className="text-sm text-gray-400">{matiere.designation}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400"/></button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : mouvements.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Aucun mouvement enregistré.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {mouvements.map(m => (
              <div key={m.id} className={`flex items-start gap-3 p-3 rounded-xl border text-sm
                ${m.type_mouvement === 'ENTREE' ? 'bg-green-50 border-green-100' :
                  m.type_mouvement === 'AJUSTEMENT' ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                <div className={`shrink-0 font-bold text-base
                  ${m.type_mouvement === 'ENTREE' ? 'text-green-600' :
                    m.type_mouvement === 'AJUSTEMENT' ? 'text-blue-600' : 'text-orange-600'}`}>
                  {m.type_mouvement === 'ENTREE' ? '+' : m.type_mouvement === 'AJUSTEMENT' ? '~' : '-'}
                  {m.quantite} {matiere.unite}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">
                      {m.type_mouvement === 'ENTREE' ? 'Entrée' : m.type_mouvement === 'AJUSTEMENT' ? 'Ajustement' : 'Sortie'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(m.date_mouvement), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </span>
                  </div>
                  {m.motif && <p className="text-xs text-gray-500 mt-0.5">{m.motif}</p>}
                  {m.bon_livraison && <p className="text-xs text-gray-400">BL : {m.bon_livraison}</p>}
                  {m.lot && <p className="text-xs text-gray-400">Lot : {m.lot}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    Par {m.utilisateur_prenom} {m.utilisateur_nom}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────
export default function MatieresPage() {
  const { peutGerer } = useAuth();
  const canManage = peutGerer();

  const [matieres, setMatieres] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState('');
  const [alerteOnly, setAlerteOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  // modal types: 'creer' | 'edit' | 'entree' | 'sortie' | 'historique'

  const load = () => {
    setLoading(true);
    Promise.all([
      matieresAPI.lister({
        search: search || undefined,
        categorie: categorie || undefined,
        alerte_stock: alerteOnly || undefined,
        actif: showArchived ? 'false' : true,
      }),
      matieresAPI.categories(),
      matieresAPI.stats(),
    ])
      .then(([m, cats, s]) => {
        setMatieres(m.data || []);
        setCategories(cats.data || []);
        setStats(s.data || {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, categorie, alerteOnly, showArchived]);

  const handleArchiver = async (mp) => {
    if (!confirm(`Archiver "${mp.designation}" ?`)) return;
    try {
      await matieresAPI.supprimer(mp.id);
      toast.success('Matière archivée.');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleExport = async () => {
    try {
      const { utils, writeFile } = await import('xlsx');
      const rows = matieres.map(m => ({
        'Référence':       m.reference,
        'Désignation':     m.designation,
        'Catégorie':       m.categorie || '',
        'Fournisseur':     m.fournisseur || '',
        'Unité':           m.unite,
        'Stock':           m.quantite_stock,
        'Seuil alerte':    m.seuil_alerte,
        'Statut':          m.en_alerte ? 'ALERTE' : 'OK',
        'Emplacement':     m.emplacement || '',
        'Prix unitaire':   m.prix_unitaire || '',
        'Conso 30j':       m.consommation_30j || 0,
      }));
      const ws = utils.json_to_sheet(rows);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Matières premières');
      writeFile(wb, `matieres_${new Date().toISOString().slice(0,10)}.xlsx`);
      toast.success('Export Excel téléchargé !');
    } catch { toast.error('Erreur lors de l\'export'); }
  };

  // Grouper par catégorie
  const grouped = matieres.reduce((acc, m) => {
    const cat = m.categorie || 'Sans catégorie';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Modals */}
      {modal?.type === 'creer' && (
        <ModalMatiere categories={categories} onClose={() => setModal(null)}
          onDone={() => { setModal(null); load(); }}/>
      )}
      {modal?.type === 'edit' && (
        <ModalMatiere matiere={modal.matiere} categories={categories} onClose={() => setModal(null)}
          onDone={() => { setModal(null); load(); }}/>
      )}
      {(modal?.type === 'entree' || modal?.type === 'sortie') && (
        <ModalMouvement matiere={modal.matiere} type={modal.type === 'entree' ? 'ENTREE' : 'SORTIE'}
          onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }}/>
      )}
      {modal?.type === 'historique' && (
        <ModalHistorique matiere={modal.matiere} onClose={() => setModal(null)}/>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total matières', value: stats.total || 0, color: 'text-gray-800' },
          { label: 'En alerte stock', value: stats.en_alerte || 0, color: 'text-orange-600' },
          { label: 'En rupture', value: stats.en_rupture || 0, color: 'text-red-600' },
          { label: 'Catégories', value: stats.nb_categories || 0, color: 'text-primary' },
        ].map(s => (
          <div key={s.label} className="card py-3 px-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bandeau alertes */}
      {+stats.en_alerte > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-orange-500 shrink-0"/>
          <p className="text-sm text-orange-700 font-medium">
            {stats.en_alerte} matière{+stats.en_alerte > 1 ? 's' : ''} sous le seuil d'alerte
            {+stats.en_rupture > 0 && ` dont ${stats.en_rupture} en rupture totale`}
          </p>
          <button onClick={() => setAlerteOnly(true)} className="ml-auto text-xs text-orange-600 underline">
            Voir seulement
          </button>
        </div>
      )}

      {/* Filtres */}
      <div className="card flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input placeholder="Rechercher une matière…" value={search}
            onChange={e => setSearch(e.target.value)} className="input pl-9"/>
        </div>
        <div className="relative">
          <select value={categorie} onChange={e => setCategorie(e.target.value)}
            className="input w-44 appearance-none pr-8 cursor-pointer">
            <option value="">Toutes catégories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={alerteOnly} onChange={e => setAlerteOnly(e.target.checked)}
            className="w-4 h-4 accent-primary rounded"/>
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <AlertTriangle size={13} className="text-orange-400"/> Alertes seulement
          </span>
        </label>
        {canManage && (
          <button onClick={() => setShowArchived(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors
              ${showArchived ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            <Archive size={14}/> {showArchived ? 'Archivées' : 'Actives'}
          </button>
        )}
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
          <Download size={15}/> Excel
        </button>
        {canManage && !showArchived && (
          <button onClick={() => setModal({ type: 'creer' })} className="btn-primary flex items-center gap-2">
            <Plus size={15}/> Nouvelle matière
          </button>
        )}
      </div>

      {/* Tableau groupé par catégorie */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card text-center py-16 space-y-3">
          <Package size={40} className="mx-auto text-gray-200"/>
          <p className="text-gray-400">Aucune matière première trouvée.</p>
          {canManage && !showArchived && (
            <button onClick={() => setModal({ type: 'creer' })} className="btn-primary inline-flex items-center gap-2">
              <Plus size={15}/> Ajouter une matière
            </button>
          )}
        </div>
      ) : Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1 flex items-center gap-2">
            {cat}
            <span className="badge-gray font-normal normal-case">{items.length}</span>
          </h3>
          <div className="card p-0 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="th">Matière</th>
                  <th className="th">Référence</th>
                  <th className="th">Fournisseur</th>
                  <th className="th text-right">Stock</th>
                  <th className="th text-right">Seuil</th>
                  <th className="th text-right">Conso 30j</th>
                  <th className="th text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(m => {
                  const alerte = m.en_alerte || (+m.quantite_stock <= +m.seuil_alerte);
                  const rupture = +m.quantite_stock === 0;
                  return (
                    <tr key={m.id} className={`hover:bg-gray-50 transition-colors
                      ${rupture ? 'bg-red-50/30' : alerte ? 'bg-orange-50/20' : ''}`}>
                      <td className="td">
                        <p className="font-medium text-gray-800">{m.designation}</p>
                        {m.emplacement && <p className="text-xs text-gray-400">{m.emplacement}</p>}
                      </td>
                      <td className="td font-mono text-xs text-gray-500">{m.reference}</td>
                      <td className="td text-xs text-gray-400">{m.fournisseur || '—'}</td>
                      <td className="td text-right">
                        <span className={`font-bold ${rupture ? 'text-red-600' : alerte ? 'text-orange-600' : 'text-gray-800'}`}>
                          {rupture && <AlertTriangle size={12} className="inline mr-1 text-red-500"/>}
                          {alerte && !rupture && <AlertTriangle size={12} className="inline mr-1 text-orange-400"/>}
                          {m.quantite_stock} <span className="font-normal text-gray-400 text-xs">{m.unite}</span>
                        </span>
                      </td>
                      <td className="td text-right text-gray-400 text-xs">
                        {m.seuil_alerte} {m.unite}
                      </td>
                      <td className="td text-right text-xs text-gray-500">
                        {m.consommation_30j > 0 ? `${m.consommation_30j} ${m.unite}` : '—'}
                      </td>
                      <td className="td">
                        {showArchived ? (
                          <span className="text-xs text-orange-400 italic text-center block">Archivée</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => setModal({ type: 'entree', matiere: m })}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium">
                              <TrendingUp size={12}/> Entrée
                            </button>
                            <button onClick={() => setModal({ type: 'sortie', matiere: m })}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 text-xs font-medium">
                              <TrendingDown size={12}/> Sortie
                            </button>
                            <button onClick={() => setModal({ type: 'historique', matiere: m })}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                              title="Historique">
                              <Search size={13}/>
                            </button>
                            {canManage && (
                              <>
                                <button onClick={() => setModal({ type: 'edit', matiere: m })}
                                  className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-400" title="Modifier">
                                  <Edit2 size={13}/>
                                </button>
                                <button onClick={() => handleArchiver(m)}
                                  className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-400"
                                  title="Archiver">
                                  <Archive size={13}/>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}