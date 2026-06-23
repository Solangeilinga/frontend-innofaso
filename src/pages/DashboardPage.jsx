import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI, soumissionsAPI, matieresAPI } from '../services/api';
import { useAuth } from '../store/auth';
import DashboardMaintenancePage from './DashboardMaintenancePage';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line,
} from 'recharts';
import {
  ClipboardList, CheckCircle, AlertTriangle,
  ChevronRight, ArrowRight, Package, Wheat, FileCheck,
  Users, Target, Recycle,
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

function StatCard({ icon: Icon, label, value, color = 'primary', sub }) {
  const bg = {
    primary: 'bg-primary/10 text-primary',
    accent:  'bg-accent/10 text-accent-dark',
    red:     'bg-red-100 text-red-600',
    blue:    'bg-blue-100 text-blue-600',
    green:   'bg-green-100 text-green-700',
    orange:  'bg-orange-100 text-orange-600',
  };
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bg[color] || bg.primary}`}>
        <Icon size={22}/>
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-display text-3xl font-bold text-gray-900 mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
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
      matieresAPI.stats(),
      soumissionsAPI.lister({ module: 'PRODUCTION', limit: 8, page: 1 }),
    ])
      .then(([s, p, ad, ac, mp, rec]) => {
        setStats(s.data || {});
        setProd(p.data || {});
        setAdoption(ad.data || {});
        setActivite(Array.isArray(ac.data) ? ac.data : []);
        setMatieres(mp.data || { total: 0, en_alerte: 0, en_rupture: 0 });
        setRecentes(rec.data?.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // KPIs calculés
  const totalPassations = (prod?.passations_quart || [])
    .reduce((sum, r) => sum + Number(r.nb || 0), 0);
  const adoptionPct = Number(adoption?.taux_adoption_pct || 0);
  const adoptionColor = adoptionPct >= 80 ? 'green' : adoptionPct >= 50 ? 'orange' : 'red';
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
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* En-tête */}
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Bonjour, {user?.prenom} 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm flex items-center gap-2">
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
          color="primary"
        />
        <StatCard
          icon={Package}
          label="Suivi pertes matières"
          value={prod?.pertes_matieres ?? 0}
          color="blue"
          sub="saisies validées"
        />
        <StatCard
          icon={Recycle}
          label="Indicateurs déchets"
          value={prod?.indicateurs_dechets ?? 0}
          color="accent"
          sub="fiches remplies"
        />
        <StatCard
          icon={FileCheck}
          label="Plannings production"
          value={prod?.plannings_production ?? 0}
          color="green"
          sub="soumis ce mois"
        />
      </div>

      {/* KPIs transverses */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Target}
          label="Taux d'adoption"
          value={`${adoptionPct.toFixed(0)} %`}
          color={adoptionColor}
          sub={`${adoption?.total_soumis ?? 0} soumis / ${adoption?.total_attendus ?? 0} attendus`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Alertes non lues"
          value={nbAlertes}
          color={nbAlertes > 0 ? 'orange' : 'green'}
          sub={nbAlertes > 0 ? 'À traiter' : 'Aucune alerte'}
        />
        <StatCard
          icon={Wheat}
          label="Matières en alerte stock"
          value={matieres.en_alerte}
          color={matieres.en_alerte > 0 ? 'red' : 'green'}
          sub={matieres.en_rupture > 0 ? `${matieres.en_rupture} en rupture totale` : 'Stocks OK'}
        />
      </div>

      {/* Bannière alerte stock */}
      {(matieres.en_alerte > 0 || matieres.en_rupture > 0) && (
        <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl">
          <AlertTriangle size={18} className="text-orange-500 shrink-0"/>
          <p className="text-sm text-orange-700 font-medium">
            {matieres.en_rupture > 0
              ? `${matieres.en_rupture} matière(s) en rupture totale — réapprovisionnement urgent`
              : `${matieres.en_alerte} matière(s) sous le seuil d'alerte`}
          </p>
          <Link to="/matieres" className="ml-auto text-xs text-orange-600 underline font-medium">
            Voir →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Tendance 7 jours */}
        <div className="card xl:col-span-2">
          <h3 className="font-display text-lg font-semibold text-gray-900 mb-4">
            Soumissions — 7 derniers jours
          </h3>
          {tendance.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={tendance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="jour" tick={{ fontSize: 12 }}/>
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false}/>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.1)' }}
                  formatter={v => [v, 'Soumissions']}
                />
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
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-gray-300 gap-2">
              <CheckCircle size={32} className="text-gray-200"/>
              <p className="text-sm">Aucune soumission ces 7 derniers jours</p>
            </div>
          )}
        </div>

        {/* Top opérateurs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-gray-900">Top opérateurs</h3>
            <Users size={18} className="text-gray-400"/>
          </div>
          <div className="space-y-3">
            {topOps.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Aucune activité récente</p>
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
                  <p className="text-sm font-medium text-gray-800 truncate">{u.prenom} {u.nom}</p>
                  <p className="text-xs text-gray-400">{u.role}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-sm font-bold text-primary">{u.soumis ?? 0}</span>
                  <p className="text-xs text-gray-400">soumis</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Soumissions récentes */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-gray-900">
            Soumissions récentes — Production
          </h3>
          <Link to="/soumissions" className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
            Toutes <ArrowRight size={16}/>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="th">Formulaire</th>
                <th className="th">Statut</th>
                <th className="th">Opérateur</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400 text-sm">
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
                    <p className="text-xs text-gray-400 truncate max-w-[200px]">{a.formulaire_titre}</p>
                  </td>
                  <td className="td">
                    <span className={statutBadge[a.statut] || 'badge-gray'}>{a.statut}</span>
                  </td>
                  <td className="td text-sm text-gray-600">
                    {a.operateur_prenom} {a.operateur_nom}
                  </td>
                  <td className="td text-xs text-gray-400">
                    {formatDateSafe(a.date_soumission)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raccourcis rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/formulaires', icon: ClipboardList, label: 'Remplir un formulaire',  color: 'bg-primary/10 text-primary' },
          { to: '/matieres',    icon: Wheat,         label: 'Gérer les matières',     color: 'bg-green-100 text-green-700' },
          { to: '/soumissions', icon: FileCheck,     label: 'Voir les soumissions',   color: 'bg-blue-100 text-blue-700' },
        ].map(({ to, icon: Icon, label, color }) => (
          <Link key={to} to={to}
            className="card flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={20}/>
            </div>
            <span className="font-medium text-gray-700 text-sm">{label}</span>
            <ChevronRight size={16} className="ml-auto text-gray-400"/>
          </Link>
        ))}
      </div>
    </div>
  );
}
