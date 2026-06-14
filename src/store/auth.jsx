import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const Ctx = createContext(null);

export const ROLE_LABELS = {
  ADMIN:      'Administrateur',
  RESP_MAINT: 'Responsable Maintenance',
  RESP_PROD:  'Responsable Production',
  TECHNICIEN: 'Technicien',
  OPERATEUR:  'Opérateur',
};

// Mapping rôle → module automatique pour les non-admins
const ROLE_MODULE = {
  RESP_MAINT: 'MAINTENANCE',
  TECHNICIEN: 'MAINTENANCE',
  RESP_PROD:  'PRODUCTION',
  OPERATEUR:  'PRODUCTION',
};

const getModuleFromRole = (role) => ROLE_MODULE[role] || null;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('if_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // moduleScope admin = choisi manuellement, non-admin = déduit du rôle
  const [adminModuleScope, setAdminModuleScope] = useState(() => {
    try { return localStorage.getItem('if_module') || ''; } catch { return ''; }
  });

  // moduleScope effectif = admin choisit, non-admin déduit du rôle
  const moduleScope = user?.role === 'ADMIN'
    ? adminModuleScope
    : (getModuleFromRole(user?.role) || '');

  useEffect(() => {
    const token = localStorage.getItem('if_token');
    if (token) {
      authAPI.me()
        .then(r => {
          const u = r.data.user || r.data;
          setUser(u);
          localStorage.setItem('if_user', JSON.stringify(u));
        })
        .catch(() => {
          localStorage.removeItem('if_token');
          localStorage.removeItem('if_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, mot_de_passe) => {
    const { data } = await authAPI.login({ email, mot_de_passe });
    localStorage.setItem('if_token', data.accessToken);
    const u = data.user;
    localStorage.setItem('if_user', JSON.stringify(u));
    setUser(u);
    // Réinitialiser le scope admin si non-admin
    if (u?.role !== 'ADMIN') {
      localStorage.removeItem('if_module');
      setAdminModuleScope('');
    }
    return u;
  };

  const logout = () => {
    localStorage.removeItem('if_token');
    localStorage.removeItem('if_user');
    localStorage.removeItem('if_module');
    setUser(null);
    setAdminModuleScope('');
  };

  // Seulement pour l'admin (choix manuel du module)
  const selectModule = (module) => {
    if (!module) { localStorage.removeItem('if_module'); setAdminModuleScope(''); return; }
    localStorage.setItem('if_module', module);
    setAdminModuleScope(module);
  };

  const hasRole     = (...roles) => roles.includes(user?.role);
  const isAdmin     = () => hasRole('ADMIN');
  const peutValider = () => hasRole('ADMIN','RESP_MAINT','RESP_PROD');
  const peutGerer   = () => hasRole('ADMIN','RESP_MAINT','RESP_PROD');

  return (
    <Ctx.Provider value={{
      user, loading, login, logout,
      hasRole, isAdmin, peutValider, peutGerer,
      moduleScope, selectModule,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth doit être dans AuthProvider');
  return ctx;
};