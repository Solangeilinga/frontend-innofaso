import { useState, useEffect } from 'react';
import { stockAPI, equipementsAPI, downloadExcel } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import { Search, Plus, Minus, AlertTriangle, X, Download, ChevronDown, Package, Edit2 } from 'lucide-react';

function ModalMouvement({ piece, type, onClose, onDone }) {
  const [qty, setQty] = useState('');
  const [motif, setMotif] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!qty || isNaN(qty) || +qty <= 0) return toast.error('Quantité invalide');
    setLoading(true);
    try {
      await stockAPI.mouvement({ piece_id: piece.id, type_mouvement: type, quantite: +qty, motif: motif || null });
      toast.success(type === 'ENTREE' ? 'Entrée enregistrée !' : 'Sortie enregistrée !');
      onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">
            {type === 'ENTREE' ? '📦 Entrée stock' : '📤 Sortie stock'}
          </h3>
          <button onClick={onClose}><X size={18} className="text-gray-400"/></button>
        </div>
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="font-medium text-sm text-gray-800">{piece.designation}</p>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{piece.reference}</p>
          <p className="text-xs text-gray-500 mt-1">Stock actuel : <strong>{piece.quantite_stock} {piece.unite}</strong></p>
        </div>
        <div>
          <label className="label-req text-sm">Quantité</label>
          <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
            className="input" placeholder="0" autoFocus/>
        </div>
        <div>
          <label className="label text-sm">Motif</label>
          <input value={motif} onChange={e => setMotif(e.target.value)}
            className="input" placeholder="Raison du mouvement…"/>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={submit} disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-opacity
              ${type === 'ENTREE' ? 'bg-green-600 hover:opacity-90' : 'bg-red-600 hover:opacity-90'}`}>
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : type === 'ENTREE' ? <><Plus size={15}/> Entrer</> : <><Minus size={15}/> Sortir</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalCreerPiece({ equipements, onClose, onDone }) {
  const [f, setF] = useState({ reference:'', designation:'', quantite_stock:0, seuil_alerte:5, unite:'pièce', equipement_id:'' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setF(p => ({...p,[k]:v}));

  const submit = async () => {
    if (!f.reference || !f.designation) return toast.error('Référence et désignation requises');
    setLoading(true);
    try {
      await stockAPI.creerPiece(f);
      toast.success('Pièce créée !');
      onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Nouvelle pièce</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400"/></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-req text-sm">Référence</label>
            <input value={f.reference} onChange={e => set('reference', e.target.value)} className="input font-mono" placeholder="REF-001"/>
          </div>
          <div>
            <label className="label text-sm">Unité</label>
            <input value={f.unite} onChange={e => set('unite', e.target.value)} className="input" placeholder="pièce"/>
          </div>
        </div>
        <div>
          <label className="label-req text-sm">Désignation</label>
          <input value={f.designation} onChange={e => set('designation', e.target.value)} className="input" placeholder="ex: Filtre à huile moteur"/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label text-sm">Qté initiale</label>
            <input type="number" min="0" value={f.quantite_stock} onChange={e => set('quantite_stock', +e.target.value)} className="input"/>
          </div>
          <div>
            <label className="label text-sm">Seuil alerte</label>
            <input type="number" min="0" value={f.seuil_alerte} onChange={e => set('seuil_alerte', +e.target.value)} className="input"/>
          </div>
        </div>
        <div>
          <label className="label text-sm">Équipement associé</label>
          <div className="relative">
            <select value={f.equipement_id} onChange={e => set('equipement_id', e.target.value)}
              className="input appearance-none pr-8 cursor-pointer">
              <option value="">— Aucun —</option>
              {equipements.map(eq => <option key={eq.id} value={eq.id}>[{eq.code_ref}] {eq.nom}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={submit} disabled={loading} className="btn-primary flex-1">
            {loading ? 'Création…' : 'Créer la pièce'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StockPage() {
  const { peutGerer } = useAuth();
  const canManage = peutGerer();
  const [pieces, setPieces] = useState([]);
  const [equipements, setEquipements] = useState([]);
  const [search, setSearch] = useState('');
  const [alerteOnly, setAlerteOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [modal, setModal] = useState(null); // {type:'mvt'|'creer', ...data}

  const load = () => {
    setLoading(true);
    stockAPI.pieces({ search: search||undefined, alerte_stock: alerteOnly||undefined })
      .then(r => setPieces(r.data?.data || r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, alerteOnly]);
  useEffect(() => {
    equipementsAPI.lister().then(r => setEquipements(r.data?.data || r.data || [])).catch(() => {});
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Générer côté client pour l'instant en attendant la route backend
      const { utils, writeFile } = await import('xlsx').catch(() => null) || {};
      if (!utils) {
        toast.error('Module xlsx non disponible');
        return;
      }
      const rows = pieces.map(p => ({
        'Référence': p.reference,
        'Désignation': p.designation,
        'Équipement': p.equipement_nom || '',
        'Qté stock': p.quantite_stock,
        'Seuil alerte': p.seuil_alerte,
        'Unité': p.unite,
        'Statut': +p.quantite_stock <= +p.seuil_alerte ? 'ALERTE' : 'OK',
      }));
      const ws = utils.json_to_sheet(rows);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Stock');
      writeFile(wb, `stock_${new Date().toISOString().slice(0,10)}.xlsx`);
      toast.success('Export Excel téléchargé !');
    } catch { toast.error('Erreur lors de l\'export'); }
    finally { setExporting(false); }
  };

  const nbAlertes = pieces.filter(p => +p.quantite_stock <= +p.seuil_alerte).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Modals */}
      {modal?.type === 'mvt' && (
        <ModalMouvement piece={modal.piece} type={modal.mvtType}
          onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }}/>
      )}
      {modal?.type === 'creer' && (
        <ModalCreerPiece equipements={equipements}
          onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }}/>
      )}

      {/* Stats alertes */}
      {nbAlertes > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-orange-500 shrink-0"/>
          <p className="text-sm text-orange-700 font-medium">
            {nbAlertes} pièce{nbAlertes>1?'s':''} en rupture ou sous le seuil d'alerte
          </p>
          <button onClick={() => setAlerteOnly(true)}
            className="ml-auto text-xs text-orange-600 underline">Voir seulement</button>
        </div>
      )}

      {/* Filtres */}
      <div className="card flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input placeholder="Rechercher une pièce…" value={search} onChange={e => setSearch(e.target.value)}
            className="input pl-9"/>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={alerteOnly} onChange={e => setAlerteOnly(e.target.checked)}
            className="w-4 h-4 accent-primary rounded"/>
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <AlertTriangle size={13} className="text-orange-400"/> Stock bas uniquement
          </span>
        </label>
        <button onClick={handleExport} disabled={exporting}
          className="btn-secondary flex items-center gap-2 disabled:opacity-60">
          <Download size={15}/> Excel
        </button>
        {canManage && (
          <button onClick={() => setModal({type:'creer'})} className="btn-primary flex items-center gap-2">
            <Plus size={15}/> Nouvelle pièce
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="th">Pièce</th>
              <th className="th">Référence</th>
              <th className="th">Équipement</th>
              <th className="th text-right">Stock</th>
              <th className="th text-right">Seuil</th>
              <th className="th text-center">Mouvements</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"/>
              </td></tr>
            ) : pieces.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                <Package size={32} className="mx-auto mb-2 opacity-30"/>
                <p>Aucune pièce trouvée</p>
              </td></tr>
            ) : pieces.map(p => {
              const bas = +p.quantite_stock <= +p.seuil_alerte;
              return (
                <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${bas ? 'bg-red-50/20' : ''}`}>
                  <td className="td">
                    <p className="font-medium text-gray-800">{p.designation}</p>
                  </td>
                  <td className="td font-mono text-xs text-gray-500">{p.reference}</td>
                  <td className="td text-xs text-gray-400">{p.equipement_nom || '—'}</td>
                  <td className="td text-right">
                    <span className={`font-bold ${bas ? 'text-red-600' : 'text-gray-800'}`}>
                      {bas && <AlertTriangle size={12} className="inline mr-1 text-red-500"/>}
                      {p.quantite_stock} <span className="font-normal text-gray-400 text-xs">{p.unite}</span>
                    </span>
                  </td>
                  <td className="td text-right text-gray-400 text-xs">{p.seuil_alerte} {p.unite}</td>
                  <td className="td">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => setModal({type:'mvt', piece:p, mvtType:'ENTREE'})}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium transition-colors">
                        <Plus size={12}/> Entrée
                      </button>
                      <button onClick={() => setModal({type:'mvt', piece:p, mvtType:'SORTIE'})}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium transition-colors">
                        <Minus size={12}/> Sortie
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
