import { useState, useEffect, useCallback } from 'react';
import { planningAPI, signatairesAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import {
  Save, Loader2, FileText, UserPlus, Check, X, Search,
} from 'lucide-react';

export default function PlannificationCorrective() {
  const { user: currentUser, isAdmin } = useAuth();
  const [semaines, setSemaines] = useState([]);
  const [semaineId, setSemaineId] = useState('');
  const [lignes, setLignes] = useState([]);
  const [maintenanciers, setMaintenanciers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [eqLignes, setEqLignes] = useState([]);
  const [allFormulaires, setAllFormulaires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [correctif, setCorrectif] = useState(null);
  const [assignModal, setAssignModal] = useState(false);
  const [formModal, setFormModal] = useState(false);
  const [formFilter, setFormFilter] = useState('');

  useEffect(() => {
    Promise.all([
      planningAPI.listerLignes(),
      planningAPI.listerMaintenanciers(),
      signatairesAPI.liste(),
      planningAPI.listerEquipementsEtLignes(),
      planningAPI.listerFormulairesDisponibles(),
    ]).then(([l, m, u, e, f]) => {
      setLignes(l.data?.data || (Array.isArray(l.data) ? l.data : []));
      setMaintenanciers(m.data || []);
      setAllUsers(Array.isArray(u.data) ? u.data : []);
      setEqLignes(Array.isArray(e.data) ? e.data : []);
      setAllFormulaires(Array.isArray(f.data) ? f.data : []);
    }).catch(() => toast.error('Erreur chargement'));
  }, []);

  useEffect(() => {
    if (lignes.length > 0 && semaines.length === 0) {
      chargerSemaines();
    }
  }, [lignes]);

  const chargerSemaines = async () => {
    try {
      const r = await planningAPI.listerSemainesPlanifiees({ ligne_id: lignes[0]?.id });
      setSemaines(Array.isArray(r.data) ? r.data : []);
    } catch {}
  };

  const chargerCorrectif = useCallback(async () => {
    if (!semaineId) return;
    setLoading(true);
    try {
      const r = await planningAPI.obtenirCorrectifSemaine(semaineId);
      setCorrectif(r.data?.[0] || { planning_semaine_id: semaineId });
    } catch {} finally { setLoading(false); }
  }, [semaineId]);

  useEffect(() => { chargerCorrectif(); }, [chargerCorrectif]);

  const sem = semaines.find(s => s.id === semaineId);
  const isExecutor = currentUser?.id && (correctif?.executeur_id === currentUser.id || correctif?.co_executeur_id === currentUser.id);
  const canEdit = isAdmin() || isExecutor;

  const updateField = (field, value) => {
    setCorrectif(p => ({ ...p, [field]: value }));
  };

  const save = async (showToast = true) => {
    if (!semaineId) return;
    try {
      await planningAPI.sauvegarderCorrectif({
        planning_semaine_id: semaineId,
        equipement_id: correctif?.equipement_id || null,
        equipement_libre: correctif?.equipement_libre || null,
        date_intervention: correctif?.date_intervention || null,
        executeur_id: correctif?.executeur_id || null,
        co_executeur_id: correctif?.co_executeur_id || null,
        verificateur_id: correctif?.verificateur_id || null,
        validateur_id: correctif?.validateur_id || null,
        duree_arret: Number(correctif?.duree_arret) || 0,
        duree_maintenance: Number(correctif?.duree_maintenance) || 0,
        cause: correctif?.cause || '',
        observations: correctif?.observations || '',
      });
      await chargerCorrectif();
      if (showToast) toast.success('Correctif enregistré');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  };

  const taggedFormIds = new Set((correctif?.formulaires || []).map(f => f.id));

  const handleToggleForm = async (formId) => {
    if (!semaineId) return;
    if (!correctif?.id) await save(false);
    try {
      await planningAPI.toggleFormulaireCorrectif({
        maintenance_corrective_id: correctif.id,
        formulaire_id: formId,
      });
      chargerCorrectif();
    } catch { toast.error('Erreur tagage formulaire'); }
  };

  const filteredForms = allFormulaires.filter(f =>
    !formFilter || f.titre.toLowerCase().includes(formFilter.toLowerCase()) || f.code.toLowerCase().includes(formFilter.toLowerCase())
  );
  const byModule = filteredForms.reduce((acc, f) => {
    const m = f.module || 'AUTRE';
    if (!acc[m]) acc[m] = [];
    acc[m].push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="card-sm flex flex-wrap items-end gap-4">
        <div className="min-w-[200px] flex-1">
          <label className="label">Semaine</label>
          <select className="input" value={semaineId} onChange={e => setSemaineId(e.target.value)}>
            <option value="">— Choisir —</option>
            {semaines.map(s => (
              <option key={s.id} value={s.id}>
                {s.ligne_code || 'Ligne'} · S{String(s.semaine_index).padStart(2, '0')} · {s.date_debut_semaine} → {s.date_fin_semaine}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-secondary text-sm" onClick={chargerSemaines}>
          <Loader2 size={14} className="mr-1" /> Recharger
        </button>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 animate-spin" size={20} /> Chargement…
        </div>
      ) : semaineId ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-3">Équipement</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Exécuteur</th>
                  <th className="px-3 py-3">Co-exécuteur</th>
                  <th className="px-3 py-3">Vérificateur</th>
                  <th className="px-3 py-3">Validateur</th>
                  <th className="px-3 py-3">Arrêt (h)</th>
                  <th className="px-3 py-3">Durée maint. (h)</th>
                  <th className="px-3 py-3">Cause</th>
                  <th className="px-3 py-3">Formulaires</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/60 transition hover:bg-primary/[0.03]">
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <select
                        className="input w-40 py-1 text-xs"
                        value={correctif?.equipement_id || ''}
                        onChange={e => updateField('equipement_id', e.target.value)}
                      >
                        <option value="">—</option>
                        <option value="__libre__">✏️ Saisie libre</option>
                        {eqLignes.filter(eq => eq.type === 'equipement').map(eq => (
                          <option key={eq.id} value={eq.id}>
                            {eq.nom}
                          </option>
                        ))}
                      </select>
                      {correctif?.equipement_id === '__libre__' && (
                        <input
                          className="input w-32 py-1 text-xs"
                          placeholder="Nom équipement"
                          value={correctif?.equipement_libre || ''}
                          onChange={e => updateField('equipement_libre', e.target.value)}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      className="input w-32 py-1 text-xs"
                      value={correctif?.date_intervention || ''}
                      onChange={e => updateField('date_intervention', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">{correctif?.executeur?.prenom || correctif?.executeur?.nom || '—'}</td>
                  <td className="px-3 py-2 text-xs">{correctif?.co_executeur?.prenom || correctif?.co_executeur?.nom || '—'}</td>
                  <td className="px-3 py-2 text-xs">{correctif?.verificateur?.prenom || correctif?.verificateur?.nom || '—'}</td>
                  <td className="px-3 py-2 text-xs">{correctif?.validateur?.prenom || correctif?.validateur?.nom || '—'}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      className="input w-16 py-1 text-xs"
                      disabled={!canEdit}
                      value={correctif?.duree_arret ?? 0}
                      onChange={e => updateField('duree_arret', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      className="input w-16 py-1 text-xs"
                      disabled={!canEdit}
                      value={correctif?.duree_maintenance ?? 0}
                      onChange={e => updateField('duree_maintenance', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="input w-28 py-1 text-xs"
                      disabled={!canEdit}
                      value={correctif?.cause || ''}
                      onChange={e => updateField('cause', e.target.value)}
                      placeholder="Cause…"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      title="Formulaires"
                      onClick={() => setFormModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2 py-1 text-xs font-medium hover:bg-primary/10"
                    >
                      <FileText size={13} />
                      <span>{(correctif?.formulaires || []).length}</span>
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        title="Assigner"
                        onClick={() => setAssignModal(true)}
                        className="rounded-lg p-1.5 text-primary hover:bg-primary/10"
                      >
                        <UserPlus size={16} />
                      </button>
                      <button
                        type="button"
                        title="Enregistrer"
                        onClick={save}
                        className="rounded-lg p-1.5 text-foreground hover:bg-muted"
                      >
                        <Save size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">Sélectionnez une semaine.</p>
      )}

      {assignModal && (
        <div className="modal-overlay">
          <div className="modal max-w-md p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Assigner la maintenance à</h3>
              <button onClick={() => setAssignModal(false)}>✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label-req">Exécuteur</label>
                <select
                  className="input"
                  value={correctif?.executeur_id || ''}
                  onChange={e => updateField('executeur_id', e.target.value)}
                >
                  <option value="">—</option>
                  {maintenanciers.map(m => (
                    <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Co-exécuteur</label>
                <select
                  className="input"
                  value={correctif?.co_executeur_id || ''}
                  onChange={e => updateField('co_executeur_id', e.target.value)}
                >
                  <option value="">— Aucun —</option>
                  {maintenanciers.map(m => (
                    <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-req">Vérificateur</label>
                <select
                  className="input"
                  value={correctif?.verificateur_id || ''}
                  onChange={e => updateField('verificateur_id', e.target.value)}
                >
                  <option value="">—</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-req">Validateur</label>
                <select
                  className="input"
                  value={correctif?.validateur_id || ''}
                  onChange={e => updateField('validateur_id', e.target.value)}
                >
                  <option value="">—</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => setAssignModal(false)}>Fermer</button>
                <button className="btn-primary flex-1" onClick={() => { setAssignModal(false); save(); }}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {formModal && (
        <div className="modal-overlay">
          <div className="modal max-w-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Formulaires correctif</h3>
              <button onClick={() => setFormModal(false)}>✕</button>
            </div>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="input w-full pl-8 py-2 text-sm"
                placeholder="Rechercher un formulaire…"
                value={formFilter}
                onChange={e => setFormFilter(e.target.value)}
              />
            </div>
            {Object.entries(byModule).map(([mod, forms]) => (
              <div key={mod} className="mb-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{mod}</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {forms.map(f => {
                    const tagged = taggedFormIds.has(f.id);
                    return (
                      <label
                        key={f.id}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${
                          tagged ? 'border-primary/30 bg-primary/8' : 'border-border hover:bg-muted'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={tagged}
                          onChange={() => handleToggleForm(f.id)}
                        />
                        <span className="flex-1 font-medium">{f.titre}</span>
                        <span className="text-[10px] text-muted-foreground">{f.code}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="mt-4 flex justify-end">
              <button className="btn-primary px-6" onClick={() => setFormModal(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
