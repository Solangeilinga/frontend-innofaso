import { useState, useEffect } from 'react';
import { utilisateursAPI } from '../services/api';
import { useAuth, ROLE_LABELS } from '../store/auth';
import toast from 'react-hot-toast';
import { Plus, UserCheck, UserX, Edit2, ChevronDown, X } from 'lucide-react';

const ROLE_COLORS = {
  ADMIN:      'badge-red',
  RESP_MAINT: 'badge-blue',
  RESP_PROD:  'badge-green',
  TECHNICIEN: 'badge-yellow',
  OPERATEUR:  'badge-gray',
};

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
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400"/></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-req text-sm">Prénom</label>
            <input value={f.prenom} onChange={e => set('prenom', e.target.value)} className="input"/>
          </div>
          <div>
            <label className="label-req text-sm">Nom</label>
            <input value={f.nom} onChange={e => set('nom', e.target.value)} className="input"/>
          </div>
        </div>
        <div>
          <label className="label-req text-sm">Email</label>
          <input type="email" value={f.email} onChange={e => set('email', e.target.value)} className="input"/>
        </div>
        <div>
          <label className={isEdit ? 'label text-sm' : 'label-req text-sm'}>
            Mot de passe {isEdit && <span className="font-normal text-gray-400">(laisser vide pour ne pas changer)</span>}
          </label>
          <input type="password" value={f.mot_de_passe} onChange={e => set('mot_de_passe', e.target.value)}
            placeholder={isEdit ? '••••••••' : 'Minimum 8 caractères'} className="input"/>
        </div>
        <div>
          <label className="label-req text-sm">Rôle</label>
          <div className="relative">
            <select value={f.role_id} onChange={e => set('role_id', e.target.value)}
              className="input appearance-none pr-8 cursor-pointer">
              {roles.map(r => <option key={r.id} value={r.id}>{ROLE_LABELS[r.nom] || r.nom}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
          </div>
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

export default function UtilisateursPage() {
  const { isAdmin } = useAuth();
  const canAdmin = isAdmin();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | utilisateur object

  const load = async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([utilisateursAPI.lister(), utilisateursAPI.roles()]);
      setUsers(u.data?.data || u.data || []);
      setRoles(r.data || []);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleToggleActif = async (user) => {
    try {
      await utilisateursAPI.toggleActif(user.id);
      toast.success(`Utilisateur ${user.actif ? 'désactivé' : 'réactivé'} !`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {modal && (
        <ModalUtilisateur
          utilisateur={modal === 'create' ? null : modal}
          roles={roles}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}

      <div className="card flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-sm text-gray-400 mt-0.5">{users.length} compte{users.length>1?'s':''}</p>
        </div>
        {canAdmin && (
          <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-2">
            <Plus size={16}/> Nouvel utilisateur
          </button>
        )}
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
              {users.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${!u.actif ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {(u.prenom?.[0]||'').toUpperCase()}{(u.nom?.[0]||'').toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{u.prenom} {u.nom}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={ROLE_COLORS[u.role] || 'badge-gray'}>
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
                        <button onClick={() => setModal(u)}
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors" title="Modifier">
                          <Edit2 size={14}/>
                        </button>
                        <button onClick={() => handleToggleActif(u)}
                          className={`p-1.5 rounded-lg transition-colors ${u.actif
                            ? 'hover:bg-red-50 text-red-400' : 'hover:bg-green-50 text-green-500'}`}
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
  );
}
