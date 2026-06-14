import { useState, useEffect } from 'react';
import { formulairesAPI, champsAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, X, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function ChampModal({ onClose, onCreated, formulaireId, champ = null }) {
  const [types, setTypes] = useState([]);
  const [f, setF] = useState(champ || { 
    nom_champ: '', 
    type_champ: 'TEXTE', 
    section: '', 
    obligatoire: false, 
    ordre: 0, 
    unite: '', 
    options_liste: '', 
    formule: '' 
  });
  const [l, setL] = useState(false);

  useEffect(() => {
    champsAPI.types().then(r => setTypes(r.data)).catch(console.error);
  }, []);

  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  
  const sub = async e => {
    e.preventDefault();
    if (!f.nom_champ || !f.type_champ) return toast.error('Nom et type requis');
    setL(true);
    try {
      const data = {
        ...f,
        options_liste: f.options_liste ? JSON.parse(f.options_liste) : null
      };
      if (champ) {
        await champsAPI.modifier(formulaireId, champ.id, data);
        toast.success('Champ modifié !');
      } else {
        await champsAPI.creer(formulaireId, data);
        toast.success('Champ créé !');
      }
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally {
      setL(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold">
            {champ ? 'Modifier le champ' : 'Nouveau champ'}
          </h3>
          <button onClick={onClose}><X size={18} className="text-gray-500"/></button>
        </div>
        <form onSubmit={sub} className="space-y-3">
          <div>
            <label className="label-req">Nom du champ</label>
            <input
              value={f.nom_champ}
              onChange={e => s('nom_champ', e.target.value)}
              placeholder="ex: Durée d'arrêt"
              className="input"
            />
          </div>
          <div>
            <label className="label-req">Type</label>
            <select
              value={f.type_champ}
              onChange={e => s('type_champ', e.target.value)}
              className="input"
            >
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Section</label>
            <input
              value={f.section}
              onChange={e => s('section', e.target.value)}
              placeholder="ex: Intervention"
              className="input"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="label">Ordre</label>
              <input
                type="number"
                value={f.ordre}
                onChange={e => s('ordre', parseInt(e.target.value) || 0)}
                className="input"
              />
            </div>
            <div className="flex-1">
              <label className="label">Unité</label>
              <input
                value={f.unite}
                onChange={e => s('unite', e.target.value)}
                placeholder="ex: h"
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="label">Options liste (JSON)</label>
            <textarea
              value={f.options_liste}
              onChange={e => s('options_liste', e.target.value)}
              placeholder='["Option 1", "Option 2"]'
              className="input resize-none font-mono text-xs"
              rows={2}
            />
          </div>
          <div>
            <label className="label">Formule</label>
            <textarea
              value={f.formule}
              onChange={e => s('formule', e.target.value)}
              placeholder="Formule de calcul"
              className="input resize-none font-mono text-xs"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="obligatoire"
              checked={f.obligatoire}
              onChange={e => s('obligatoire', e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="obligatoire" className="text-sm">Obligatoire</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={l} className="btn-primary flex-1">
              {l ? 'Enregistrement…' : (champ ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ChampsPage() {
  const { peutGerer } = useAuth();
  const navigate = useNavigate();
  const [formulaires, setFormulaires] = useState([]);
  const [selectedFormulaire, setSelectedFormulaire] = useState(null);
  const [champs, setChamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editChamp, setEditChamp] = useState(null);

  const loadFormulaires = () => {
    setLoading(true);
    formulairesAPI.lister({ module: 'MAINTENANCE' })
      .then(r => setFormulaires(r.data?.data || (Array.isArray(r.data) ? r.data : [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const loadChamps = (formulaireId) => {
    if (!formulaireId) return;
    setLoading(true);
    champsAPI.lister(formulaireId)
      .then(r => setChamps(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadFormulaires(); }, []);

  useEffect(() => {
    if (selectedFormulaire) {
      loadChamps(selectedFormulaire.id);
    }
  }, [selectedFormulaire]);

  const handleDelete = async (champId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir désactiver ce champ ?')) return;
    try {
      await champsAPI.supprimer(selectedFormulaire.id, champId);
      toast.success('Champ désactivé');
      loadChamps(selectedFormulaire.id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {modal && (
        <ChampModal
          onClose={() => { setModal(false); setEditChamp(null); }}
          onCreated={() => { setModal(false); setEditChamp(null); loadChamps(selectedFormulaire.id); }}
          formulaireId={selectedFormulaire?.id}
          champ={editChamp}
        />
      )}
      <div className="card flex gap-4 items-center">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg">
          <ArrowLeft size={20}/>
        </button>
        <h1 className="text-2xl font-bold">Gestion des champs de formulaires</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card space-y-4">
          <h2 className="font-semibold">Formulaires</h2>
          {loading && formulaires.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : (
            <div className="space-y-2">
              {formulaires.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFormulaire(f)}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    selectedFormulaire?.id === f.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <p className="font-medium">{f.titre}</p>
                  <p className="text-xs text-muted-foreground">{f.code}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="md:col-span-2 card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              {selectedFormulaire ? `Champs : ${selectedFormulaire.titre}` : 'Sélectionnez un formulaire'}
            </h2>
            {selectedFormulaire && peutGerer() && (
              <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
                <Plus size={16}/> Ajouter
              </button>
            )}
          </div>
          {selectedFormulaire ? (
            loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3">Nom</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Section</th>
                      <th className="px-4 py-3">Ordre</th>
                      <th className="px-4 py-3">Obligatoire</th>
                      {peutGerer() && <th className="px-4 py-3">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {champs.map(c => (
                      <tr key={c.id} className="border-b border-border/60 hover:bg-primary/[0.03]">
                        <td className="px-4 py-3 font-medium">{c.nom_champ}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded bg-secondary/15 text-secondary text-xs font-bold">
                            {c.type_champ}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{c.section || '—'}</td>
                        <td className="px-4 py-3">{c.ordre}</td>
                        <td className="px-4 py-3">
                          {c.obligatoire ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        {peutGerer() && (
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setEditChamp(c); setModal(true); }}
                                className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"
                                title="Modifier"
                              >
                                <Edit size={16}/>
                              </button>
                              <button
                                onClick={() => handleDelete(c.id)}
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
                {champs.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    Aucun champ trouvé pour ce formulaire
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              Sélectionnez un formulaire pour voir ses champs
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
