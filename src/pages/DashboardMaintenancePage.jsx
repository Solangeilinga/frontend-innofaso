import React, { useState, useEffect } from 'react';
import { planningAPI, rapportsAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Activity, Wrench, TrendingUp, ChevronLeft, ChevronRight, Save,
  Target, AlertTriangle, Clock, Gauge, ArrowUpRight, ArrowDownRight,
  CheckCircle2, BarChart2, Loader2,
} from 'lucide-react';

const PIE_COLORS = ['#10b981', '#ef4444'];
const CHART_COLORS = ['#10b981', '#ef4444', '#8b5cf6'];

const ACCENT = {
  primary:  { iconBg:'from-emerald-500/20 to-emerald-600/10', icon:'text-emerald-600', bar:'bg-emerald-500', border:'border-l-emerald-500' },
  secondary:{ iconBg:'from-amber-500/20 to-amber-600/10', icon:'text-amber-600', bar:'bg-amber-500', border:'border-l-amber-500' },
  red:      { iconBg:'from-red-500/20 to-red-600/10', icon:'text-red-600', bar:'bg-red-500', border:'border-l-red-500' },
  emerald:  { iconBg:'from-emerald-500/20 to-emerald-600/10', icon:'text-emerald-600', bar:'bg-emerald-500', border:'border-l-emerald-500' },
  amber:    { iconBg:'from-amber-500/20 to-amber-600/10', icon:'text-amber-600', bar:'bg-amber-500', border:'border-l-amber-500' },
};

function MiniSparkline({ value, good }) {
  const color = good ? '#10b981' : '#ef4444';
  const w = 56; const h = 24;
  const p = value / 100;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <rect x="0" y="0" width={w} height={h} rx={4} fill="#f1f5f9" />
      <rect x="2" y="2" width={(w - 4) * Math.min(p, 1)} height={h - 4} rx={3} fill={color} opacity={0.25} />
      <rect x="2" y={(h - 4) / 2} width={(w - 4) * Math.min(p, 1)} height={4} rx={2} fill={color} />
    </svg>
  );
}

