import { useState, useEffect, useMemo } from 'react';
import { planningAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Activity, Wrench, TrendingUp, ChevronLeft, ChevronRight, Layers, Save,
  Target, AlertTriangle, Clock,
} from 'lucide-react';

const PIE_COLORS = ['#dc2626', '#4DB8A8', '#9D7855', '#6366f1'];

function Kpi({ icon: Icon, label, value, sub, accent = 'primary' }) {
  const ring = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/15 text-secondary',
    red: 'bg-red-100 text-red-600',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${ring[accent]}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children, empty }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-4 h-[280px] w-full min-h-[280px]">
        {empty ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Aucune donnée pour cette période — les graphiques s&apos;afficheront après les premières interventions.
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export default function DashboardMaintenancePage() {
  const { peutGerer } = useAuth();
  const now = new Date();
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [lignes, setLignes] = useState([]);
  const [selectedLigne, setSelectedLigne] = useState('');
  const [synthese, setSynthese] = useState(null);
  const [graphs, setGraphs] = useState(null);
  const [parLigne, setParLigne] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionEdit, setActionEdit] = useState(null);

  useEffect(() => {
    planningAPI.listerLignes()
      .then(r => setLignes(Array.isArray(r.data) ? r.data : []))
      .catch(() => setLignes([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { mois, annee };
    if (selectedLigne) params.ligne_id = selectedLigne;

    Promise.all([
      planningAPI.dashboardSynthese(params),
      planningAPI.dashboardGraphiques(params),
      planningAPI.suiviEquipementsParLigne(params),
    ])
      .then(([s, g, pl]) => {
        setSynthese(s.data || {});
        setGraphs(g.data || {});
        setParLigne(Array.isArray(pl.data) ? pl.data : []);
      })
      .catch(() => toast.error('Erreur chargement dashboard'))
      .finally(() => setLoading(false));
  }, [mois, annee, selectedLigne]);

  const shiftMonth = dir => {
    let m = mois + dir;
    let a = annee;
    if (m > 12) { m = 1; a += 1; }
    if (m < 1) { m = 12; a -= 1; }
    setMois(m);
    setAnnee(a);
  };

  const moisNom = format(new Date(annee, mois - 1, 1), 'MMMM yyyy', { locale: fr });
  const kpis = synthese?.kpis || {};
  const parMaint = Array.isArray(synthese?.par_maintenancier) ? synthese.par_maintenancier : [];

  const tauxSousCible = Number(kpis.disponibilite_moyenne || 0) < 90 && kpis.nb_interventions > 0;

  const groupedMaint = useMemo(() => {
    const map = {};
    for (const row of parMaint) {
      const nom = row.maintenancier_nom || 'Inconnu';
      if (!map[nom]) {
        map[nom] = {
          maintenancier_nom: nom,
          lignes: new Set(),
          nb_interventions: 0,
          heures: 0,
          tauxSum: 0,
          tauxN: 0,
          commentaires: [],
        };
      }
      map[nom].lignes.add(row.ligne_code);
      map[nom].nb_interventions += Number(row.nb_interventions || 0);
      map[nom].heures += Number(row.total_maintenance_corrective_heures || row.total_duree_arret || 0);
      if (row.avg_taux_disponibilite != null) {
        map[nom].tauxSum += Number(row.avg_taux_disponibilite);
        map[nom].tauxN += 1;
      }
      if (row.commentaires || row.causes) {
        map[nom].commentaires.push(row.commentaires || row.causes);
      }
    }
    return Object.values(map).map(m => ({
      ...m,
      lignes: [...m.lignes].join(', '),
      taux_moyen: m.tauxN ? m.tauxSum / m.tauxN : null,
      commentaire: [...new Set(m.commentaires.filter(Boolean))].join(' · ') || '—',
    }));
  }, [parMaint]);

  const evolution = Array.isArray(graphs?.evolution) ? graphs.evolution : [];
  const hasEvolution = evolution.some(e => e.heures_correctives > 0 || e.nb_interventions > 0);
  const dispoLignes = Array.isArray(graphs?.dispo_par_ligne) ? graphs.dispo_par_ligne : [];
  const repartition = Array.isArray(graphs?.repartition) ? graphs.repartition : [];
  const hasRepartition = repartition.some(r => r.value > 0);
  const parSemaine = Array.isArray(graphs?.par_semaine) ? graphs.par_semaine : [];

  const saveAction = async () => {
    if (!actionEdit) return;
    try {
      await planningAPI.enregistrerSuiviAction({
        equipement_id: actionEdit.equipement_id,
        mois,
        annee,
        difficulte: actionEdit.difficulte,
        action: actionEdit.action,
        responsable: actionEdit.responsable,
        delai: actionEdit.delai || null,
      });
      toast.success('Suivi enregistré');
      setActionEdit(null);
      const params = { mois, annee };
      if (selectedLigne) params.ligne_id = selectedLigne;
      const { data } = await planningAPI.suiviEquipementsParLigne(params);
      setParLigne(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Erreur enregistrement');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Dashboard maintenance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Indicateurs, graphiques et suivi par ligne (L1, L2, L4) — {moisNom}
        </p>
      </header>

      <div className="card-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-input px-1">
          <button type="button" onClick={() => shiftMonth(-1)} className="rounded p-2 hover:bg-muted">
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[140px] px-2 text-center text-sm font-semibold capitalize">{moisNom}</span>
          <button type="button" onClick={() => shiftMonth(1)} className="rounded p-2 hover:bg-muted">
            <ChevronRight size={18} />
          </button>
        </div>
        <select
          value={selectedLigne}
          onChange={e => setSelectedLigne(e.target.value)}
          className="input max-w-xs"
        >
          <option value="">Toutes les lignes</option>
          {Array.isArray(lignes) && lignes.map(l => (
            <option key={l.id} value={l.id}>{l.code || l.nom}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Kpi
          icon={Activity}
          label="Disponibilité moyenne"
          value={`${Number(kpis.disponibilite_moyenne || 0).toFixed(1)}%`}
          sub="Cible 90 %"
          accent={tauxSousCible ? 'amber' : 'emerald'}
        />
        <Kpi
          icon={Target}
          label="Objectif atteint"
          value={Number(kpis.disponibilite_moyenne || 0) >= 90 ? 'Oui' : 'Non'}
          sub={tauxSousCible ? 'Sous la cible' : 'Dans la cible'}
          accent={tauxSousCible ? 'red' : 'emerald'}
        />
        <Kpi
          icon={Wrench}
          label="Heures correctives"
          value={`${Number(kpis.heures_correctives || 0).toFixed(1)}h`}
          accent="red"
        />
        <Kpi
          icon={Clock}
          label="Heures préventives"
          value={`${Number(kpis.heures_preventives || 0).toFixed(1)}h`}
          accent="primary"
        />
        <Kpi
          icon={Layers}
          label="Total maintenance"
          value={`${Number(kpis.heures_totales || 0).toFixed(1)}h`}
          sub={`${kpis.nb_interventions || 0} interventions`}
          accent="secondary"
        />
        <Kpi
          icon={TrendingUp}
          label="Équipements touchés"
          value={kpis.nb_equipements || 0}
          sub={`${groupedMaint.length} maintenancier(s) actifs`}
          accent="primary"
        />
      </div>

      {tauxSousCible && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle size={20} />
          La disponibilité moyenne est sous la cible de 90 % ce mois-ci. Consultez les alertes et le planning.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard
          title="Évolution annuelle — heures correctives"
          subtitle="12 mois glissants sur l'année sélectionnée"
          empty={!hasEvolution}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => [`${Number(v).toFixed(1)} h`, 'Corrective']} />
              <Legend />
              <Line
                type="monotone"
                dataKey="heures_correctives"
                name="Heures correctives"
                stroke="#dc2626"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="nb_interventions"
                name="Nb interventions"
                stroke="#4DB8A8"
                strokeWidth={2}
                yAxisId={0}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Répartition corrective / préventive"
          subtitle={`Mois de ${moisNom}`}
          empty={!hasRepartition}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={repartition}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: ${value.toFixed(1)}h`}
              >
                {repartition.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={v => `${Number(v).toFixed(1)} h`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Disponibilité par ligne"
          subtitle="Moyenne sur la période"
          empty={dispoLignes.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dispoLignes} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="ligne" width={40} tick={{ fontSize: 12 }} />
              <Tooltip formatter={v => [`${Number(v).toFixed(1)} %`, 'Disponibilité']} />
              <Bar dataKey="taux" name="Taux dispo." fill="#4DB8A8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Arrêts par semaine du mois"
          subtitle="Semaines 01 à 04"
          empty={parSemaine.length === 0 || parSemaine.every(s => !s.heures)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={parSemaine}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="semaine" />
              <YAxis />
              <Tooltip formatter={v => [`${Number(v).toFixed(1)} h`, 'Arrêt']} />
              <Bar dataKey="heures" name="Heures d'arrêt" fill="#9D7855" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {groupedMaint.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/40 px-5 py-4">
            <h2 className="font-semibold">Par maintenancier de quart</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="th">Maintenancier</th>
                  <th className="th">Lignes</th>
                  <th className="th">Interventions</th>
                  <th className="th">Heures corr.</th>
                  <th className="th">Taux moyen</th>
                  <th className="th">Commentaires</th>
                </tr>
              </thead>
              <tbody>
                {groupedMaint.map((row, i) => (
                  <tr key={i} className="tr">
                    <td className="td font-semibold">{row.maintenancier_nom}</td>
                    <td className="td">{row.lignes}</td>
                    <td className="td text-center">{row.nb_interventions}</td>
                    <td className="td text-center text-red-600">{row.heures.toFixed(1)}h</td>
                    <td className="td text-center">
                      <span className={row.taux_moyen >= 90 ? 'text-emerald-600' : 'text-amber-600'}>
                        {row.taux_moyen != null ? `${row.taux_moyen.toFixed(1)}%` : '—'}
                      </span>
                    </td>
                    <td className="td max-w-xs truncate text-xs text-muted-foreground">{row.commentaire}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* CORRECTION ICI: Ajout de Array.isArray avant map */}
      {Array.isArray(parLigne) && parLigne.map(groupe => (
        <section key={groupe.ligne_code || groupe.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-primary/5 to-transparent px-5 py-4">
            <span className="rounded-lg bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
              {groupe.ligne_code || groupe.code}
            </span>
            <h2 className="font-semibold">{groupe.ligne_nom || groupe.nom || 'Ligne'}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="th">Équipement</th>
                  <th className="th">h. corrective</th>
                  <th className="th">Interventions</th>
                  <th className="th">Dispo.</th>
                  <th className="th">Difficulté</th>
                  <th className="th">Action</th>
                  <th className="th">Responsable</th>
                  <th className="th">Délai</th>
                  {peutGerer() && <th className="th" />}
                </tr>
              </thead>
              <tbody>
                {/* CORRECTION ICI: Sécurisation de groupe.equipements */}
                {Array.isArray(groupe.equipements) && groupe.equipements.map(eq => (
                  <tr key={eq.equipement_id} className="tr">
                    <td className="td">
                      <div className="font-medium">{eq.equipement_nom}</div>
                      <div className="text-xs text-muted-foreground">{eq.equipement_code}</div>
                    </td>
                    <td className="td text-center font-semibold text-red-600">
                      {Number(eq.heures_correctives || 0).toFixed(1)}h
                    </td>
                    <td className="td text-center">{eq.nb_interventions || 0}</td>
                    <td className="td text-center">
                      {eq.avg_disponibilite != null ? `${Number(eq.avg_disponibilite).toFixed(1)}%` : '—'}
                    </td>
                    <td className="td max-w-[120px] truncate text-xs">{eq.difficulte || eq.remarques || '—'}</td>
                    <td className="td max-w-[120px] truncate text-xs">{eq.action || '—'}</td>
                    <td className="td text-xs">{eq.responsable || '—'}</td>
                    <td className="td text-xs">{eq.delai ? format(new Date(eq.delai), 'dd/MM/yy') : '—'}</td>
                    {peutGerer() && (
                      <td className="td">
                        <button
                          type="button"
                          className="rounded-lg p-1.5 hover:bg-muted"
                          onClick={() =>
                            setActionEdit({
                              equipement_id: eq.equipement_id,
                              difficulte: eq.difficulte || '',
                              action: eq.action || '',
                              responsable: eq.responsable || '',
                              delai: eq.delai ? eq.delai.slice(0, 10) : '',
                            })
                          }
                        >
                          <Save size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {actionEdit && (
        <div className="modal-overlay">
          <div className="modal max-w-lg p-6">
            <h3 className="mb-4 text-lg font-bold">Suivi équipement</h3>
            <div className="space-y-3">
              {['difficulte', 'action', 'responsable'].map(field => (
                <div key={field}>
                  <label className="label capitalize">{field}</label>
                  <textarea
                    className="input resize-none"
                    rows={field === 'responsable' ? 1 : 2}
                    value={actionEdit[field]}
                    onChange={e => setActionEdit(p => ({ ...p, [field]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="label">Délai</label>
                <input
                  type="date"
                  className="input"
                  value={actionEdit.delai}
                  onChange={e => setActionEdit(p => ({ ...p, delai: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setActionEdit(null)}>
                Annuler
              </button>
              <button type="button" className="btn-primary flex-1" onClick={saveAction}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}