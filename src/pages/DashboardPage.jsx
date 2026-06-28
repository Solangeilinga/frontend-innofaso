import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI, soumissionsAPI, stockAPI, planningAPI, alertesAPI } from '../services/api';
import { useAuth } from '../store/auth';
import DashboardMaintenancePage from './DashboardMaintenancePage';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line,
} from 'recharts';
import {
  ClipboardList, CheckCircle, AlertTriangle, Clock,
  ChevronRight, ArrowRight, Package, FileCheck,
  Wrench, Activity, Zap, CalendarCheck,
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
  primary: { iconBg:'from-primary/20 to-primary/10', icon:'text-primary', border:'border-l-primary' },
  blue:    { iconBg:'from-blue-500/20 to-blue-600/10', icon:'text-blue-600', border:'border-l-blue-500' },
  green:   { iconBg:'from-green-500/20 to-green-600/10', icon:'text-green-600', border:'border-l-green-500' },
  red:     { iconBg:'from-red-500/20 to-red-600/10', icon:'text-red-600', border:'border-l-red-500' },
  orange:  { iconBg:'from-orange-500/20 to-orange-600/10', icon:'text-orange-500', border:'border-l-orange-500' },
  amber:   { iconBg:'from-amber-500/20 to-amber-600/10', icon:'text-amber-600', border:'border-l-amber-500' },
};

