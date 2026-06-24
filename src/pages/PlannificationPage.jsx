import { useState, useEffect, useMemo, useCallback } from 'react';
import { planningAPI, signatairesAPI, planningAutreAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import {
  Calendar, ChevronLeft, ChevronRight, History, LayoutGrid,
  Save, UserPlus, Loader2, Plus, Trash2, FileText, X, Check, Search, Wrench, AlertTriangle,
} from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import PlannificationCorrective from './PlannificationCorrective';
import PlannificationAutre from './PlannificationAutre';

const SEMAINES = [1, 2, 3, 4];
const COUVERTURE_DEF = 8;
const canEditTimes = (row, isAdminFn, currentUserId) =>
  !row.locked && (isAdminFn() || row.isExecutor);

function calcTaux(couverture, arret) {
  if (!couverture || couverture <= 0) return 0;
  return Number((((couverture - arret) / couverture) * 100).toFixed(2));
}

function tauxClass(t, cible) {
  const seuil = cible || 90;
  if (t >= seuil) return 'text-emerald-600 bg-emerald-50';
  if (t >= 75) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

export default function PlannificationPage() {
  const { peutGerer } = useAuth();
  const navigate = useNavigate();
  return peutGerer() ? (
    <PlanningAdmin onBack={() => navigate('/planning')} />
  ) : (
    <PlanningConsultation onBack={() => navigate('/planning')} />
  );
}

function PlanningAdmin({ onBack }) {
  const { user: currentUser, isAdmin, peutGerer } = useAuth();
  const now = new Date();

  const [tab, setTab] = useState('planning');
  const [lignes, setLignes] = useState([]);
  const [maintenanciers, setMaintenanciers] = useState([]);
  const [selectedLigne, setSelectedLigne] = useState('');
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [semaineIndex, setSemaineIndex] = useState(
    Math.min(4, Math.ceil(now.getDate() / 7))
  );
  const [data, setData] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [historiqueCorrectif, setHistoriqueCorrectif] = useState([]);
  const [historiqueAutre, setHistoriqueAutre] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [assignRow, setAssignRow] = useState(null);
  const [showAddCreneau, setShowAddCreneau] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [allFormulaires, setAllFormulaires] = useState([]);
  const [formulairesModal, setFormulairesModal] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [histoTab, setHistoTab] = useState('preventif');

  useEffect(() => {
    Promise.all([
      planningAPI.listerLignes(),
      planningAPI.listerMaintenanciers(),
      planningAPI.listerFormulairesDisponibles(),
      signatairesAPI.liste(),
    ])
      .then(([l, m, f, u]) => {
        setLignes(l.data?.data || (Array.isArray(l.data) ? l.data : []));
        setMaintenanciers(m.data);
        setAllFormulaires(Array.isArray(f.data) ? f.data : []);
        setAllUsers(Array.isArray(u.data) ? u.data : []);
        if (l.data.length) setSelectedLigne(l.data[0].id);
      })
      .catch(() => toast.error('Erreur chargement des références'));
  }, []);

  const loadPlanning = useCallback(() => {
    if (!selectedLigne) return;
    setLoading(true);
    planningAPI
      .obtenirPlanningMois({
        ligne_id: selectedLigne,
        mois,
        annee,
        semaine_index: semaineIndex,
      })
      .then(r => setData(r.data))
      .catch(() => toast.error('Impossible de charger le planning'))
      .finally(() => setLoading(false));
  }, [selectedLigne, mois, annee, semaineIndex]);

  const loadHistorique = useCallback(() => {
    Promise.all([
      planningAPI.listerHistorique({ ligne_id: selectedLigne || undefined, mois, annee }),
      planningAPI.listerHistoriqueCorrectif({ ligne_id: selectedLigne || undefined, mois, annee }),
      planningAutreAPI.historique({ mois, annee }),
    ])
      .then(([prev, corr, autre]) => {
        setHistorique(prev.data);
        setHistoriqueCorrectif(corr.data);
        setHistoriqueAutre(autre.data);
      })
      .catch(() => toast.error('Erreur historique'));
  }, [selectedLigne, mois, annee]);

  useEffect(() => {
    if (tab === 'planning') loadPlanning();
    else if (tab === 'historique') loadHistorique();
  }, [tab, loadPlanning, loadHistorique]);

  const isPastDate = (dateStr) => isPast(parseISO(dateStr));

  const rows = useMemo(() => {
    if (!data?.jours || !data?.quarts_ref) return [];
    const out = [];
    for (const jour of data.jours) {
      for (const quart of data.quarts_ref) {
        const assigned = (jour.quarts_assignes || []).find(q => q.quart_id === quart.id);
        const li = assigned?.ligne_intervention;
        const arret = li?.duree_arret ?? 0;
        const couverture = li?.temps_couverture ?? COUVERTURE_DEF;
        const taux = li?.taux_disponibilite ?? calcTaux(couverture, arret);
        out.push({
          key: `${jour.id}-${quart.id}`,
          jour,
          quart,
          assigned,
          planning_quart_id: assigned?.id || null,
          planning_jour_id: jour.id,
          date_jour: jour.date_jour,
          locked: isPastDate(jour.date_jour),
          jour_semaine: jour.jour_semaine,
          maintenancier_nom: assigned?.maintenancier_nom,
          maintenancier_id: assigned?.maintenancier_id,
          co_maintenancier_nom: assigned?.co_maintenancier_nom,
          verificateur_nom: assigned?.verificateur_nom,
          validateur_nom: assigned?.validateur_nom,
          verificateur_id: assigned?.verificateur_id,
          validateur_id: assigned?.validateur_id,
          isExecutor: currentUser?.id === assigned?.maintenancier_id,
          duree_arret: arret,
          temps_couverture: couverture,
          taux_disponibilite: taux,
          taux_cible: li?.taux_cible ?? 90,
          cause: li?.cause_indisponibilite || '',
          commentaire: li?.commentaire || '',
          interventions: assigned?.interventions || [],
          formulaires: assigned?.formulaires || [],
          ligne_code: data.ligne?.code,
        });
      }
    }
    return out;
  }, [data, currentUser]);

  const shiftMonth = dir => {
    let m = mois + dir;
    let a = annee;
    if (m > 12) { m = 1; a += 1; }
    if (m < 1) { m = 12; a -= 1; }
    setMois(m);
    setAnnee(a);
  };

  const moisLabel = format(new Date(annee, mois - 1, 1), 'MMMM yyyy', { locale: fr });

  const saveAssign = async form => {
    try {
      await planningAPI.assignerMaintenancierQuart({
        planning_jour_id: assignRow.planning_jour_id,
        quartId: assignRow.quart.id,
        maintenancier_id: form.maintenancier_id,
        co_maintenancier_id: form.co_maintenancier_id || null,
        verificateur_id: form.verificateur_id || null,
        validateur_id: form.validateur_id || null,
      });
      toast.success('Assignation enregistrée');
      setAssignRow(null);
      loadPlanning();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur');
    }
  };

  const updateLigneForQuart = async (planningQuartId, ligneId) => {
    try {
      await planningAPI.mettreAJourLigneQuart({
        planning_quart_id: planningQuartId,
        ligne_id: ligneId,
      });
      toast.success('Ligne mise à jour');
      loadPlanning();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur');
    }
  };

  const saveRowInline = async row => {
    if (!row.planning_quart_id) {
      return toast.error('Assignez d\'abord un maintenancier');
    }
    try {
      await planningAPI.mettreAJourInterventionLigne({
        planning_quart_id: row.planning_quart_id,
        duree_arret_agregee: Number(row.duree_arret) || 0,
        cause_indisponibilite: row.cause,
        commentaire: row.commentaire || '',
        temps_couverture: Number(row.temps_couverture) || COUVERTURE_DEF,
        taux_cible: row.taux_cible ? Number(row.taux_cible) : undefined,
      });
      toast.success('Enregistré');
      loadPlanning();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur');
    }
  };

  const deleteCreneau = async planningQuartId => {
    if (!window.confirm('Supprimer ce créneau planifié ?')) return;
    try {
      await planningAPI.supprimerPlanningQuart(planningQuartId);
      toast.success('Créneau supprimé');
      loadPlanning();
    } catch {
      toast.error('Erreur suppression');
    }
  };

  const saveLigneEdit = async () => {
    if (!editRow?.planning_quart_id) {
      return toast.error('Assignez d\'abord un maintenancier au quart');
    }
    try {
      await planningAPI.mettreAJourInterventionLigne({
        planning_quart_id: editRow.planning_quart_id,
        duree_arret_agregee: Number(editRow.duree_arret) || 0,
        cause_indisponibilite: editRow.cause,
        commentaire: editRow.commentaire || '',
        temps_couverture: Number(editRow.temps_couverture) || COUVERTURE_DEF,
        taux_cible: editRow.taux_cible ? Number(editRow.taux_cible) : undefined,
      });
      toast.success('Ligne mise à jour');
      setEditRow(null);
      loadPlanning();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur');
    }
  };

  const ligneNom = lignes.find(l => l.id === selectedLigne);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6">
      <header className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-background to-secondary/5 p-6 shadow-sm">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Calendar size={22} />
              <span className="text-xs font-semibold uppercase tracking-widest">Planification</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">Planification maintenance</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Planifiez les quarts, assignez les exécuteurs, vérificateurs et validateurs pour chaque formulaire.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary inline-flex items-center gap-2 text-sm"
            >
              ← Retour au processus
            </button>
            <button
              type="button"
              onClick={() => setShowAddCreneau(true)}
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              <Plus size={16} /> Ajouter un créneau
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-1 shadow-sm">
        {[
          { id: 'planning', label: 'Préventif', icon: LayoutGrid },
          { id: 'correctif', label: 'Correctif', icon: Wrench },
          { id: 'autre', label: 'Autre', icon: FileText },
          { id: 'historique', label: 'Historique', icon: History },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition sm:flex-none ${
              tab === id ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="card-sm flex flex-wrap items-end gap-4">
        <div className="min-w-[140px] flex-1">
          <label className="label">Ligne</label>
          <select value={selectedLigne} onChange={e => setSelectedLigne(e.target.value)} className="select input">
            <option value="">Toutes les lignes</option>
            {lignes.map(l => (
              <option key={l.id} value={l.id}>{l.code} — {l.nom}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Période</label>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-input px-1">
            <button type="button" onClick={() => shiftMonth(-1)} className="rounded p-2 hover:bg-muted">
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[130px] px-2 text-center text-sm font-semibold capitalize">{moisLabel}</span>
            <button type="button" onClick={() => shiftMonth(1)} className="rounded p-2 hover:bg-muted">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        {tab === 'planning' && (
          <div className="flex gap-1">
            {SEMAINES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSemaineIndex(s)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  semaineIndex === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                S{String(s).padStart(2, '0')}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'planning' && (
        <>
          {data && (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{data.semaine_libelle}</span>
              {' · '}{data.date_debut} → {data.date_fin}
              {' · '}<span className="text-primary">{ligneNom?.code}</span>
            </p>
          )}

          {loading ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 animate-spin" size={24} /> Chargement…
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-3">Semaine</th>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Quart</th>
                      <th className="px-3 py-3">Exécuteur</th>
                      <th className="px-3 py-3">Co-exécuteur</th>
                      <th className="px-3 py-3">Vérificateur</th>
                      <th className="px-3 py-3">Validateur</th>
                      <th className="px-3 py-3">Ligne</th>
                      <th className="px-3 py-3">Arrêt (h)</th>
                      <th className="px-3 py-3">Couverture</th>
                      <th className="px-3 py-3">Taux dispo.</th>
                      <th className="px-3 py-3">Cible</th>
                      <th className="px-3 py-3">Cause</th>
                      <th className="px-3 py-3">Formulaires</th>
                      <th className="px-3 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.key} className="border-b border-border/60 transition hover:bg-primary/[0.03]">
                        <td className="px-3 py-2.5 font-medium text-primary">
                          {data?.semaine_libelle?.replace('Semaine ', 'S') || `S${String(semaineIndex).padStart(2, '0')}`}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="font-medium">{row.jour_semaine}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(parseISO(row.date_jour), 'dd/MM/yyyy')}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium">{row.quart.nom}</div>
                          <div className="text-xs text-muted-foreground">{row.quart.description}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          {row.maintenancier_nom ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                              {row.maintenancier_nom}
                            </span>
                          ) : (
                            <span className="text-xs italic text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs">{row.co_maintenancier_nom || '—'}</td>
                        <td className="px-3 py-2.5 text-xs">
                          {row.verificateur_nom || <span className="italic text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          {row.validateur_nom || <span className="italic text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            className="input py-1 text-xs w-24"
                            disabled={row.locked || !isAdmin()}
                            value={drafts[row.key]?.ligne_id || row.ligne_id || ''}
                            onChange={e => {
                              const selectedLigne = lignes.find(l => l.id === e.target.value);
                              setDrafts(p => ({
                                ...p,
                                [row.key]: { 
                                  ...p[row.key], 
                                  ligne_id: e.target.value,
                                  ligne_code: selectedLigne?.code || ''
                                }
                              }));
                              if (row.planning_quart_id) {
                                updateLigneForQuart(row.planning_quart_id, e.target.value);
                              }
                            }}
                          >
                            <option value="">—</option>
                            {lignes.map(l => (
                              <option key={l.id} value={l.id}>{l.code}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="input w-16 py-1 text-xs"
                            disabled={row.locked || (!isAdmin() && !row.isExecutor)}
                            value={drafts[row.key]?.duree_arret ?? row.duree_arret}
                            onChange={e =>
                              setDrafts(p => ({
                                ...p,
                                [row.key]: { ...p[row.key], duree_arret: e.target.value },
                              }))
                            }
                            onBlur={() =>
                              saveRowInline({
                                ...row,
                                ...drafts[row.key],
                                duree_arret: drafts[row.key]?.duree_arret ?? row.duree_arret,
                                temps_couverture: drafts[row.key]?.temps_couverture ?? row.temps_couverture,
                                cause: drafts[row.key]?.cause ?? row.cause,
                                taux_cible: drafts[row.key]?.taux_cible ?? row.taux_cible,
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            step="0.5"
                            className="input w-16 py-1 text-xs"
                            disabled={row.locked || (!isAdmin() && !row.isExecutor)}
                            value={drafts[row.key]?.temps_couverture ?? row.temps_couverture}
                            onChange={e =>
                              setDrafts(p => ({ ...p, [row.key]: { ...p[row.key], temps_couverture: e.target.value } }))
                            }
                            onBlur={e => {
                              const merged = {
                                ...row,
                                temps_couverture: e.target.value,
                                duree_arret: drafts[row.key]?.duree_arret ?? row.duree_arret,
                                cause: drafts[row.key]?.cause ?? row.cause,
                                taux_cible: drafts[row.key]?.taux_cible ?? row.taux_cible,
                              };
                              saveRowInline(merged);
                            }}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${tauxClass(row.taux_disponibilite, row.taux_cible)}`}>
                            {Number(row.taux_disponibilite).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="input w-16 py-1 text-xs"
                            disabled={row.locked || (!isAdmin() && !row.isExecutor)}
                            value={drafts[row.key]?.taux_cible ?? row.taux_cible}
                            onChange={e =>
                              setDrafts(p => ({ ...p, [row.key]: { ...p[row.key], taux_cible: e.target.value } }))
                            }
                            onBlur={() => {
                              const merged = {
                                ...row,
                                taux_cible: drafts[row.key]?.taux_cible ?? row.taux_cible,
                                duree_arret: drafts[row.key]?.duree_arret ?? row.duree_arret,
                                temps_couverture: row.temps_couverture,
                                cause: drafts[row.key]?.cause ?? row.cause,
                              };
                              saveRowInline(merged);
                            }}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            className="input w-full min-w-[100px] py-1 text-xs"
                            disabled={row.locked || (!isAdmin() && !row.isExecutor)}
                            value={drafts[row.key]?.cause ?? row.cause}
                            onChange={e =>
                              setDrafts(p => ({ ...p, [row.key]: { ...p[row.key], cause: e.target.value } }))
                            }
                            onBlur={() =>
                              saveRowInline({
                                ...row,
                                cause: drafts[row.key]?.cause ?? row.cause,
                                duree_arret: drafts[row.key]?.duree_arret ?? row.duree_arret,
                                temps_couverture: row.temps_couverture,
                                taux_cible: drafts[row.key]?.taux_cible ?? row.taux_cible,
                              })
                            }
                            placeholder="Cause…"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            title="Gérer les formulaires"
                            disabled={!row.planning_quart_id || row.locked}
                            onClick={() => setFormulairesModal(row)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2 py-1 text-xs font-medium hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <FileText size={13} />
                            {row.formulaires.length > 0
                              ? <span className="rounded-full bg-primary text-primary-foreground px-1.5 text-[10px]">{row.formulaires.length}</span>
                              : <span className="text-muted-foreground">Taguer</span>
                            }
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              title="Assigner les acteurs"
                              disabled={row.locked}
                              onClick={() => setAssignRow(row)}
                              className="rounded-lg p-1.5 text-primary hover:bg-primary/10 disabled:opacity-30"
                            >
                              <UserPlus size={16} />
                            </button>
                            <button
                              type="button"
                              title="Enregistrer tout"
                              disabled={!row.assigned || row.locked}
                              onClick={() => setEditRow({ ...row, ...drafts[row.key] })}
                              className="rounded-lg p-1.5 text-foreground hover:bg-muted disabled:opacity-30"
                            >
                              <Save size={16} />
                            </button>
                            {row.planning_quart_id && (
                              <button
                                type="button"
                                title="Supprimer"
                                disabled={row.locked}
                                onClick={() => deleteCreneau(row.planning_quart_id)}
                                className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-30"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.some(r => r.interventions?.length > 0) && (
                <div className="border-t border-border bg-muted/30 px-4 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Détail machines (corrective → agrégé sur la ligne)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rows.flatMap(r =>
                      (r.interventions || []).map(i => (
                        <span
                          key={i.id}
                          className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                        >
                          {i.equipement_code}: {i.duree_arret}h
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'correctif' && (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">
            <AlertTriangle size={14} className="mr-1 inline text-amber-500" />
            Maintenance corrective — planification par semaine
          </p>
          <PlannificationCorrective />
        </div>
      )}

      {tab === 'autre' && (
        <PlannificationAutre />
      )}

      {tab === 'historique' && (
        <div className="space-y-4">
          <div className="flex gap-2 rounded-lg border border-border bg-card p-1 shadow-sm w-fit">
              {[
                { id: 'preventif', label: 'Préventif', icon: LayoutGrid },
                { id: 'correctif', label: 'Correctif', icon: Wrench },
                { id: 'autre', label: 'Autre', icon: FileText },
              ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setHistoTab(id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium transition ${
                  histoTab === id ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {histoTab === 'preventif' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {historique.length === 0 ? (
                <p className="col-span-full py-12 text-center text-muted-foreground">Aucun historique préventif.</p>
              ) : (
                historique.map(h => (
                  <div key={h.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase text-primary">
                      Semaine {String(h.semaine_index).padStart(2, '0')}
                    </div>
                    <div className="mt-1 font-bold">{h.ligne_code}</div>
                    <div className="text-xs text-muted-foreground">
                      {h.date_debut_semaine} → {h.date_fin_semaine}
                    </div>
                    <div className="mt-3 flex justify-between text-sm">
                      <span>Arrêt total</span>
                      <span className="font-semibold text-red-600">{Number(h.total_arret_ligne).toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Disponibilité moy.</span>
                      <span className={`font-semibold ${tauxClass(h.avg_disponibilite || 0).split(' ')[0]}`}>
                        {h.avg_disponibilite != null ? `${Number(h.avg_disponibilite).toFixed(1)}%` : '—'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="mt-3 w-full rounded-lg bg-muted py-1.5 text-xs font-medium hover:bg-primary/10 hover:text-primary"
                      onClick={() => {
                        setSemaineIndex(h.semaine_index);
                        setTab('planning');
                      }}
                    >
                      Ouvrir dans le planning
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {histoTab === 'correctif' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {historiqueCorrectif.length === 0 ? (
                <p className="col-span-full py-12 text-center text-muted-foreground">Aucun historique correctif.</p>
              ) : (
                historiqueCorrectif.map(h => (
                  <div key={h.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase text-primary">
                      S{String(h.semaine_index).padStart(2, '0')}
                    </div>
                    <div className="mt-1 font-bold">{h.equipement_nom || h.equipement_libre || 'Équipement'}</div>
                    <div className="text-xs text-muted-foreground">
                      {h.date_intervention || '—'}
                    </div>
                    <div className="mt-3 flex justify-between text-sm">
                      <span>Arrêt</span>
                      <span className="font-semibold text-red-600">{Number(h.duree_arret).toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Maintenance</span>
                      <span className="font-semibold">{Number(h.duree_maintenance).toFixed(1)}h</span>
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                      <span>Exécuteur</span>
                      <span>{h.executeur?.prenom} {h.executeur?.nom || '—'}</span>
                    </div>
                    {h.cause && <p className="mt-2 text-xs text-muted-foreground truncate">{h.cause}</p>}
                    <button
                      type="button"
                      className="mt-3 w-full rounded-lg bg-muted py-1.5 text-xs font-medium hover:bg-primary/10 hover:text-primary"
                      onClick={() => {
                        setTab('correctif');
                      }}
                    >
                      Ouvrir dans le planning
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {histoTab === 'autre' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {historiqueAutre.length === 0 ? (
                <p className="col-span-full py-12 text-center text-muted-foreground">Aucun historique autre.</p>
              ) : (
                historiqueAutre.map(h => (
                  <div key={h.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase text-primary">
                      {h.date_planif}
                    </div>
                    <div className="mt-1 font-bold">{h.formulaire?.titre || 'Planification'}</div>
                    <div className="text-xs text-muted-foreground">
                      {h.heure_planif ? h.heure_planif.slice(0, 5) : ''}
                    </div>
                    <div className="mt-3 flex justify-between text-sm">
                      <span>Exécuteur</span>
                      <span className="font-semibold">{h.executeur?.prenom} {h.executeur?.nom || '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Vérificateur</span>
                      <span>{h.verificateur?.prenom} {h.verificateur?.nom || '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Validateur</span>
                      <span>{h.validateur?.prenom} {h.validateur?.nom || '—'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      )}

      {assignRow && (
        <AssignQuartModal
          row={assignRow}
          maintenanciers={maintenanciers}
          quarts={data?.quarts_ref || []}
          onSave={saveAssign}
          onClose={() => setAssignRow(null)}
        />
      )}

      {showAddCreneau && data && (
        <Modal title="Ajouter un créneau de planning" onClose={() => setShowAddCreneau(false)}>
          <form
            onSubmit={async e => {
              e.preventDefault();
              const fd = new FormData(e.target);
              try {
                const { data: pq } = await planningAPI.assignerMaintenancierQuart({
                  planning_jour_id: fd.get('planning_jour_id'),
                  quartId: fd.get('quart_id'),
                  maintenancier_id: fd.get('maintenancier_id'),
                  co_maintenancier_id: fd.get('co_maintenancier_id') || null,
                  verificateur_id: fd.get('verificateur_id') || null,
                  validateur_id: fd.get('validateur_id') || null,
                });
                if (pq?.id) {
                  await planningAPI.mettreAJourInterventionLigne({
                    planning_quart_id: pq.id,
                    duree_arret_agregee: Number(fd.get('duree_arret')) || 0,
                    cause_indisponibilite: fd.get('cause') || '',
                    temps_couverture: Number(fd.get('temps_couverture')) || 8,
                  });
                }
                toast.success('Créneau ajouté');
                setShowAddCreneau(false);
                loadPlanning();
              } catch (err) {
                toast.error(err.response?.data?.message || err.response?.data?.error || 'Erreur');
              }
            }}
            className="space-y-3"
          >
            <div>
              <label className="label-req">Jour</label>
              <select name="planning_jour_id" className="input" required>
                {data.jours?.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.jour_semaine} {j.date_jour}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-req">Quart</label>
              <select name="quart_id" className="input" required>
                {data.quarts_ref?.map(q => (
                  <option key={q.id} value={q.id}>{q.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-req">Exécuteur</label>
              <select name="maintenancier_id" className="input" required>
                <option value="">—</option>
                {maintenanciers.map(m => (
                  <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Co-exécuteur</label>
              <select name="co_maintenancier_id" className="input">
                <option value="">—</option>
                {maintenanciers.map(m => (
                  <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-req">Vérificateur</label>
              <select name="verificateur_id" className="input" required>
                <option value="">—</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-req">Validateur</label>
              <select name="validateur_id" className="input" required>
                <option value="">—</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Arrêt (h)</label>
                <input name="duree_arret" type="number" step="0.5" defaultValue="0" className="input" />
              </div>
              <div>
                <label className="label">Couverture (h)</label>
                <input name="temps_couverture" type="number" step="0.5" defaultValue="8" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Cause</label>
              <input name="cause" className="input" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowAddCreneau(false)}>
                Annuler
              </button>
              <button type="submit" className="btn-primary flex-1">Créer</button>
            </div>
          </form>
        </Modal>
      )}

      {editRow && (
        <Modal title="Modifier la ligne de production" onClose={() => setEditRow(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Durée d&apos;arrêt (h)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="input"
                  value={editRow.duree_arret}
                  onChange={e => setEditRow(p => ({ ...p, duree_arret: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Temps couverture (h)</label>
                <input
                  type="number"
                  step="0.5"
                  className="input"
                  value={editRow.temps_couverture}
                  onChange={e => setEditRow(p => ({ ...p, temps_couverture: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Taux cible (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input"
                  value={editRow.taux_cible}
                  onChange={e => setEditRow(p => ({ ...p, taux_cible: e.target.value }))}
                />
              </div>
              <div className="flex items-end pb-2">
                <p className="text-sm">
                  Taux calculé :{' '}
                  <strong className={tauxClass(calcTaux(editRow.temps_couverture, editRow.duree_arret), editRow.taux_cible).split(' ')[0]}>
                    {calcTaux(editRow.temps_couverture, editRow.duree_arret)}%
                  </strong>
                  {' '}(cible {editRow.taux_cible || 90}%)
                </p>
              </div>
            </div>
            <div>
              <label className="label">Cause</label>
              <textarea
                className="input resize-none"
                rows={2}
                value={editRow.cause}
                onChange={e => setEditRow(p => ({ ...p, cause: e.target.value }))}
              />
            </div>
            {calcTaux(editRow.temps_couverture, editRow.duree_arret) < (editRow.taux_cible || 90) && (
              <div>
                <label className="label font-semibold text-amber-700">
                  Commentaire (taux {calcTaux(editRow.temps_couverture, editRow.duree_arret)}% inférieur à la cible)
                </label>
                <textarea
                  className="input resize-none border-amber-300 focus:border-amber-500"
                  rows={2}
                  value={editRow.commentaire || ''}
                  onChange={e => setEditRow(p => ({ ...p, commentaire: e.target.value }))}
                  placeholder="Veuillez justifier / commenter…"
                />
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setEditRow(null)}>Annuler</button>
              <button type="button" className="btn-primary flex-1" onClick={saveLigneEdit}>Sauvegarder</button>
            </div>
          </div>
        </Modal>
      )}
      {formulairesModal && (
        <FormulairesModal
          row={formulairesModal}
          allFormulaires={allFormulaires}
          readOnly={formulairesModal.locked}
          onClose={() => setFormulairesModal(null)}
          onToggle={async (formulaireId) => {
            try {
              await planningAPI.toggleFormulaireQuart({
                planning_quart_id: formulairesModal.planning_quart_id,
                formulaire_id: formulaireId,
              });
              loadPlanning();
            } catch {
              toast.error('Erreur lors du tagage du formulaire');
            }
          }}
        />
      )}
    </div>
  );
}

function FormulairesModal({ row, allFormulaires, readOnly = false, onClose, onToggle }) {
  const [pendingToggle, setPendingToggle] = useState(null);
  const [filter, setFilter] = useState('');

  const taggedIds = new Set((row.formulaires || []).map(f => f.id));

  const handleToggle = async (id) => {
    setPendingToggle(id);
    await onToggle(id);
    setPendingToggle(null);
  };

  const filtered = allFormulaires.filter(f =>
    !filter || f.titre.toLowerCase().includes(filter.toLowerCase()) || f.code.toLowerCase().includes(filter.toLowerCase())
  );

  const byModule = filtered.reduce((acc, f) => {
    const m = f.module || 'AUTRE';
    if (!acc[m]) acc[m] = [];
    acc[m].push(f);
    return acc;
  }, {});

  return (
    <div className="modal-overlay">
      <div className="modal max-w-xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">{readOnly ? 'Formulaires planifiés' : 'Taguer des formulaires'}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {row.jour_semaine} — {row.quart?.nom || row.quart?.nom || ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {readOnly ? (
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {row.formulaires?.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucun formulaire planifié pour cette journée.</p>
            ) : (
              row.formulaires.map(f => (
                <div key={f.id} className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                  <FileText size={16} className="text-primary flex-shrink-0" />
                  <span className="flex-1 font-medium">{f.titre}</span>
                  <span className="text-[10px] text-muted-foreground">{f.code}</span>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="input w-full pl-8 py-2 text-sm"
                placeholder="Rechercher un formulaire…"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>

            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucun résultat.</p>
            ) : (
              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                {Object.entries(byModule).map(([module, forms]) => (
                  <div key={module}>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {module}
                    </p>
                    <ul className="space-y-1">
                      {forms.map(f => {
                        const tagged = taggedIds.has(f.id);
                        return (
                          <li key={f.id}>
                            <label
                              className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                                tagged
                                  ? 'border-primary/30 bg-primary/8 text-primary'
                                  : 'border-border bg-card hover:bg-muted'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-primary"
                                checked={tagged}
                                disabled={pendingToggle === f.id}
                                onChange={() => handleToggle(f.id)}
                              />
                              <span className="flex-1 font-medium">{f.titre}</span>
                              <span className="text-[10px] text-muted-foreground">{f.code}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-4 flex justify-end">
          <button type="button" className="btn-primary px-6" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

function AssignQuartModal({ row, maintenanciers, quarts = [], onSave, onClose }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    signatairesAPI.liste()
      .then(r => setUsers(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  return (
    <Modal title="Assigner la maintenance à" onClose={onClose}>
      <form
        onSubmit={e => {
          e.preventDefault();
          const fd = new FormData(e.target);
          onSave({
            maintenancier_id: fd.get('maintenancier_id'),
            co_maintenancier_id: fd.get('co_maintenancier_id'),
            verificateur_id: fd.get('verificateur_id'),
            validateur_id: fd.get('validateur_id'),
          });
        }}
        className="space-y-4"
      >
        <p className="text-sm text-muted-foreground">
          {row.jour_semaine} {row.date_jour} — {row.quart.nom}
        </p>
        <div>
          <label className="label-req">Exécuteur</label>
          <select name="maintenancier_id" className="input" required defaultValue={row.assigned?.maintenancier_id || ''}>
            <option value="">— Choisir —</option>
            {maintenanciers.map(m => (
              <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>
            ))}
            {quarts.map(q => (
              <option key={q.id} value={`quart_${q.id}`}>{q.nom} ({q.heure_debut}h-{q.heure_fin}h)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Co-exécuteur</label>
          <select name="co_maintenancier_id" className="input" defaultValue={row.assigned?.co_maintenancier_id || ''}>
            <option value="">— Aucun —</option>
            {maintenanciers.map(m => (
              <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-req">Vérificateur</label>
          <select name="verificateur_id" className="input" required defaultValue={row.assigned?.verificateur_id || row.assigned?.maintenancier_id || ''}>
            <option value="">— Choisir —</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.label || `${u.prenom} ${u.nom}`}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-req">Validateur</label>
          <select name="validateur_id" className="input" required defaultValue={row.assigned?.validateur_id || row.assigned?.maintenancier_id || ''}>
            <option value="">— Choisir —</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.label || `${u.prenom} ${u.nom}`}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary flex-1">Enregistrer</button>
        </div>
      </form>
    </Modal>
  );
}

function PlanningConsultation({ onBack }) {
  const { user, peutGerer } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [selectedLigne, setSelectedLigne] = useState('');
  const [mois, setMois] = useState(new Date().getMonth() + 1);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [semaineIndex, setSemaineIndex] = useState(
    Math.min(4, Math.ceil(new Date().getDate() / 7))
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    planningAPI.listerLignes()
      .then(r => {
        const list = r.data?.data || (Array.isArray(r.data) ? r.data : []);
        setLignes(list);
        if (list.length) setSelectedLigne(list[0].id);
      })
      .catch(() => {});
  }, []);

  const loadPlanning = useCallback(() => {
    if (!selectedLigne) return;
    setLoading(true);
    planningAPI.obtenirPlanningMois({
      ligne_id: selectedLigne, mois, annee, semaine_index: semaineIndex,
    })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedLigne, mois, annee, semaineIndex]);

  useEffect(() => { loadPlanning(); }, [loadPlanning]);

  const rows = useMemo(() => {
    if (!data?.jours || !data?.quarts_ref) return [];
    const out = [];
    for (const jour of data.jours) {
      for (const quart of data.quarts_ref) {
        const assigned = (jour.quarts_assignes || []).find(q => q.quart_id === quart.id);
        const li = assigned?.ligne_intervention;
        out.push({
          key: `${jour.id}-${quart.id}`,
          jour, quart, assigned,
          date_jour: jour.date_jour,
          jour_semaine: jour.jour_semaine,
          maintenancier_nom: assigned?.maintenancier_nom,
          taux_disponibilite: li?.taux_disponibilite ?? 0,
          cause: li?.cause_indisponibilite || '',
        });
      }
    }
    return out;
  }, [data]);

  return (
    <div className="space-y-6 p-4 md:p-6 mx-auto max-w-[1600px]">
      <header className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-background to-secondary/5 p-6 shadow-sm">
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Calendar size={22} />
              <span className="text-xs font-semibold uppercase tracking-widest">Planification</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">Consultation planning</h1>
          </div>
          <button type="button" onClick={onBack} className="btn-secondary text-sm">
            ← Retour
          </button>
        </div>
      </header>

      <div className="card-sm flex flex-wrap items-end gap-4">
        <div className="min-w-[140px] flex-1">
          <label className="label">Ligne</label>
          <select value={selectedLigne} onChange={e => setSelectedLigne(e.target.value)} className="select input">
            {lignes.map(l => <option key={l.id} value={l.id}>{l.code}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={24} /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Quart</th>
                <th className="px-3 py-2 text-left">Maintenancier</th>
                <th className="px-3 py-2 text-left">Taux dispo.</th>
                <th className="px-3 py-2 text-left">Cause</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map(r => (
                <tr key={r.key} className="hover:bg-muted/30">
                  <td className="px-3 py-2">{r.jour_semaine} {r.date_jour}</td>
                  <td className="px-3 py-2">{r.quart.nom}</td>
                  <td className="px-3 py-2">{r.maintenancier_nom || '—'}</td>
                  <td className="px-3 py-2">{r.taux_disponibilite}%</td>
                  <td className="px-3 py-2 text-xs">{r.cause || '—'}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => navigate(`/formulaires?ligne=${selectedLigne}&date=${r.date_jour}`)}
                      className="text-xs text-primary hover:underline"
                    >
                      Voir formulaires
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
