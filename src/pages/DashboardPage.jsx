import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI, soumissionsAPI } from '../services/api';
import { useAuth } from '../store/auth';
import DashboardMaintenancePage from './DashboardMaintenancePage';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line,
} from 'recharts';
import {
  ClipboardList, CheckCircle, AlertTriangle,
  ChevronRight, ArrowRight, Package, Wheat, FileCheck,
  Users, Target, Recycle, Activity,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

const formatDateSafe = (d) => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '—';
    return formatDistanceToNow(dt, { addSuffix: true, locale: fr });
  } catch { return '—'; }
};

const statutBadge = {
  VALIDE: 'badge-green', SOUMIS: 'badge-blue',
  BROUILLON: 'badge-gray', REJETE: 'badge-red',
};

const ACCENT = {
  primary:  { iconBg:'from-primary/20 to-primary/10', icon:'text-primary', bar:'bg-primary', border:'border-l-primary' },
  blue:     { iconBg:'from-blue-500/20 to-blue-600/10', icon:'text-blue-600', bar:'bg-blue-500', border:'border-l-blue-500' },
  green:    { iconBg:'from-green-500/20 to-green-600/10', icon:'text-green-600', bar:'bg-green-500', border:'border-l-green-500' },
  red:      { iconBg:'from-red-500/20 to-red-600/10', icon:'text-red-600', bar:'bg-red-500', border:'border-l-red-500' },
  orange:   { iconBg:'from-orange-500/20 to-orange-600/10', icon:'text-orange-500', bar:'bg-orange-500', border:'border-l-orange-500' },
  amber:    { iconBg:'from-amber-500/20 to-amber-600/10', icon:'text-amber-600', bar:'bg-amber-500', border:'border-l-amber-500' },
};

function StatCard({ icon: Icon, label, value, accent = 'primary', sub }) {
  const c = ACCENT[accent] || ACCENT.primary;
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md border-l-4 ${c.border}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-foreground tabular-nums">{value ?? '—'}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground/80">{sub}</p>}
        </div>
        <div className={`rounded-xl bg-gradient-to-br p-3 ${c.iconBg}`}>
          <Icon size={20} className={c.icon} />
        </div>
      </div>
    </div>
  );
}

const CHART_BORDER = {
  green: 'border-t-green-500',
  amber: 'border-t-amber-500',
  red:   'border-t-red-500',
};