function Kpi({ icon: Icon, label, value, sub, accent = 'primary', trend, progress }) {
  const c = ACCENT[accent] || ACCENT.primary;
  const trendUp = trend > 0;
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md border-l-4 ${c.border}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-foreground tabular-nums">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground/80">{sub}</p>}
          {trend !== undefined && (
            <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
              {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(trend).toFixed(1)}% vs mois dernier
            </div>
          )}
        </div>
        <div className={`rounded-xl bg-gradient-to-br p-3 ${c.iconBg}`}>
          <Icon size={20} className={c.icon} />
        </div>
      </div>
      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
            <span>Progression</span>
            <span className="font-semibold">{Math.min(progress, 100).toFixed(0)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full transition-all ${c.bar}`} style={{ width:`${Math.min(progress, 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, subtitle, children, empty, accent }) {
  const borderClass = accent ? `border-t-4 border-t-${accent}-500` : '';
  return (
    <section className={`rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md ${borderClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground flex items-center gap-2">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {accent && (
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider
            ${accent === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
              accent === 'red' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'}`}>{accent}</span>
        )}
      </div>
      <div className="mt-4 h-[280px] w-full min-h-[280px]">
        {empty ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <div className="text-center">
              <Activity size={32} className="mx-auto mb-2 opacity-20" />
              Aucune donnée pour cette période.
            </div>
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
                <Bar dataKey="heures_prev" name="Préventif" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="heures_corr" name="Correctif" fill="#ef4444" radius={[4, 4, 0, 0]} />
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

/* ── Tooltip personnalisé Recharts ────────────────────────────── */
function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-xl">
      <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
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

  // ── Rapport mensuel OEE / MTBF / MTTR ───────────────────────────
  const [mensuelData, setMensuelData] = useState(null);
  const [mensuelLoading, setMensuelLoading] = useState(false);
  const [mensuelAnnee, setMensuelAnnee] = useState(now.getFullYear());
  const [mensuelMois, setMensuelMois] = useState(now.getMonth() + 1);

  const chargerMensuel = async () => {
    setMensuelLoading(true);
    try {
      const { data } = await rapportsAPI.mensuelIndicateurs({ annee: mensuelAnnee, mois: mensuelMois });
      setMensuelData(data);
    } catch {
      toast.error('Impossible de charger le rapport mensuel.');
    } finally {
      setMensuelLoading(false);
    }
  };

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

  const totalInterventions = kpis.nb_interventions || 0;
  const totalValides = kpis.nb_valides || 0;
  const achèvement = totalInterventions > 0 ? (totalValides / totalInterventions) * 100 : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-emerald-600/5 via-card to-emerald-600/[0.02] p-6 shadow-sm">
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-500 p-2 shadow-sm">
                <Activity size={18} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">Dashboard maintenance</h1>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Indicateurs, graphiques et suivi des interventions — <span className="font-semibold text-foreground">{moisNom}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-2 shadow-sm backdrop-blur-sm">
            <button type="button" onClick={() => shiftMonth(-1)} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[130px] px-2 text-center text-sm font-semibold capitalize">{moisNom}</span>
            <button type="button" onClick={() => shiftMonth(1)} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Filtre ligne ────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filtrer par ligne</span>
        <select
          value={selectedLigne}
          onChange={e => setSelectedLigne(e.target.value)}
          className="input max-w-xs text-sm"
        >
          <option value="">Toutes les lignes</option>
          {Array.isArray(lignes) && lignes.map(l => (
            <option key={l.id} value={l.id}>{l.code || l.nom}</option>
          ))}
        </select>
      </div>

      {/* ── KPI Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Kpi
          icon={Activity}
          label="Formulaires soumis"
          value={totalInterventions}
          sub={
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-500" />
              {totalValides} validés · {kpis.nb_en_attente || 0} en attente
            </span>
          }
          accent="primary"
          progress={achèvement}
        />
        <Kpi
          icon={Target}
          label="Taux de validation"
          value={`${Number(kpis.taux_validation || 0).toFixed(0)}%`}
          sub={`${totalValides} / ${totalInterventions} formulaires`}
          accent={Number(kpis.taux_validation || 0) < 80 ? 'red' : 'emerald'}
          progress={Number(kpis.taux_validation || 0)}
        />
        <Kpi
          icon={Gauge}
          label="Disponibilité moyenne"
          value={`${dispoMoy.toFixed(1)}%`}
          sub={`Cible 90% · ${kpis.taux_atteinte_cible || 0}% d'atteinte`}
          accent={dispoMoy < 75 ? 'red' : dispoMoy < 90 ? 'amber' : 'emerald'}
          trend={kpis.tendance_dispo}
        />
        <Kpi
          icon={Clock}
          label="Arrêts totaux"
          value={`${Number(kpis.total_arrets || 0).toFixed(1)}h`}
          sub={`Préventif ${Number(kpis.total_arrets || 0).toFixed(1)}h · Correctif ${Number(kpis.heures_correctives || 0).toFixed(1)}h`}
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

      {/* ── Alerte disponibilité ────────────────────────────── */}
      {tauxSousCible && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-50/50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          <div className="rounded-full bg-amber-200 p-1.5">
            <AlertTriangle size={16} />
          </div>
          <span>La disponibilité moyenne (<strong>{dispoMoy.toFixed(1)}%</strong>) est sous la cible de 90% ce mois-ci.</span>
        </div>
      )}

      {/* ── Graphiques ligne 1 ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard
          title="Évolution annuelle"
          subtitle="Soumissions sur 12 mois glissants"
          empty={!hasEvolution}
          accent="emerald"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evolution}>
              <defs>
                <linearGradient id="gradSoumissions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradValides" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="nb_soumissions" name="Soumissions" stroke="#10b981" strokeWidth={2} fill="url(#gradSoumissions)" dot={{ r: 3, fill: '#10b981' }} />
              <Area type="monotone" dataKey="nb_valides" name="Validées" stroke="#22c55e" strokeWidth={2} fill="url(#gradValides)" dot={{ r: 3, fill: '#22c55e' }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Réparation correctif / préventif"
          subtitle={`Mois de ${moisNom}`}
          empty={!hasRepartition}
          accent="red"
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
              <Tooltip content={<CustomTooltip formatter={v => `${Number(v).toFixed(1)} h`} />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Graphiques ligne 2 ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard
          title="Disponibilité par ligne"
          subtitle="Moyenne sur la période — cible 90%"
          empty={dispoLignes.length === 0}
          accent="amber"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dispoLignes} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="ligne" width={40} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip formatter={v => `${Number(v).toFixed(1)} %`} />} />
              <Bar dataKey="taux" name="Taux dispo." fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Arrêts par semaine"
          subtitle="Semaines 1 à 4"
          empty={parSemaine.length === 0 || parSemaine.every(s => !s.heures)}
          accent="red"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={parSemaine}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="semaine" tickFormatter={v => `S${String(v).padStart(2, '0')}`} />
              <YAxis />
              <Tooltip content={<CustomTooltip formatter={v => `${Number(v).toFixed(1)} h`} />} />
              <Bar dataKey="heures" name="Heures d'arrêt" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Pareto ──────────────────────────────────────────── */}
      {paretoCauses.length > 0 && (
        <ChartCard
          title="Pareto des causes d'indisponibilité"
          subtitle={`Top 10 causes — ${moisNom}`}
          empty={false}
          accent="red"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={paretoCauses} layout="vertical" margin={{ left: 140 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="cause" width={130} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip formatter={v => `${Number(v).toFixed(1)} h`} />} />
              <Bar dataKey="heures" name="Heures d'arrêt" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ── Tableau maintenanciers ──────────────────────────── */}
      {parMaint.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-gradient-to-r from-emerald-500/5 to-transparent px-5 py-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Wrench size={16} className="text-emerald-600" />
              Par maintenancier
            </h2>
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

      {/* ── Équipements par ligne ───────────────────────────── */}
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
                        <button type="button" className="rounded-lg p-1.5 hover:bg-muted transition-colors"
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

      {/* ── Rapport mensuel OEE / MTBF / MTTR ───────────────────── */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <BarChart2 size={18} className="text-primary shrink-0" />
          <h2 className="font-semibold text-base">Rapport mensuel — OEE / MTBF / MTTR</h2>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              type="number" min="2024" max="2099"
              className="input w-24 text-sm"
              value={mensuelAnnee}
              onChange={e => setMensuelAnnee(parseInt(e.target.value))}
            />
            <select
              className="input w-32 text-sm"
              value={mensuelMois}
              onChange={e => setMensuelMois(parseInt(e.target.value))}
            >
              {['Janvier','Février','Mars','Avril','Mai','Juin',
                'Juillet','Août','Septembre','Octobre','Novembre','Décembre']
                .map((n, i) => <option key={i+1} value={i+1}>{n}</option>)}
            </select>
            <button
              type="button"
              className="btn-primary text-sm flex items-center gap-1.5"
              onClick={chargerMensuel}
              disabled={mensuelLoading}
            >
              {mensuelLoading ? <Loader2 size={14} className="animate-spin" /> : <BarChart2 size={14} />}
              Générer
            </button>
          </div>
        </div>

        {mensuelData ? (() => {
          const g = mensuelData.globaux;
          const kpis = [
            { label: 'OEE',          value: g.oee_pct != null          ? `${g.oee_pct} %`   : '—', color: 'text-emerald-600' },
            { label: 'Disponibilité',value: g.disponibilite_pct != null ? `${g.disponibilite_pct} %` : '—', color: 'text-blue-600' },
            { label: 'MTBF',         value: g.mtbf_h != null           ? `${g.mtbf_h} h`    : '—', color: 'text-violet-600' },
            { label: 'MTTR',         value: g.mttr_h != null           ? `${g.mttr_h} h`    : '—', color: 'text-orange-500' },
            { label: 'Nb pannes',    value: g.nb_pannes_total,                                       color: 'text-red-500' },
            { label: 'Arrêt total',  value: `${g.total_arret_h} h`,                                  color: 'text-gray-600' },
          ];
          return (
            <div className="space-y-5">
              {/* KPIs globaux */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {kpis.map(k => (
                  <div key={k.label} className="rounded-xl border bg-surface p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
                    <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Préventives */}
              <div className="rounded-xl border p-4 bg-surface">
                <p className="text-sm font-semibold mb-2">Maintenances préventives</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span>Planifiées : <strong>{g.preventives_planifiees}</strong></span>
                  <span className="text-emerald-600">Réalisées : <strong>{g.preventives_realisees}</strong></span>
                  <span className="text-red-500">En retard : <strong>{g.preventives_en_retard}</strong></span>
                  <span className="text-violet-600">Taux : <strong>{g.taux_realisation_pct} %</strong></span>
                </div>
              </div>

              {/* Tableau par équipement */}
              {mensuelData.par_equipement.length > 0 && (
                <div className="overflow-x-auto">
                  <p className="text-sm font-semibold mb-2">Indicateurs par équipement</p>
                  <table className="table w-full text-sm">
                    <thead>
                      <tr>
                        {['Équipement','Pannes','Arrêt (h)','Maint. (h)','MTBF (h)','MTTR (h)','Dispo (%)','OEE (%)']
                          .map(h => <th key={h} className="th text-left">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {mensuelData.par_equipement.map((r, i) => (
                        <tr key={i} className="tr">
                          <td className="td font-medium">{r.equipement || '—'}</td>
                          <td className="td text-center text-red-600 font-semibold">{r.nb_correctifs}</td>
                          <td className="td text-center">{r.total_arret_h}</td>
                          <td className="td text-center">{r.total_maint_h}</td>
                          <td className="td text-center text-violet-600">{r.mtbf_h ?? '—'}</td>
                          <td className="td text-center text-orange-500">{r.mttr_h ?? '—'}</td>
                          <td className="td text-center text-blue-600">{r.disponibilite_pct} %</td>
                          <td className="td text-center text-emerald-600">{r.oee_pct} %</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Encres & solvants */}
              {mensuelData.encres_solvants.length > 0 && (
                <div className="rounded-xl border p-4 bg-surface">
                  <p className="text-sm font-semibold mb-2">Suivi encres & solvants</p>
                  <div className="flex flex-wrap gap-4">
                    {mensuelData.encres_solvants.map(r => (
                      <div key={r.code} className="text-sm">
                        <span className="text-muted-foreground">{r.titre} :</span>{' '}
                        <strong>{r.nb_saisies} saisie{r.nb_saisies > 1 ? 's' : ''}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground italic">
                * OEE calculé sur la base de la disponibilité machine. Les facteurs de performance et qualité seront intégrés avec les données process.
                Période : {mensuelData.periode.jours} jours — {mensuelData.periode.heures_ouverture} h d'ouverture.
              </p>
            </div>
          );
        })() : (
          <p className="text-sm text-muted-foreground text-center py-6">
            Sélectionnez un mois et cliquez sur <strong>Générer</strong> pour afficher les indicateurs OEE / MTBF / MTTR.
          </p>
        )}
      </section>

      {/* ── Modal édition suivi ─────────────────────────────── */}
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