import { useState, useEffect } from 'react';
import { utilisateursAPI } from '../services/api';
import { useAuth, ROLE_LABELS } from '../store/auth';
import toast from 'react-hot-toast';
import {
  Plus, UserCheck, UserX, Edit2, ChevronDown, X,
  Shield, Info, Trash2, Users, Save
} from 'lucide-react';

const ROLE_COLORS = {
  ADMIN:'badge-red', RESP_MAINT:'badge-blue', RESP_PROD:'badge-green',
  TECHNICIEN:'badge-yellow', OPERATEUR:'badge-gray', LECTEUR:'badge-gray',
};

// ── Modal Utilisateur ─────────────────────────────────────────────
function ModalUtilisateur({ utilisateur, roles, onClose, onSaved }) {
  const isEdit = !!utilisateur;
  const [f, setF] = useState({
    nom: utilisateur?.nom || '',
    prenom: utilisateur?.prenom || '',
    email: utilisateur?.email || '',
    mot_de_passe: '',
    role_id: utilisateur?.role_id || (roles[0]?.id || ''),
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const selectedRole = roles.find(r => r.id === f.role_id);

  const submit = async () => {
    if (!f.nom || !f.prenom || !f.email || !f.role_id) return toast.error('Tous les champs sont requis');
    if (!isEdit && !f.mot_de_passe) return toast.error('Mot de passe requis');
    setLoading(true);
    try {
      const payload = { nom: f.nom, prenom: f.prenom, email: f.email, role_id: f.role_id };
      if (f.mot_de_passe) payload.mot_de_passe = f.mot_de_passe;
      if (isEdit) await utilisateursAPI.modifier(utilisateur.id, payload);
      else await utilisateursAPI.creer(payload);
      toast.success(isEdit ? 'Utilisateur modifié !' : 'Utilisateur créé !');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">{isEdit ? 'Modifier' : 'Nouvel utilisateur'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400"/></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label text-sm">Prénom *</label>
            <input value={f.prenom} onChange={e=>set('prenom',e.target.value)} className="input"/>
          </div>
          <div>
            <label className="label text-sm">Nom *</label>
            <input value={f.nom} onChange={e=>set('nom',e.target.value)} className="input"/>
          </div>
        </div>
        <div>
          <label className="label text-sm">Email *</label>
          <input type="email" value={f.email} onChange={e=>set('email',e.target.value)} className="input"/>
        </div>
        <div>
          <label className="label text-sm">
            Mot de passe {isEdit && <span className="text-gray-400 font-normal">(vide = inchangé)</span>}
          </label>
          <input type="password" value={f.mot_de_passe}
            onChange={e=>set('mot_de_passe',e.target.value)}
            placeholder={isEdit ? '••••••••' : 'Min. 8 caractères'}
            className="input"/>
        </div>
        <div>
          <label className="label text-sm">Rôle *</label>
          <div className="relative">
            <select value={f.role_id} onChange={e=>set('role_id',e.target.value)}
              className="input appearance-none pr-8 cursor-pointer">
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.nom} {r.description ? `— ${r.description.slice(0,40)}` : ''}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
          </div>
          {selectedRole?.description && (
            <div className="flex items-start gap-2 mt-2 p-2 bg-blue-50 rounded-lg">
              <Info size={13} className="text-blue-500 flex-shrink-0 mt-0.5"/>
              <p className="text-xs text-blue-700">{selectedRole.description}</p>
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={submit} disabled={loading} className="btn-primary flex-1">
            {loading ? 'Enregistrement…' : isEdit ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Rôle ────────────────────────────────────────────────────
function ModalRole({ role, onClose, onSaved }) {
  const isEdit = !!role;
  const [f, setF] = useState({
    nom:         role?.nom || '',
    description: role?.description || '',
  });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!f.nom) return toast.error('Nom du rôle requis');
    setLoading(true);
    try {
      if (isEdit) await utilisateursAPI.modifierRole2(role.id, f);
      else await utilisateursAPI.creerRole(f);
      toast.success(isEdit ? 'Rôle modifié !' : 'Rôle créé !');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">{isEdit ? 'Modifier le rôle' : 'Nouveau rôle'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400"/></button>
        </div>
        <div>
          <label className="label text-sm">Nom du rôle * <span className="text-gray-400 font-normal">(ex: SUPERVISEUR)</span></label>
          <input
            value={f.nom}
            onChange={e=>setF(p=>({...p,nom:e.target.value.toUpperCase()}))}
            placeholder="NOM_DU_ROLE"
            className="input font-mono"
            disabled={role?.nom === 'ADMIN'}
          />
        </div>
        <div>
          <label className="label text-sm">Description</label>
          <textarea
            value={f.description}
            onChange={e=>setF(p=>({...p,description:e.target.value}))}
            placeholder="Décrivez les droits et responsabilités de ce rôle…"
            rows={3}
            className="input resize-none"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={submit} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <Save size={14}/>{loading ? 'Enregistrement…' : isEdit ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────
export default function UtilisateursPage() {
  const { isAdmin } = useAuth();
  const canAdmin = isAdmin();
  const [activeTab, setActiveTab] = useState('utilisateurs');

  // Utilisateurs
  const [users, setUsers]       = useState([]);
  const [roles, setRoles]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalUser, setModalUser] = useState(null);
  const [filterRole, setFilterRole] = useState('');

  // Rôles
  const [modalRole, setModalRole]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([utilisateursAPI.lister(), utilisateursAPI.roles()]);
      setUsers(u.data?.data || u.data || []);
      setRoles(r.data || []);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const handleToggleActif = async (user) => {
    try {
      await utilisateursAPI.toggleActif(user.id);
      toast.success(`Utilisateur ${user.actif ? 'désactivé' : 'réactivé'} !`);
      loadAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleDeleteRole = async (role) => {
    try {
      await utilisateursAPI.supprimerRole(role.id);
      toast.success('Rôle supprimé !');
      setDeleteConfirm(null);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
      setDeleteConfirm(null);
    }
  };

  const filteredUsers = filterRole ? users.filter(u => u.role === filterRole) : users;

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Modals */}
      {modalUser && (
        <ModalUtilisateur
          utilisateur={modalUser === 'create' ? null : modalUser}
          roles={roles}
          onClose={() => setModalUser(null)}
          onSaved={() => { setModalUser(null); loadAll(); }}
        />
      )}
      {modalRole && (
        <ModalRole
          role={modalRole === 'create' ? null : modalRole}
          onClose={() => setModalRole(null)}
          onSaved={() => { setModalRole(null); loadAll(); }}
        />
      )}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-lg text-red-600">Supprimer le rôle</h3>
            <p className="text-sm text-gray-600">
              Confirmer la suppression du rôle <strong>{deleteConfirm.nom}</strong> ?
              Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={() => handleDeleteRole(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="card flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl text-gray-900">Administration</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {users.length} utilisateur{users.length>1?'s':''} · {roles.length} rôle{roles.length>1?'s':''}
          </p>
        </div>
        {canAdmin && (
          <button
            onClick={() => activeTab === 'utilisateurs' ? setModalUser('create') : setModalRole('create')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16}/>
            {activeTab === 'utilisateurs' ? 'Nouvel utilisateur' : 'Nouveau rôle'}
          </button>
        )}
      </div>

      {/* Onglets */}
      <div className="flex border-b border-gray-200 gap-1">
        {[
          { id:'utilisateurs', icon:Users,  label:`Utilisateurs (${users.length})` },
          { id:'roles',        icon:Shield, label:`Rôles (${roles.length})` },
        ].map(({ id, icon:Icon, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors
              ${activeTab===id
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={15}/>{label}
          </button>
        ))}
      </div>

      {/* ── Onglet Utilisateurs ──────────────────────────────────── */}
      {activeTab === 'utilisateurs' && (
        <div className="space-y-4">
          {/* Filtre */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <select value={filterRole} onChange={e=>setFilterRole(e.target.value)}
                className="input text-sm w-48 appearance-none pr-8 cursor-pointer">
                <option value="">Tous les rôles</option>
                {roles.map(r => <option key={r.id} value={r.nom}>{r.nom}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
            </div>
            <span className="text-xs text-gray-400">{filteredUsers.length} résultat{filteredUsers.length>1?'s':''}</span>
          </div>

          <div className="card p-0 overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisateur</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Rôle</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                    {canAdmin && <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${!u.actif?'opacity-50':''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {(u.prenom?.[0]||'').toUpperCase()}{(u.nom?.[0]||'').toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800">{u.prenom} {u.nom}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={ROLE_COLORS[u.role]||'badge-gray'}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={u.actif ? 'badge-green' : 'badge-gray'}>
                          {u.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      {canAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setModalUser(u)}
                              className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors" title="Modifier">
                              <Edit2 size={14}/>
                            </button>
                            <button onClick={() => handleToggleActif(u)}
                              className={`p-1.5 rounded-lg transition-colors ${u.actif
                                ? 'hover:bg-red-50 text-red-400'
                                : 'hover:bg-green-50 text-green-500'}`}
                              title={u.actif ? 'Désactiver' : 'Réactiver'}>
                              {u.actif ? <UserX size={14}/> : <UserCheck size={14}/>}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Onglet Rôles ─────────────────────────────────────────── */}
      {activeTab === 'roles' && (
        <div className="space-y-3">
          {roles.map(r => (
            <div key={r.id} className="card flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shield size={16} className="text-primary"/>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-gray-800">{r.nom}</span>
                    {r.nom === 'ADMIN' && (
                      <span className="badge-red text-xs">Protégé</span>
                    )}
                    <span className="text-xs text-gray-400">
                      {users.filter(u => u.role === r.nom).length} utilisateur(s)
                    </span>
                  </div>
                  {r.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                  )}
                </div>
              </div>
              {canAdmin && r.nom !== 'ADMIN' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setModalRole(r)}
                    className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors" title="Modifier">
                    <Edit2 size={14}/>
                  </button>
                  <button onClick={() => setDeleteConfirm(r)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors" title="Supprimer">
                    <Trash2 size={14}/>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}