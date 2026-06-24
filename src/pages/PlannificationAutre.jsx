import { useState, useEffect, useCallback } from 'react';
import { planningAutreAPI, signatairesAPI, planningAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import { Save, Loader2, FileText, UserPlus, Trash2, Search, Plus } from 'lucide-react';

export default function PlannificationAutre() {
  const { user: currentUser, isAdmin } = useAuth();
  const [maintenanciers, setMaintenanciers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allFormulaires, setAllFormulaires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [formModal, setFormModal] = useState(false);
  const [formFilter, setFormFilter] = useState('');

  const fetchData = useCallback(async () => {
    const [m, u, f, l] = await Promise.all([
      planningAPI.listerMaintenanciers(),
      signatairesAPI.liste(),
      planningAPI.listerFormulairesDisponibles(),
      planningAutreAPI.lister(),
    ]);
    setMaintenanciers(m.data || []);
    setAllUsers(Array.isArray(u.data) ? u.data : []);
    setAllFormulaires(Array.isArray(f.data) ? f.data : []);
    setList(Array.isArray(l.data) ? l.data : []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const newDraft = () => ({
    date_planif: '', heure_planif: '',
    executeur_id: '', verificateur_id: '', validateur_id: '',
    formulaire_id: '', formulaire: null,
  });

  const startNew = () => {
    setEditingId('new');
    setDraft(newDraft());
  };

  const editItem = (item) => {
    setEditingId(item.id);
    setDraft({
      date_planif: item.date_planif || '',
      heure_planif: item.heure_planif || '',
      executeur_id: item.executeur_id || item.executeur?.id || '',
      verificateur_id: item.verificateur_id || item.verificateur?.id || '',
      validateur_id: item.validateur_id || item.validateur?.id || '',
      formulaire_id: item.formulaire_id || item.formulaire?.id || '',
      formulaire: item.formulaire || null,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const updateDraft = (field, value) => {
    setDraft(p => ({ ...p, [field]: value }));
  };

  const save = async () => {
    if (!draft.date_planif) return toast.error('Date requise');
    if (!draft.executeur_id) return toast.error('Exécuteur requis');
    if (!draft.formulaire_id) return toast.error('Formulaire requis');
    if (new Date(draft.date_planif + 'T23:59:59') < new Date()) {
      return toast.error('Impossible de planifier dans le passé');
    }

    setLoading(true);
    try {
      if (editingId === 'new') {
        await planningAutreAPI.creer({
          date_planif: draft.date_planif,
          heure_planif: draft.heure_planif || null,
          executeur_id: draft.executeur_id,
          verificateur_id: draft.verificateur_id || null,
          validateur_id: draft.validateur_id || null,
          formulaire_id: draft.formulaire_id,
        });
        toast.success('Planification créée');
      } else {
        await planningAutreAPI.modifier(editingId, {
          date_planif: draft.date_planif,
          heure_planif: draft.heure_planif || null,
          executeur_id: draft.executeur_id,
          verificateur_id: draft.verificateur_id || null,
          validateur_id: draft.validateur_id || null,
          formulaire_id: draft.formulaire_id,
        });
        toast.success('Planification modifiée');
      }
      setEditingId(null);
      setDraft(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally { setLoading(false); }
  };

  const handleSupprimer = async (id) => {
    if (!window.confirm('Supprimer cette planification ?')) return;
    try {
      await planningAutreAPI.supprimer(id);
      toast.success('Supprimée');
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const canEditRow = (item) => isAdmin() || currentUser?.id === item?.executeur_id;

  const editingNew = editingId === 'new';
  const editingExisting = editingId && editingId !== 'new';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Planification libre — créez des tâches ponctuelles avec formulaire
        </p>
        <button type="button" onClick={startNew} className="btn-primary inline-flex items-center gap-2 text-sm">
          <Plus size={16} /> Nouvelle planification
        </button>
      </div>

      {editingId && draft && (
        <div className="overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Heure</th>
                  <th className="px-3 py-3">Exécuteur</th>
                  <th className="px-3 py-3">Vérificateur</th>
                  <th className="px-3 py-3">Validateur</th>
                  <th className="px-3 py-3">Formulaire</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/60 transition hover:bg-primary/[0.03]">
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      className="input w-36 py-1 text-xs"
                      value={draft.date_planif}
                      onChange={e => updateDraft('date_planif', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="time"
                      className="input w-24 py-1 text-xs"
                      value={draft.heure_planif}
                      onChange={e => updateDraft('heure_planif', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="input w-36 py-1 text-xs"
                      value={draft.executeur_id}
                      onChange={e => updateDraft('executeur_id', e.target.value)}
                    >
                      <option value="">—</option>
                      {maintenanciers.map(m => (
                        <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="input w-36 py-1 text-xs"
                      value={draft.verificateur_id}
                      onChange={e => updateDraft('verificateur_id', e.target.value)}
                    >
                      <option value="">—</option>
                      {allUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="input w-36 py-1 text-xs"
                      value={draft.validateur_id}
                      onChange={e => updateDraft('validateur_id', e.target.value)}
                    >
                      <option value="">—</option>
                      {allUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="input w-40 py-1 text-xs"
                      value={draft.formulaire_id}
                      onChange={e => updateDraft('formulaire_id', e.target.value)}
                    >
                      <option value="">—</option>
                      {allFormulaires.map(f => (
                        <option key={f.id} value={f.id}>{f.titre}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        title="Enregistrer"
                        onClick={save}
                        disabled={loading}
                        className="rounded-lg p-1.5 text-primary hover:bg-primary/10 disabled:opacity-40"
                      >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      </button>
                      <button
                        type="button"
                        title="Annuler"
                        onClick={cancelEdit}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Aucune planification libre.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Heure</th>
                  <th className="px-3 py-3">Exécuteur</th>
                  <th className="px-3 py-3">Vérificateur</th>
                  <th className="px-3 py-3">Validateur</th>
                  <th className="px-3 py-3">Formulaire</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map(item => (
                  <tr key={item.id} className="border-b border-border/60 transition hover:bg-primary/[0.03]">
                    <td className="px-3 py-2.5 font-medium">{item.date_planif}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {item.heure_planif ? item.heure_planif.slice(0, 5) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {item.executeur?.prenom} {item.executeur?.nom || '—'}
                    </td>
                    <td className="px-3 py.25 text-xs">
                      {item.verificateur?.prenom} {item.verificateur?.nom || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {item.validateur?.prenom} {item.validateur?.nom || '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2 py-1 text-xs">
                        <FileText size={12} />
                        {item.formulaire?.titre || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          title="Modifier"
                          onClick={() => editItem(item)}
                          className="rounded-lg p-1.5 text-primary hover:bg-primary/10"
                        >
                          <UserPlus size={16} />
                        </button>
                        <button
                          type="button"
                          title="Supprimer"
                          onClick={() => handleSupprimer(item.id)}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
