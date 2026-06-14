import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI, soumissionsAPI, matieresAPI } from '../services/api';
import { useAuth } from '../store/auth';
import DashboardMaintenancePage from './DashboardMaintenancePage';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line
} from 'recharts';
import {
  ClipboardList, CheckCircle, AlertTriangle, Clock, TrendingUp,
  ChevronRight, ArrowRight, Package, Wheat, FileCheck
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Utilitaires ───────────────────────────────────────────────────────
const formatDateSafe = (d) => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '—';
    return formatDistanceToNow(dt, { addSuffix: true, locale: fr });
  } catch { return '—'; }
};

const statutBadge = { VALIDE:'badge-green', SOUMIS:'badge-blue', BROUILLON:'badge-gray', REJETE:'badge-red' };
const moduleBadge = { MAINTENANCE:'badge-blue', PRODUCTION:'badge-green' };

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
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bg[color]}`}>
        <Icon size={22}/>
      </div>
      <div>
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
  if (moduleScope === 'MAINTENANCE') return <DashboardMaintenance user={user}/>;
  if (moduleScope === 'PRODUCTION')  return <DashboardProduction  user={user}/>;
  // Fallback (ne devrait pas arriver avec le Guard)
  return <DashboardProduction user={user}/>;
}

// ════════════════════════════════════════════════════════════════════════
// DASHBOARD MAINTENANCE
// ════════════════════════════════════════════════════════════════════════
function DashboardMaintenance({ user }) {
  return <DashboardMaintenancePage/>;
}

// ════════════════════════════════════════════════════════════════════════
// DASHBOARD PRODUCTION
// ════════════════════════════════════════════════════════════════════════
function DashboardProduction({ user }) {
  const [stats,    setStats]    = useState(null);
  const [activite, setActivite] = useState([]);
  const [retard,   setRetard]   = useState([]);
  const [kpi,      setKpi]      = useState([]);
  const [matieres, setMatieres] = useState({ total:0, en_alerte:0, en_rupture:0 });
  const [pertesMp, setPertesMp] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardAPI.stats(),
      dashboardAPI.activite(),
      dashboardAPI.retard(),
      dashboardAPI.kpi(),
      matieresAPI.stats(),
      // Dernières soumissions filtrées production
      soumissionsAPI.lister({ module: 'PRODUCTION', limit: 8, page: 1 }),
    ])
      .then(([s, a, r, k, mp, prod]) => {
        setStats(s.data || {});
        setActivite(Array.isArray(a.data) ? a.data.filter(x => x.module === 'PRODUCTION') : []);
        setRetard(Array.isArray(r.data) ? r.data.filter(x => !x.module || x.module === 'PRODUCTION') : []);
        setKpi(Array.isArray(k.data) ? k.data : []);
        setMatieres(mp.data || { total:0, en_alerte:0, en_rupture:0 });
        setPertesMp(prod.data?.data || []);
      })
      .catch(() => {
        setStats({}); setActivite([]); setRetard([]); setKpi([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalSoum = stats?.soumissions_30j
    ? Object.values(stats.soumissions_30j || {}).reduce((a, b) => a + b, 0) : 0;
  const nbNonLues = stats?.alertes?.NON_LUE || 0;

  // Graphique soumissions production
  const chartData = (() => {
    if (!Array.isArray(kpi) || !kpi.length) return [];
    const map = {};
    kpi.forEach(r => {
      if (!r?.mois) return;
      const m = format(new Date(r.mois), 'MMM', { locale: fr });
      if (!map[m]) map[m] = { name: m, SOUMIS: 0, VALIDE: 0 };
      if (r.statut === 'SOUMIS') map[m].SOUMIS += Number(r.total) || 0;
      if (r.statut === 'VALIDE') map[m].VALIDE += Number(r.total) || 0;
    });
    return Object.values(map).slice(0, 6).reverse();
  })();

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Bonjour, {user?.prenom} 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm flex items-center gap-2">
          <span className="badge-green">Production</span>
          Tableau de bord module production
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} label="Formulaires actifs"      value={stats?.formulaires_actifs}    color="primary"/>
        <StatCard icon={TrendingUp}    label="Soumissions (30 jours)"  value={totalSoum}                    color="blue"/>
        <StatCard icon={AlertTriangle} label="Alertes non lues"        value={nbNonLues}                    color={nbNonLues > 0 ? 'red' : 'primary'}/>
        <StatCard icon={Clock}         label="Formulaires en retard"   value={stats?.formulaires_en_retard} color="accent"/>
      </div>

      {/* Matières premières */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Wheat}   label="Total matières premières" value={matieres.total}       color="primary"/>
        <StatCard icon={AlertTriangle} label="En alerte stock"   value={matieres.en_alerte}   color={matieres.en_alerte > 0 ? 'orange' : 'green'}
          sub={matieres.en_alerte > 0 ? 'Sous le seuil minimum' : 'Stocks OK'}/>
        <StatCard icon={Package} label="En rupture totale"       value={matieres.en_rupture}  color={matieres.en_rupture > 0 ? 'red' : 'green'}
          sub={matieres.en_rupture > 0 ? '⚠️ Réapprovisionnement urgent' : 'Aucune rupture'}/>
      </div>

      {/* Alertes matières */}
      {matieres.en_alerte > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl">
          <AlertTriangle size={18} className="text-orange-500 shrink-0"/>
          <p className="text-sm text-orange-700 font-medium">
            {matieres.en_alerte} matière{matieres.en_alerte > 1 ? 's' : ''} sous le seuil d'alerte.
          </p>
          <Link to="/matieres" className="ml-auto text-xs text-orange-600 underline font-medium">
            Voir les matières →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Graphique soumissions */}
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg font-semibold text-gray-900">
              Activité production — 6 derniers mois
            </h3>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="name" tick={{ fontSize: 12 }}/>
                <YAxis tick={{ fontSize: 12 }}/>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.1)' }}/>
                <Bar dataKey="SOUMIS" fill="#86efac" radius={[6,6,0,0]} name="Soumis"/>
                <Bar dataKey="VALIDE" fill="#16a34a" radius={[6,6,0,0]} name="Validés"/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-gray-300 text-sm">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Formulaires en retard */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-gray-900">En retard</h3>
            <Link to="/formulaires" className="text-primary text-xs hover:underline flex items-center gap-1">
              Voir tout <ChevronRight size={14}/>
            </Link>
          </div>
          <div className="space-y-2">
            {retard.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle size={32} className="mx-auto mb-2 text-green-400"/>
                <p className="text-sm">Tout est à jour !</p>
              </div>
            ) : retard.slice(0, 7).map((f, i) => (
              <div key={f.id || i}
                className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"/>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{f.titre}</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {f.jours_retard ? `${f.jours_retard}j de retard` : 'Jamais soumis'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activité récente production */}
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
              {pertesMp.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400 text-sm">
                    Aucune soumission récente en Production
                  </td>
                </tr>
              ) : pertesMp.map(a => (
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
          { to: '/formulaires', icon: ClipboardList, label: 'Remplir un formulaire', color: 'bg-primary/10 text-primary' },
          { to: '/matieres',    icon: Wheat,         label: 'Gérer les matières',    color: 'bg-green-100 text-green-700' },
          { to: '/soumissions', icon: FileCheck,     label: 'Voir les soumissions',  color: 'bg-blue-100 text-blue-700' },
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