function ChartCard({ title, subtitle, children, empty, accent, className = '' }) {
  const borderClass = accent ? `border-t-4 ${CHART_BORDER[accent] || ''}` : '';
  return (
    <section className={`rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md ${borderClass} ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
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

// ── Routeur principal ─────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, moduleScope } = useAuth();
  if (moduleScope === 'MAINTENANCE') return <DashboardMaintenancePage/>;
  return <DashboardProduction user={user}/>;
}

// ════════════════════════════════════════════════════════════════════════
// DASHBOARD PRODUCTION
// ════════════════════════════════════════════════════════════════════════
function DashboardProduction({ user }) {
  const [stats,     setStats]     = useState(null);
  const [prod,      setProd]      = useState(null);
  const [adoption,  setAdoption]  = useState(null);
  const [activite,  setActivite]  = useState([]);
  const [matieres,  setMatieres]  = useState({ total: 0, en_alerte: 0, en_rupture: 0 });
  const [recentes,  setRecentes]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardAPI.stats(),
      dashboardAPI.production(),
      dashboardAPI.adoption(),
      dashboardAPI.activite(),
      soumissionsAPI.lister({ module: 'PRODUCTION', limit: 8, page: 1 }),
    ])
      .then(([s, p, ad, ac, rec]) => {
        setStats(s.data || {});
        setProd(p.data || {});
        setAdoption(ad.data || {});
        setActivite(Array.isArray(ac.data) ? ac.data : []);
        setRecentes(rec.data?.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // KPIs calculés
  const totalPassations = (prod?.passations_quart || [])
    .reduce((sum, r) => sum + Number(r.nb || 0), 0);
  const adoptionPct = Number(adoption?.taux_adoption_pct || 0);
  const adoptionAccent = adoptionPct >= 80 ? 'green' : adoptionPct >= 50 ? 'orange' : 'red';
  const nbAlertes = (stats?.alertes || []).reduce((s, a) => s + Number(a.nb || 0), 0);

  // Tendance 7 jours → graphique
  const tendance = (stats?.tendance_7j || []).map(r => ({
    jour: r.jour ? format(new Date(r.jour), 'dd/MM', { locale: fr }) : '?',
    soumissions: Number(r.nb || 0),
  }));

  // Top 5 opérateurs par soumissions
  const topOps = [...activite]
    .sort((a, b) => Number(b.soumis || 0) - Number(a.soumis || 0))
    .slice(0, 5);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 animate-fade-in">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          Bonjour, {user?.prenom}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
          <span className="badge-green">Production</span>
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      {/* KPIs production — 30 derniers jours */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={ClipboardList}
          label="Passations de quart (30j)"
          value={totalPassations}
        />
        <StatCard
          icon={Package}
          label="Suivi pertes matières"
          value={prod?.pertes_matieres ?? 0}
          accent="blue"
          sub="saisies validées"
        />
        <StatCard
          icon={Recycle}
          label="Indicateurs déchets"
          value={prod?.indicateurs_dechets ?? 0}
          accent="amber"
          sub="fiches remplies"
        />
        <StatCard
          icon={FileCheck}
          label="Plannings production"
          value={prod?.plannings_production ?? 0}
          accent="green"
          sub="soumis ce mois"
        />
      </div>

      {/* KPIs transverses */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Target}
          label="Taux d'adoption"
          value={`${adoptionPct.toFixed(0)} %`}
          accent={adoptionAccent}
          sub={`${adoption?.total_soumis ?? 0} soumis / ${adoption?.total_attendus ?? 0} attendus`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Alertes non lues"
          value={nbAlertes}
          accent={nbAlertes > 0 ? 'orange' : 'green'}
          sub={nbAlertes > 0 ? 'À traiter' : 'Aucune alerte'}
        />
        <StatCard
          icon={Wheat}
          label="Matières en alerte stock"
          value={matieres.en_alerte}
          accent={matieres.en_alerte > 0 ? 'red' : 'green'}
          sub={matieres.en_rupture > 0 ? `${matieres.en_rupture} en rupture totale` : 'Stocks OK'}
        />
      </div>

      {/* Bannière alerte stock */}
      {(matieres.en_alerte > 0 || matieres.en_rupture > 0) && (
        <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-orange-50/50 px-4 py-3 text-sm text-orange-900 shadow-sm">
          <div className="rounded-full bg-orange-200 p-1.5">
            <AlertTriangle size={16} />
          </div>
          <p className="font-medium">
            {matieres.en_rupture > 0
              ? `${matieres.en_rupture} matière(s) en rupture totale — réapprovisionnement urgent`
              : `${matieres.en_alerte} matière(s) sous le seuil d'alerte`}
          </p>
          <Link to="/matieres" className="ml-auto text-xs text-orange-700 underline font-medium">
            Voir →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Tendance 7 jours */}
        <ChartCard
          title="Soumissions — 7 derniers jours"
          empty={tendance.length === 0}
          accent="green"
          className="xl:col-span-2"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tendance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5"/>
              <XAxis dataKey="jour" tick={{ fontSize: 12 }}/>
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false}/>
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="soumissions"
                stroke="#16a34a"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#16a34a' }}
                name="Soumissions"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top opérateurs */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Top opérateurs</h2>
            <Users size={16} className="text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {topOps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune activité récente</p>
            ) : topOps.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0 ? 'bg-yellow-100 text-yellow-700' :
                  i === 1 ? 'bg-gray-100 text-gray-600' :
                  'bg-primary/10 text-primary'
                }`}>
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{u.prenom} {u.nom}</p>
                  <p className="text-xs text-muted-foreground">{u.role}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-sm font-bold text-primary">{u.soumis ?? 0}</span>
                  <p className="text-xs text-muted-foreground">soumis</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Soumissions récentes */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-gradient-to-r from-primary/5 to-transparent px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              Soumissions récentes — Production
            </h2>
            <Link to="/soumissions" className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
              Toutes <ArrowRight size={16}/>
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="th">Formulaire</th>
                <th className="th">Statut</th>
                <th className="th">Opérateur</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                    Aucune soumission production récente
                  </td>
                </tr>
              ) : recentes.map(a => (
                <tr key={a.id} className="tr">
                  <td className="td">
                    <Link to={`/soumissions/${a.id}`}
                      className="font-medium text-primary hover:underline text-sm">
                      {a.formulaire_code || '—'}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{a.formulaire_titre}</p>
                  </td>
                  <td className="td">
                    <span className={statutBadge[a.statut] || 'badge-gray'}>{a.statut}</span>
                  </td>
                  <td className="td text-sm text-muted-foreground">
                    {a.operateur_prenom} {a.operateur_nom}
                  </td>
                  <td className="td text-xs text-muted-foreground">
                    {formatDateSafe(a.date_soumission)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Raccourcis rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/formulaires', icon: ClipboardList, label: 'Remplir un formulaire',  accent: 'primary' },
          { to: '/matieres',    icon: Wheat,         label: 'Gérer les matières',     accent: 'green' },
          { to: '/soumissions', icon: FileCheck,     label: 'Voir les soumissions',   accent: 'blue' },
        ].map(({ to, icon: Icon, label, accent }) => {
          const c = ACCENT[accent] || ACCENT.primary;
          return (
            <Link key={to} to={to}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className={`rounded-xl bg-gradient-to-br p-3 ${c.iconBg}`}>
                <Icon size={18} className={c.icon} />
              </div>
              <span className="font-medium text-foreground text-sm">{label}</span>
              <ChevronRight size={16} className="ml-auto text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
