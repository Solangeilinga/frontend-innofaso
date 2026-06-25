import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, FileCheck, Wrench, Bell, Calendar,
  Users, LogOut, History, Layers, X, ChevronRight, Package, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../store/auth';
import { signatairesAPI, planningAPI } from '../../services/api';
import toast from 'react-hot-toast';

const nav = [
  { to:'/',             label:'Tableau de bord',      icon:LayoutDashboard, end:true, modules:['MAINTENANCE','PRODUCTION'] },
  { to:'/formulaires',  label:'Formulaires',           icon:ClipboardList,             modules:['MAINTENANCE','PRODUCTION'] },
  { to:'/soumissions',  label:'Soumissions',           icon:FileCheck,                 modules:['MAINTENANCE','PRODUCTION'] },
  { to:'/historique',   label:'Historique',            icon:History,                   modules:['MAINTENANCE','PRODUCTION'] },
  { to:'/alertes',      label:'Alertes',               icon:Bell,                      modules:['MAINTENANCE','PRODUCTION'] },
  { to:'/equipements',  label:'Équipements',           icon:Wrench,                    modules:['MAINTENANCE'] },
  { to:'/planning',     label:'Planning',              icon:Calendar,                  modules:['MAINTENANCE','PRODUCTION'] },
  { to:'/lignes',       label:'Lignes de production',  icon:Layers,   modules:['MAINTENANCE'] },
  { to:'/stock',        label:'Stock pièces',           icon:Package,  modules:['MAINTENANCE'] },
];

const adminNav = [
  { to:'/utilisateurs', label:'Utilisateurs', icon:Users, modules:['MAINTENANCE','PRODUCTION'] },
];

export default function Sidebar({ compact = false, onClose }) {
  const { user, logout, isAdmin, moduleScope } = useAuth();
  const [showSignal, setShowSignal] = useState(false);
  const [users, setUsers] = useState([]);
  const [signalForm, setSignalForm] = useState({ signale_par_id: user?.id || '', assigne_a_id: '', observation: '' });

  useEffect(() => {
    if (showSignal) {
      signatairesAPI.liste()
        .then(r => setUsers(Array.isArray(r.data) ? r.data : []))
        .catch(() => {});
    }
  }, [showSignal]);

  const handleSignalSubmit = async e => {
    e.preventDefault();
    try {
      await planningAPI.creerSignalementPanne(signalForm);
      toast.success('Panne signalée avec succès');
      setShowSignal(false);
      setSignalForm({ signale_par_id: user?.id || '', assigne_a_id: '', observation: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors du signalement');
    }
  };

  const filterByModule = item =>
    !item.modules || !moduleScope || item.modules.includes(moduleScope);

  const itemClass = isActive =>
    `flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-medium transition-colors
     ${isActive
       ? 'bg-primary/10 text-primary'
       : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
     ${compact ? 'justify-center' : ''}`;

  return (
    <div
      style={{ width: compact ? 80 : 256 }}
      className="relative flex h-full flex-col border-r border-border bg-background"
    >
      {/* ── Logo ───────────────────────────────────────────────── */}
      <div className="flex h-16 items-center border-b border-border px-4 flex-shrink-0">
        <div className={`flex w-full items-center ${compact ? 'justify-center' : 'gap-3'}`}>
          <img src="/images/logo.png" alt="InnoFaso" className="w-9 h-9 flex-shrink-0"/>
          {!compact && (
            <div className="min-w-0 flex-1">
              <p className="font-bold text-base text-foreground leading-tight">InnoFaso</p>
              <p className="text-xs text-muted-foreground">Gestion Digitale</p>
            </div>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 ml-auto p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="Fermer le menu"
            >
              <X size={20} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Badge module */}
      {!compact && moduleScope && (
        <div className="px-4 pt-3">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
            moduleScope === 'MAINTENANCE'
              ? 'bg-primary/10 text-primary'
              : 'bg-emerald-100 text-emerald-700'
          }`}>
            {moduleScope === 'MAINTENANCE' ? 'Maintenance' : 'Production'}
          </span>
        </div>
      )}

      {/* ── Navigation ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {!compact && (
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Navigation
          </p>
        )}

        {nav.filter(filterByModule).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to} to={to} end={end}
            title={compact ? label : undefined}
            className={({ isActive }) => itemClass(isActive)}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!compact && <span className="truncate">{label}</span>}
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => setShowSignal(true)}
          title={compact ? 'Signaler une panne' : undefined}
          className={`flex w-full items-center gap-3 px-3 h-10 rounded-xl text-sm font-medium transition-colors text-red-600 hover:bg-red-50 ${compact ? 'justify-center' : ''}`}
        >
          <AlertTriangle size={18} className="flex-shrink-0" />
          {!compact && <span className="truncate">Signaler une panne</span>}
        </button>

        {isAdmin() && (
          <>
            <div className="my-3 border-t border-border" />
            {!compact && (
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Administration
              </p>
            )}
            {adminNav.filter(filterByModule).map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to} to={to}
                title={compact ? label : undefined}
                className={({ isActive }) => itemClass(isActive)}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!compact && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </>
        )}
      </div>

      {/* ── Utilisateur ────────────────────────────────────────── */}
      <div className="border-t border-border p-3 flex-shrink-0">
        {!compact && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/50 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
              {user?.prenom?.[0]}{user?.nom?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{user?.prenom} {user?.nom}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          title={compact ? 'Déconnexion' : undefined}
          className={`flex w-full items-center gap-3 h-10 px-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${compact ? 'justify-center' : ''}`}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!compact && <span>Déconnexion</span>}
        </button>
      </div>

      {showSignal && (
        <div className="modal-overlay">
          <div className="modal max-w-md p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500" /> Signaler une panne
              </h3>
              <button onClick={() => setShowSignal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleSignalSubmit} className="space-y-4">
              <div>
                <label className="label-req">Date / Heure panne</label>
                <input
                  type="text"
                  className="input bg-muted/50"
                  value={`${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                  disabled
                />
              </div>
              <div>
                <label className="label-req">Signalé par</label>
                <select
                  className="input"
                  value={signalForm.signale_par_id}
                  onChange={e => setSignalForm(p => ({ ...p, signale_par_id: e.target.value }))}
                  required
                >
                  <option value="">—</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-req">Assigner la planification à</label>
                <select
                  className="input"
                  value={signalForm.assigne_a_id}
                  onChange={e => setSignalForm(p => ({ ...p, assigne_a_id: e.target.value }))}
                  required
                >
                  <option value="">— Choisir —</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Observation</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  value={signalForm.observation}
                  onChange={e => setSignalForm(p => ({ ...p, observation: e.target.value }))}
                  placeholder="Description de la panne…"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowSignal(false)}>Annuler</button>
                <button type="submit" className="btn-primary flex-1">Signaler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}