function StatCard({ icon: Icon, label, value, accent = 'primary', sub, to }) {
  const c = ACCENT[accent] || ACCENT.primary;
  const inner = (
    <div className={`relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md border-l-4 ${c.border} ${to ? 'cursor-pointer' : ''}`}>
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
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-xl">
      <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Routeur principal ─────────────────────────────────────────────
export default function DashboardPage() {
  const { user, moduleScope } = useAuth();
  if (moduleScope === 'MAINTENANCE') return <DashboardMaintenancePage />;
  return <DashboardGeneral user={user} />;
}

// ════════════════════════════════════════════════════════════════════
// DASHBOARD GÉNÉRAL — 6 indicateurs du rapport
// ════════════════════════════════════════════════════════════════════
function DashboardGeneral({ user }) {
  const [stats,    setStats]    = useState(null);
  const [stock,    setStock]    = useState({ en_alerte: 0, en_rupture: 0 });
  const [planning, setPlanning] = useState({ total: 0, realise: 0, en_retard: 0 });
  const [alertes,  setAlertes]  = useState([]);
  const [tendance, setTendance] = useState([]);
  const [recentes, setRecentes] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardAPI.stats().catch(() => ({ data: {} })),
      stockAPI.lister({ limit: 200 }).catch(() => ({ data: { data: [] } })),
      planningAPI.lister({ date: new Date().toISOString().slice(0, 10) }).catch(() => ({ data: [] })),
      alertesAPI.lister({ statut: 'NON_LUE', limit: 50 }).catch(() => ({ data: [] })),
      soumissionsAPI.lister({ limit: 6, page: 1 }).catch(() => ({ data: { data: [] } })),
    ]).then(([s, sk, pl, al, rec]) => {
      const data = s.data || {};
      setStats(data);

      // Stock pièces — backend retourne stocks_bas (nombre direct)
      const pieces = sk.data?.data || sk.data || [];
      setStock({
        en_alerte:  pieces.filter(p => Number(p.quantite_stock) <= Number(p.seuil_alerte) && Number(p.quantite_stock) > 0).length,
        en_rupture: pieces.filter(p => Number(p.quantite_stock) === 0).length,
      });

      // Planning du jour — backend retourne plannings_jour en tableau [{statut, nb}]
      const plans = data.plannings_jour || [];
      const getStatut = (st) => plans.find(p => p.statut === st)?.nb || 0;
      setPlanning({
        total:     plans.reduce((s, p) => s + Number(p.nb || 0), 0),
        realise:   Number(getStatut('REALISE')),
        en_retard: Number(getStatut('EN_RETARD')),
      });

      // Alertes — backend retourne alertes [{type_alerte, nb}]
      const al_list = al.data?.data || al.data || [];
      setAlertes(al_list);

      // Tendance 7j
      const t = (data.tendance_7j || []).map(r => ({
        jour: r.jour ? format(new Date(r.jour), 'EEE dd/MM', { locale: fr }) : '?',
        soumissions: Number(r.nb || 0),
      }));
      setTendance(t);

      // Soumissions récentes
      setRecentes(rec.data?.data || []);
    }).finally(() => setLoading(false));
  }, []);

  // ── KPIs formulaires du jour (backend: soumissions_jour) ─────
  const formJour = stats?.soumissions_jour || {};
  const nbSoumis    = Number(formJour.soumis    || 0);
  const nbBrouillon = Number(formJour.en_cours  || 0);
  const nbAttendus  = Number(formJour.total     || 0);

  // ── KPIs équipements (backend: equipements = [{etat, nb}]) ───
  const equipsArr = stats?.equipements || [];
  const getEtat = (e) => Number(equipsArr.find(x => x.etat === e)?.nb || 0);
  const nbOp    = getEtat('OPERATIONNEL');
  const nbPanne = getEtat('EN_PANNE');
  const nbMaint = getEtat('EN_MAINTENANCE');

  // ── Alertes par type (backend: alertes = [{type_alerte, nb}]) 
  const nbAlertes   = alertes.reduce((s, a) => s + Number(a.nb || 0), 0);
  const nbCritiques = Number(alertes.find(a => a.type_alerte === 'PANNE_CRITIQUE')?.nb || 0);
  const alerteAccent = nbCritiques > 0 ? 'red' : nbAlertes > 0 ? 'orange' : 'green';
  const valides = Number(stats?.soumissions_jour?.valides || formJour.valides || 0);

  // ── Planning du jour ─────────────────────────────────────────
  const planAccent = planning.en_retard > 0 ? 'red' : planning.realise === planning.total && planning.total > 0 ? 'green' : 'primary';

  // ── Stock ────────────────────────────────────────────────────
  const stockAccent = stock.en_rupture > 0 ? 'red' : stock.en_alerte > 0 ? 'amber' : 'green';

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          Bonjour, {user?.prenom}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      {/* ── INDICATEUR 3 : Alertes critiques ── */}
      {nbCritiques > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <Zap size={16} className="text-red-600 flex-shrink-0"/>
          <p className="font-semibold">
            {nbCritiques} panne{nbCritiques > 1 ? 's' : ''} critique{nbCritiques > 1 ? 's' : ''} non traitée{nbCritiques > 1 ? 's' : ''} — intervention requise
          </p>
          <Link to="/alertes" className="ml-auto text-xs text-red-700 underline font-medium">
            Voir les alertes →
          </Link>
        </div>
      )}

      {/* ── 6 INDICATEURS PRINCIPAUX ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* 1. Formulaires du jour */}
        <StatCard
          icon={ClipboardList}
          label="Formulaires soumis aujourd'hui"
          value={nbSoumis}
          accent="primary"
          sub={`${nbBrouillon} en cours · ${nbAttendus} attendus`}
          to="/soumissions"
        />

        {/* 2. État des équipements */}
        <StatCard
          icon={Wrench}
          label="Équipements opérationnels"
          value={nbOp}
          accent={nbPanne > 0 ? 'red' : 'green'}
          sub={`${nbPanne} en panne · ${nbMaint} en maintenance`}
          to="/equipements"
        />

        {/* 3. Alertes non lues */}
        <StatCard
          icon={AlertTriangle}
          label="Alertes non lues"
          value={nbAlertes}
          accent={alerteAccent}
          sub={nbCritiques > 0 ? `${nbCritiques} panne(s) critique(s)` : nbAlertes > 0 ? 'À traiter' : 'Aucune alerte'}
          to="/alertes"
        />

        {/* 4. Planning du jour */}
        <StatCard
          icon={CalendarCheck}
          label="Plannings du jour"
          value={planning.total}
          accent={planAccent}
          sub={`${planning.realise} réalisés · ${planning.en_retard} en retard`}
          to="/planning"
        />

        {/* 5. Stock pièces */}
        <StatCard
          icon={Package}
          label="Pièces sous seuil d'alerte"
          value={stock.en_alerte + stock.en_rupture}
          accent={stockAccent}
          sub={stock.en_rupture > 0 ? `${stock.en_rupture} en rupture totale` : stock.en_alerte > 0 ? 'Réapprovisionnement requis' : 'Stocks OK'}
          to="/stock"
        />

        {/* Taux validation */}
        <StatCard
          icon={CheckCircle}
          label="Formulaires validés"
          value={valides}
          accent="green"
          sub={`sur ${nbSoumis} soumis aujourd'hui`}
          to="/historique"
        />
      </div>

      {/* ── INDICATEUR 6 : Courbe 7 derniers jours ── */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-foreground">Activité de saisie — 7 derniers jours</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Nombre de soumissions par jour</p>
          </div>
          <Activity size={18} className="text-muted-foreground"/>
        </div>
        <div className="h-[220px]">
          {tendance.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tendance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5"/>
                <XAxis dataKey="jour" tick={{ fontSize: 11 }}/>
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false}/>
                <Tooltip content={<CustomTooltip />}/>
                <Line
                  type="monotone"
                  dataKey="soumissions"
                  stroke="var(--color-primary, #2563eb)"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  name="Soumissions"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Soumissions récentes */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Soumissions récentes</h2>
          <Link to="/soumissions" className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
            Toutes <ArrowRight size={16}/>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="th">Formulaire</th>
                <th className="th">Statut</th>
                <th className="th">Auteur</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                    Aucune soumission récente
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
                    {a.auteur_prenom} {a.auteur_nom}
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

      {/* Raccourcis */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/formulaires', icon: ClipboardList, label: 'Remplir un formulaire', accent: 'primary' },
          { to: '/planning',    icon: CalendarCheck, label: 'Voir le planning',       accent: 'blue'    },
          { to: '/alertes',     icon: AlertTriangle, label: 'Gérer les alertes',      accent: 'orange'  },
          { to: '/stock',       icon: Package,       label: 'Gérer le stock',         accent: 'green'   },
        ].map(({ to, icon: Icon, label, accent }) => {
          const c = ACCENT[accent] || ACCENT.primary;
          return (
            <Link key={to} to={to}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className={`rounded-xl bg-gradient-to-br p-2.5 ${c.iconBg}`}>
                <Icon size={16} className={c.icon} />
              </div>
              <span className="font-medium text-foreground text-xs leading-tight">{label}</span>
              <ChevronRight size={14} className="ml-auto text-muted-foreground flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}