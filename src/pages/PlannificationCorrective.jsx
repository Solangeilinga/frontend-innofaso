import { useState, useEffect, useCallback } from 'react';
import { planningAPI, signatairesAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import {
  Save, Loader2, FileText, UserPlus, Search, AlertTriangle,
} from 'lucide-react';

function isBeforeNow(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr + 'T23:59:59') < new Date();
}

export default function PlannificationCorrective() {
  const { user: currentUser, isAdmin } = useAuth();
  const [lignes, setLignes] = useState([]);
  const [ligneId, setLigneId] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [maintenanciers, setMaintenanciers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [eqLignes, setEqLignes] = useState([]);
  const [allFormulaires, setAllFormulaires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [correctif, setCorrectif] = useState(null);
  const [assignModal, setAssignModal] = useState(false);
  const [formModal, setFormModal] = useState(false);
  const [formFilter, setFormFilter] = useState('');
  const [semInfo, setSemInfo] = useState(null);

  useEffect(() => {
    Promise.all([
      planningAPI.listerLignes(),
      planningAPI.listerMaintenanciers(),
      signatairesAPI.liste(),
      planningAPI.listerEquipementsEtLignes(),
      planningAPI.listerFormulairesDisponibles(),
    ]).then(([l, m, u, e, f]) => {
      const list = l.data?.data || (Array.isArray(l.data) ? l.data : []);
      setLignes(list);
      if (list.length) setLigneId(list[0].id);
      setMaintenanciers(m.data || []);
      setAllUsers(Array.isArray(u.data) ? u.data : []);
      setEqLignes(Array.isArray(e.data) ? e.data : []);
      setAllFormulaires(Array.isArray(f.data) ? f.data : []);
    }).catch(() => toast.error('Erreur chargement'));
  }, []);

  const chargerCorrectif = useCallback(async () => {
    if (!dateStr || !ligneId) return;
    setLoading(true);
    try {
      const r = await planningAPI.obtenirSemaineParDate({ date: dateStr, ligne_id: ligneId });
      const sem = r.data?.planning_semaine;
      const idx = r.data?.semaine_index;
      setSemInfo(sem ? { semaine: sem, index: idx } : null);
      if (sem?.id) {
        const r2 = await planningAPI.obtenirCorrectifSemaine(sem.id);
        setCorrectif(r2.data?.[0] || { planning_semaine_id: sem.id, date_intervention: dateStr });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur chargement');
    } finally { setLoading(false); }
  }, [dateStr, ligneId]);

  useEffect(() => { chargerCorrectif(); }, [chargerCorrectif]);

  const isExecutor = currentUser?.id && (correctif?.executeur_id === currentUser.id || correctif?.co_executeur_id === currentUser.id);
  const canEdit = isAdmin() || isExecutor;

  const updateField = (field, value) => {
    setCorrectif(p => ({ ...p, [field]: value }));
  };

  const datePast = dateStr && isBeforeNow(dateStr);

  const save = async (showToast = true) => {
    if (!dateStr || !ligneId) return toast.error('Sélectionnez une date');
    if (!correctif?.planning_semaine_id) return toast.error('Aucun planning semaine trouvé');

    if (datePast) {
      if (!correctif?.heure_intervention ||
          new Date(`${dateStr}T${correctif.heure_intervention}`) < new Date()) {
        return toast.error('Impossible de planifier dans le passé');
      }
    }

    try {
      await planningAPI.sauvegarderCorrectif({
        planning_semaine_id: correctif.planning_semaine_id,
        equipement_id: correctif?.equipement_id,
        equipement_libre: correctif?.equipement_libre || null,
        date_intervention: correctif?.date_intervention || dateStr,
        heure_intervention: correctif?.heure_intervention || null,
        executeur_id: correctif?.executeur_id || null,
        co_executeur_id: correctif?.co_executeur_id || null,
        verificateur_id: correctif?.verificateur_id || null,
        validateur_id: correctif?.validateur_id || null,
        duree_arret: Number(correctif?.duree_arret) || 0,
        duree_maintenance: Number(correctif?.duree_maintenance) || 0,
        cause: correctif?.cause || '',
        observations: correctif?.observations || '',
        temps_couverture: Number(correctif?.temps_couverture) || 8,
        taux_cible: Number(correctif?.taux_cible) || 90,
        commentaire: correctif?.commentaire || '',
      });
      await chargerCorrectif();
      if (showToast) toast.success('Correctif enregistré');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  };

  const taggedFormIds = new Set((correctif?.formulaires || []).map(f => f.id));

  const handleToggleForm = async (formId) => {
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

  const tauxDispo = (() => {
    const cv = Number(correctif?.temps_couverture) || 8;
    const arret = Number(correctif?.duree_arret) || 0;
    if (cv <= 0) return 0;
    return Number((((cv - arret) / cv) * 100).toFixed(2));
  })();

  const cible = Number(correctif?.taux_cible) || 90;
  const showCommentaire = tauxDispo < cible;

  return (
    <div className="space-y-4">
      <div className="card-sm flex flex-wrap items-end gap-4">
        <div className="min-w-[180px] flex-1">
          <label className="label">Ligne</label>
          <select className="input" value={ligneId} onChange={e => setLigneId(e.target.value)}>
            <option value="">— Choisir —</option>
            {lignes.map(l => (
              <option key={l.id} value={l.id}>{l.code} — {l.nom}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px] flex-1">
          <label className="label">Date de l'intervention</label>
          <input
            type="date"
            className="input"
            value={dateStr}
            onChange={e => setDateStr(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 animate-spin" size={20} /> Chargement…
        </div>
      ) : (dateStr && ligneId && semInfo) ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm">
            Semaine <span className="font-semibold text-primary">S{String(semInfo.index).padStart(2, '0')}</span>
            {' · '}{semInfo.semaine.date_debut_semaine} → {semInfo.semaine.date_fin_semaine}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3">Équipement</th>
                    <th className="px-3 py-3">Heure</th>
                    <th className="px-3 py-3">Exécuteur</th>
                    <th className="px-3 py-3">Co-exécuteur</th>
                    <th className="px-3 py-3">Vérificateur</th>
                    <th className="px-3 py-3">Validateur</th>
                    <th className="px-3 py-3">Arrêt (h)</th>
                    <th className="px-3 py-3">Durée (h)</th>
                    <th className="px-3 py-3">Couverture</th>
                    <th className="px-3 py-3">Taux</th>
                    <th className="px-3 py-3">Cible</th>
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
                          className="input w-36 py-1 text-xs"
                          value={correctif?.equipement_id || ''}
                          onChange={e => updateField('equipement_id', e.target.value)}
                          disabled={!canEdit}
                        >
                          <option value="">—</option>
                          <option value="__libre__">Saisie libre</option>
                          {eqLignes.filter(eq => eq.type === 'equipement').map(eq => (
                            <option key={eq.id} value={eq.id}>{eq.nom}</option>
                          ))}
                        </select>
                        {correctif?.equipement_id === '__libre__' && (
                          <input
                            className="input w-28 py-1 text-xs"
                            placeholder="Nom équipement"
                            value={correctif?.equipement_libre || ''}
                            onChange={e => updateField('equipement_libre', e.target.value)}
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        className="input w-24 py-1 text-xs"
                        disabled={!canEdit}
                        value={correctif?.heure_intervention || ''}
                        onChange={e => updateField('heure_intervention', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2 text-xs">{correctif?.executeur?.prenom || correctif?.executeur?.nom || '—'}</td>
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
                        type="number"
                        step="0.5"
                        className="input w-16 py-1 text-xs"
                        disabled={!canEdit}
                        value={correctif?.temps_couverture ?? 8}
                        onChange={e => updateField('temps_couverture', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                        tauxDispo >= cible
                          ? 'text-emerald-600 bg-emerald-50'
                          : tauxDispo >= 75
                            ? 'text-amber-600 bg-amber-50'
                            : 'text-red-600 bg-red-50'
                      }`}>
                        {tauxDispo}%
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="input w-16 py-1 text-xs"
                        disabled={!canEdit}
                        value={correctif?.taux_cible ?? 90}
                        onChange={e => updateField('taux_cible', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="input w-24 py-1 text-xs"
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

          {showCommentaire && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-semibold text-amber-800">
                    Taux ({tauxDispo}%) inférieur à la cible ({cible}%) — Commentaire requis
                  </label>
                  <textarea
                    className="input w-full resize-none text-sm"
                    rows={2}
                    disabled={!canEdit}
                    placeholder="Veuillez justifier / commenter…"
                    value={correctif?.commentaire || ''}
                    onChange={e => updateField('commentaire', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sélectionnez une ligne et une date pour commencer.
        </p>
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