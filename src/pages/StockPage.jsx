import { useState, useEffect, useCallback } from 'react';
import { stockAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import {
  Plus, X, Edit2, Package, AlertTriangle,
  ArrowDownCircle, ArrowUpCircle, History, Search
} from 'lucide-react';

const UNITES = ['pièce','unité','kg','litre','mètre','boîte','lot','rouleau'];

// ── Modal Pièce ───────────────────────────────────────────────────
function ModalPiece({ piece, equipements, onClose, onSaved }) {
  const isEdit = !!piece;
  const [f, setF] = useState({
    reference:      piece?.reference      || '',
    designation:    piece?.designation    || '',
    quantite_stock: piece?.quantite_stock || 0,
    seuil_alerte:   piece?.seuil_alerte   || 5,
    unite:          piece?.unite          || 'pièce',
    equipement_id:  piece?.equipement_id  || '',
  });
  const [loading, setLoading] = useState(false);
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.reference || !f.designation) return toast.error('Référence et désignation requises');
    setLoading(true);
    try {
      if (isEdit) await stockAPI.modifier(piece.id, f);
      else        await stockAPI.creer(f);
      toast.success(isEdit ? 'Pièce modifiée !' : 'Pièce créée !');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">{isEdit ? 'Modifier la pièce' : 'Nouvelle pièce'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400"/></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label text-sm">Référence *</label>
            <input value={f.reference} onChange={e=>s('reference',e.target.value)} placeholder="REF-001" className="input"/>
          </div>
          <div>
            <label className="label text-sm">Unité</label>
            <select value={f.unite} onChange={e=>s('unite',e.target.value)} className="input">
              {UNITES.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label text-sm">Désignation *</label>
          <input value={f.designation} onChange={e=>s('designation',e.target.value)} placeholder="Nom de la pièce" className="input"/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {!isEdit && (
            <div>
              <label className="label text-sm">Quantité initiale</label>
              <input type="number" min={0} value={f.quantite_stock} onChange={e=>s('quantite_stock',+e.target.value)} className="input"/>
            </div>
          )}
          <div>
            <label className="label text-sm">Seuil d'alerte</label>
            <input type="number" min={0} value={f.seuil_alerte} onChange={e=>s('seuil_alerte',+e.target.value)} className="input"/>
          </div>
        </div>
        <div>
          <label className="label text-sm">Équipement concerné</label>
          <select value={f.equipement_id} onChange={e=>s('equipement_id',e.target.value)} className="input">
            <option value="">— Aucun équipement spécifique —</option>
            {equipements.map(e => <option key={e.id} value={e.id}>[{e.code_ref}] {e.nom}</option>)}
          </select>
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

// ── Modal Mouvement ───────────────────────────────────────────────
function ModalMouvement({ piece, type, onClose, onDone }) {
  const [quantite, setQuantite] = useState(1);
  const [motif, setMotif]       = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async () => {
    if (quantite <= 0) return toast.error('Quantité invalide');
    setLoading(true);
    try {
      if (type === 'ENTREE') await stockAPI.entree(piece.id, { quantite, motif });
      else                   await stockAPI.sortie(piece.id, { quantite, motif });
      toast.success(type === 'ENTREE' ? `+${quantite} ${piece.unite} ajouté(s)` : `-${quantite} ${piece.unite} déduit(s)`);
      onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">
            {type === 'ENTREE' ? 'Entrée stock' : 'Sortie stock'}
          </h3>
          <button onClick={onClose}><X size={18} className="text-gray-400"/></button>
        </div>
        <div className="bg-muted/50 rounded-xl p-3">
          <p className="font-medium text-sm">{piece.designation}</p>
          <p className="text-xs text-muted-foreground">Réf: {piece.reference} · Stock actuel: <strong>{piece.quantite_stock} {piece.unite}</strong></p>
        </div>
        <div>
          <label className="label text-sm">Quantité *</label>
          <input type="number" min={1} max={type==='SORTIE' ? piece.quantite_stock : undefined}
            value={quantite} onChange={e=>setQuantite(+e.target.value)} className="input"/>
        </div>
        <div>
          <label className="label text-sm">Motif</label>
          <input value={motif} onChange={e=>setMotif(e.target.value)}
            placeholder={type==='ENTREE' ? 'Réapprovisionnement…' : 'Maintenance, réparation…'}
            className="input"/>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={submit} disabled={loading}
            className={`flex-1 px-4 py-2 rounded-xl font-semibold text-white transition-colors ${
              type==='ENTREE' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'
            }`}>
            {loading ? 'Traitement…' : type === 'ENTREE' ? 'Ajouter' : 'Déduire'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Historique ──────────────────────────────────────────────
function ModalHistorique({ piece, onClose }) {
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    stockAPI.mouvements(piece.id)
      .then(r => setMouvements(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [piece.id]);

  return (
    <div className="modal-overlay">
      <div className="modal max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Historique — {piece.designation}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400"/></button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : mouvements.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucun mouvement</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {mouvements.map(m => (
              <div key={m.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl text-sm">
                <span className={`text-lg flex-shrink-0 ${m.type_mouvement==='ENTREE' ? 'text-green-600' : 'text-orange-600'}`}>
                  {m.type_mouvement==='ENTREE' ? '↑' : '↓'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${m.type_mouvement==='ENTREE' ? 'text-green-700' : 'text-orange-700'}`}>
                      {m.type_mouvement==='ENTREE' ? '+' : '-'}{m.quantite} {piece.unite}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.date_mouvement).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  {m.motif && <p className="text-xs text-muted-foreground truncate">{m.motif}</p>}
                  {m.user_prenom && <p className="text-xs text-muted-foreground">{m.user_prenom} {m.user_nom}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────
export default function StockPage() {
  const { peutGerer } = useAuth();
  const canEdit = peutGerer?.();
  const [pieces, setPieces]         = useState([]);
  const [equipements, setEquipements] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [alerteOnly, setAlerteOnly] = useState(false);
  const [modal, setModal]           = useState(null); // {type, piece}

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      stockAPI.lister({ search: search||undefined, alerte: alerteOnly||undefined }),
      import('../services/api').then(m => m.equipementsAPI.lister()),
    ])
      .then(([s, e]) => {
        setPieces(s.data || []);
        setEquipements(e.data?.data || e.data || []);
      })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [search, alerteOnly]);

  useEffect(() => { load(); }, [load]);

  const enAlerte = pieces.filter(p => p.en_alerte).length;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Modals */}
      {modal?.type === 'create' && (
        <ModalPiece equipements={equipements} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load();}}/>
      )}
      {modal?.type === 'edit' && (
        <ModalPiece piece={modal.piece} equipements={equipements} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load();}}/>
      )}
      {(modal?.type === 'entree' || modal?.type === 'sortie') && (
        <ModalMouvement piece={modal.piece} type={modal.type.toUpperCase()} onClose={()=>setModal(null)} onDone={()=>{setModal(null);load();}}/>
      )}
      {modal?.type === 'historique' && (
        <ModalHistorique piece={modal.piece} onClose={()=>setModal(null)}/>
      )}

      {/* Header */}
      <div className="card flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl text-gray-900">Stock pièces de rechange</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {pieces.length} pièce{pieces.length>1?'s':''}
            {enAlerte > 0 && <span className="ml-2 text-red-500 font-medium">· {enAlerte} en alerte</span>}
          </p>
        </div>
        {canEdit && (
          <button onClick={()=>setModal({type:'create'})} className="btn-primary flex items-center gap-2">
            <Plus size={16}/> Nouvelle pièce
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Rechercher par référence ou désignation…" className="input pl-9"/>
        </div>
        <button
          onClick={()=>setAlerteOnly(p=>!p)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            alerteOnly ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-600'
          }`}
        >
          <AlertTriangle size={14}/> Alertes seulement
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : pieces.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Package size={40} className="mx-auto mb-3 opacity-30"/>
            <p>Aucune pièce trouvée</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Référence</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Désignation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Équipement</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Stock</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Seuil</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pieces.map(p => (
                <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.en_alerte ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{p.reference}</span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {p.en_alerte && <AlertTriangle size={13} className="inline text-red-500 mr-1"/>}
                    {p.designation}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.equipement_nom || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${p.en_alerte ? 'text-red-600' : 'text-gray-800'}`}>
                      {p.quantite_stock}
                    </span>
                    <span className="text-gray-400 text-xs ml-1">{p.unite}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400 text-xs">{p.seuil_alerte}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={()=>setModal({type:'historique',piece:p})}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors" title="Historique">
                        <History size={14}/>
                      </button>
                      {canEdit && <>
                        <button onClick={()=>setModal({type:'entree',piece:p})}
                          className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors" title="Entrée">
                          <ArrowDownCircle size={14}/>
                        </button>
                        <button onClick={()=>setModal({type:'sortie',piece:p})}
                          className="p-1.5 hover:bg-orange-50 rounded-lg text-orange-600 transition-colors" title="Sortie">
                          <ArrowUpCircle size={14}/>
                        </button>
                        <button onClick={()=>setModal({type:'edit',piece:p})}
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors" title="Modifier">
                          <Edit2 size={14}/>
                        </button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}