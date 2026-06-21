import { useState, useEffect } from 'react';
import { lignesAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, X } from 'lucide-react';

function Modal({ onClose, onCreated, ligne = null }) {
  const [f, setF] = useState(ligne || { code: '', nom: '', description: '' });
  const [l, setL] = useState(false);
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  const sub = async e => {
    e.preventDefault();
    if (!f.code || !f.nom) return toast.error('Code et nom requis');
    setL(true);
    try {
      if (ligne) {
        await lignesAPI.modifier(ligne.id, f);
        toast.success('Ligne modifiée !');
      } else {
        await lignesAPI.creer(f);
        toast.success('Ligne créée !');
      }
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Erreur');
    } finally {
      setL(false);
    }
  };
  return (
    <div className="modal-overlay">
      <div className="modal max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold">
            {ligne ? 'Modifier la ligne' : 'Nouvelle ligne'}
          </h3>
          <button onClick={onClose}><X size={18} className="text-gray-500"/></button>
        </div>
        <form onSubmit={sub} className="space-y-3">
          <div>
            <label className="label-req">Code</label>
            <input
              value={f.code}
              onChange={e => s('code', e.target.value.toUpperCase())}
              placeholder="ex: L1"
              className="input font-mono"
            />
          </div>
          <div>
            <label className="label-req">Nom</label>
            <input
              value={f.nom}
              onChange={e => s('nom', e.target.value)}
              placeholder="Nom de la ligne"
              className="input"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={f.description}
              onChange={e => s('description', e.target.value)}
              placeholder="Description optionnelle"
              className="input resize-none"
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={l} className="btn-primary flex-1">
              {l ? 'Enregistrement…' : (ligne ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LignesPage() {
  const { peutGerer } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editLigne, setEditLigne] = useState(null);

  const load = () => {
    setLoading(true);
    lignesAPI.lister()
      .then(r => setItems(r.data?.data || (Array.isArray(r.data) ? r.data : [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async id => {
    if (!window.confirm('Êtes-vous sûr de vouloir désactiver cette ligne ?')) return;
    try {
      await lignesAPI.supprimer(id);
      toast.success('Ligne désactivée');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Erreur');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {modal && (
        <Modal
          onClose={() => { setModal(false); setEditLigne(null); }}
          onCreated={() => { setModal(false); setEditLigne(null); load(); }}
          ligne={editLigne}
        />
      )}
      <div className="card flex gap-4">
        <h1 className="text-2xl font-bold">Gestion des lignes de production</h1>
        {peutGerer() && (
          <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2 ml-auto">
            <Plus size={16}/> Ajouter
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Statut</th>
                {peutGerer() && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map(l => (
                <tr key={l.id} className="border-b border-border/60 hover:bg-primary/[0.03]">
                  <td className="px-4 py-3 font-mono font-semibold text-primary">{l.code}</td>
                  <td className="px-4 py-3">{l.nom}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.description || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${l.actif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {l.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  {peutGerer() && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditLigne(l); setModal(true); }}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"
                          title="Modifier"
                        >
                          <Edit size={16}/>
                        </button>
                        <button
                          onClick={() => handleDelete(l.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Désactiver"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              Aucune ligne de production trouvée
            </div>
          )}
        </div>
      )}
    </div>
  );
}