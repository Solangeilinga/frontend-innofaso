import React, { useState, useEffect } from 'react';
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
  Activity, Wrench, TrendingUp, ChevronLeft, ChevronRight, Save,
  Target, AlertTriangle, Clock, Gauge,
} from 'lucide-react';

const PIE_COLORS = ['#4DB8A8', '#dc2626'];
const CHART_COLORS = ['#4DB8A8', '#dc2626', '#8b5cf6'];

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
            Aucune donnée pour cette période.
          </div>
        ) : children}
      </div>
    </section>
  );
}

function EqDetailLink({ eq, groupeLigne }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className="font-medium text-left hover:text-primary hover:underline" onClick={() => setOpen(true)}>
        {eq.equipement_nom}
      </button>
    );
  }
  const eqData = { id: eq.equipement_id, nom: eq.equipement_nom, code_ref: eq.equipement_code, ligne: groupeLigne };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button type="button" className="float-right rounded-lg p-2 hover:bg-muted" onClick={() => setOpen(false)}>✕</button>
        <MemoEquipementModalBody equipement={eqData} />
      </div>
    </div>
  );
}

const MemoEquipementModalBody = React.memo(function EquipementModalBody({ equipement }) {
  const [type, setType] = useState('mois');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!equipement?.id) return;
    setLoading(true);
    planningAPI.detailEquipementMaintenance(equipement.id, { type, date })
      .then(r => setData(r.data || {}))
      .catch(() => setData({ detail: [], observations_frequentes: [], temps_max: null }))
      .finally(() => setLoading(false));
  }, [equipement?.id, type, date]);

  const isAnnee = type === 'annee';

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">{equipement.nom}</h2>
      <p className="text-sm text-muted-foreground mb-4">{equipement.code_ref} · {equipement.ligne}</p>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {['jour', 'mois', 'annee'].map(t => (
            <button key={t} type="button"
              className={`px-4 py-1.5 text-sm font-medium ${type === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setType(t)}
            >{t === 'jour' ? 'Jour' : t === 'mois' ? 'Mois' : 'Année'}</button>
          ))}
        </div>
        {!isAnnee ? (
          <input type="month" value={date.slice(0, 7)} onChange={e => setDate(e.target.value + '-01')} className="input max-w-[160px] text-sm" />
        ) : (
          <input type="number" value={date.slice(0, 4)} onChange={e => setDate(e.target.value + '-01-01')} className="input max-w-[100px] text-sm" min="2020" max="2030" />
        )}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : (
        <>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.detail || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periode" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip /><Legend />
                <Bar dataKey="heures_prev" name="Préventif" fill="#4DB8A8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="heures_corr" name="Correctif" fill="#dc2626" radius={[4, 4, 0, 0]} />
                <Bar dataKey="heures_total" name="Total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Observations fréquentes / critiques</h3>
              {data?.observations_frequentes?.length > 0 ? (
                <ul className="space-y-1.5">
                  {data.observations_frequentes.map((obs, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <span>{obs.texte} <span className="text-muted-foreground">({obs.nb}x)</span></span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">Aucune observation</p>}
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Temps le plus élevé</h3>
              {data?.temps_max ? (
                <div className="text-sm">
                  <span className="font-bold text-lg">{Number(data.temps_max.duree_max).toFixed(1)}h</span>
                  <span className="ml-2 text-muted-foreground">({data.temps_max.type})</span>
                </div>
              ) : <p className="text-sm text-muted-foreground">—</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

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

  const dispoMoy = Number(kpis.disponibilite_moyenne || 0);
  const tauxSousCible = dispoMoy > 0 && dispoMoy < 90;

  const evolution = Array.isArray(graphs?.evolution) ? graphs.evolution : [];
  const hasEvolution = evolution.some(e => e.nb_soumissions > 0 || e.nb_interventions > 0);
  const dispoLignes = Array.isArray(graphs?.dispo_par_ligne) ? graphs.dispo_par_ligne : [];
  const repartition = Array.isArray(graphs?.repartition) ? graphs.repartition : [];
  const hasRepartition = repartition.some(r => r.value > 0);
  const parSemaine = Array.isArray(graphs?.par_semaine) ? graphs.par_semaine : [];
  const paretoCauses = Array.isArray(graphs?.pareto_causes) ? graphs.pareto_causes : [];

  const parMaint = Array.isArray(synthese?.par_maintenancier) ? synthese.par_maintenancier : [];

  const saveAction = async () => {
    if (!actionEdit) return;
    try {
      await planningAPI.enregistrerSuiviAction({
        equipement_id: actionEdit.equipement_id,
        mois, annee,
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
          Indicateurs, graphiques et suivi — {moisNom}
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
          label="Formulaires soumis"
          value={kpis.nb_interventions || 0}
          sub={`${kpis.nb_valides || 0} validés · ${kpis.nb_en_attente || 0} en attente`}
          accent="primary"
        />
        <Kpi
          icon={Target}
          label="Taux de validation"
          value={`${Number(kpis.taux_validation || 0).toFixed(0)}%`}
          sub={`${kpis.nb_valides || 0} / ${kpis.nb_interventions || 0}`}
          accent={Number(kpis.taux_validation || 0) < 80 ? 'red' : 'emerald'}
        />
        <Kpi
          icon={Gauge}
          label="Disponibilité moyenne"
          value={`${dispoMoy.toFixed(1)}%`}
          sub={`Cible 90% · ${kpis.taux_atteinte_cible || 0}% d'atteinte`}
          accent={dispoMoy < 75 ? 'red' : dispoMoy < 90 ? 'amber' : 'emerald'}
        />
        <Kpi
          icon={Clock}
          label="Arrêts totaux"
          value={`${Number(kpis.total_arrets || 0).toFixed(1)}h`}
          sub={`Préventif: ${Number(kpis.total_arrets || 0).toFixed(1)}h · Correctif: ${Number(kpis.heures_correctives || 0).toFixed(1)}h`}
          accent="red"
        />
        <Kpi
          icon={TrendingUp}
          label="MTBF"
          value={kpis.mtbf_heures != null ? `${Number(kpis.mtbf_heures).toFixed(1)}h` : '—'}
          sub="Temps moyen entre pannes"
          accent="secondary"
        />
        <Kpi
          icon={Wrench}
          label="MTTR"
          value={kpis.mttr_heures > 0 ? `${Number(kpis.mttr_heures).toFixed(1)}h` : '—'}
          sub={`${kpis.nb_correctifs || 0} correctifs`}
          accent={kpis.mttr_heures > 4 ? 'red' : 'emerald'}
        />
      </div>

      {tauxSousCible && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle size={20} />
          La disponibilité moyenne ({dispoMoy.toFixed(1)}%) est sous la cible de 90% ce mois-ci.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard
          title="Évolution annuelle — soumissions"
          subtitle="12 mois glissants"
          empty={!hasEvolution}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="nb_soumissions" name="Soumissions" stroke="#4DB8A8" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="nb_valides" name="Validées" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Répartition correctif / préventif"
          subtitle={`Mois de ${moisNom} — heures d'arrêt`}
          empty={!hasRepartition}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={repartition}
                dataKey="value"
                nameKey="name"
                cx="50%" cy="50%" outerRadius={100}
                label={({ name, value }) => `${name}: ${Number(value).toFixed(1)}h`}
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
            <BarChart data={dispoLignes} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="ligne" width={40} tick={{ fontSize: 12 }} />
              <Tooltip formatter={v => [`${Number(v).toFixed(1)} %`, 'Disponibilité']} />
              <Bar dataKey="taux" name="Taux dispo." fill="#4DB8A8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Arrêts par semaine"
          subtitle="Semaines 1 à 4"
          empty={parSemaine.length === 0 || parSemaine.every(s => !s.heures)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={parSemaine}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="semaine" tickFormatter={v => `S${String(v).padStart(2, '0')}`} />
              <YAxis />
              <Tooltip formatter={v => [`${Number(v).toFixed(1)} h`, 'Arrêt']} />
              <Bar dataKey="heures" name="Heures d'arrêt" fill="#9D7855" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {paretoCauses.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-semibold text-foreground">Pareto des causes d'indisponibilité</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Top 10 causes — {moisNom}</p>
          <div className="mt-4 h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paretoCauses} layout="vertical" margin={{ left: 140 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="cause" width={130} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => [`${Number(v).toFixed(1)} h`, 'Heures d\'arrêt']} />
                <Bar dataKey="heures" name="Heures d'arrêt" fill="#dc2626" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {parMaint.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/40 px-5 py-4">
            <h2 className="font-semibold">Par maintenancier</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="th">Maintenancier</th>
                  <th className="th">Interventions</th>
                  <th className="th">Dont validées</th>
                  <th className="th">Heures d'arrêt</th>
                  <th className="th">Taux dispo. moyen</th>
                  <th className="th">Quarts</th>
                </tr>
              </thead>
              <tbody>
                {parMaint.map((row, i) => (
                  <tr key={i} className="tr">
                    <td className="td font-semibold">{row.maintenancier_nom}</td>
                    <td className="td text-center">{row.nb_interventions}</td>
                    <td className="td text-center">{row.nb_valides}</td>
                    <td className="td text-center text-red-600">{Number(row.heures_arret || 0).toFixed(1)}h</td>
                    <td className="td text-center">
                      {row.taux_moyen != null ? (
                        <span className={Number(row.taux_moyen) >= 90 ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                          {Number(row.taux_moyen).toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="td text-center">{row.nb_shifts || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {Array.isArray(parLigne) && parLigne.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Aucun équipement trouvé pour cette période.
        </div>
      )}

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
                  {Array.isArray(groupe.equipements) && groupe.equipements.map(eq => (
                  <tr key={eq.equipement_id} className="tr">
                    <td className="td">
                      <EqDetailLink eq={eq} groupeLigne={groupe.ligne_code || ''} />
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
                        <button type="button" className="rounded-lg p-1.5 hover:bg-muted"
                          onClick={() => setActionEdit({
                            equipement_id: eq.equipement_id,
                            difficulte: eq.difficulte || '',
                            action: eq.action || '',
                            responsable: eq.responsable || '',
                            delai: eq.delai ? eq.delai.slice(0, 10) : '',
                          })}
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
                <input type="date" className="input"
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
