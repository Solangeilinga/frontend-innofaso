import axios from 'axios';

// En dev   : Vite proxy redirige /api → backend (vite.config.js)
// En prod  : /api doit pointer vers le backend (même domaine ou VITE_API_URL)
const BASE_URL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api/v1`
    : '/api';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 25000,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(cfg => {
    const token = localStorage.getItem('if_token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
});

api.interceptors.response.use(
    r => r,
    err => {
        if (err.response?.status === 401) {
            localStorage.removeItem('if_token');
            localStorage.removeItem('if_user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

// ── Auth ─────────────────────────────────────────────────────────
export const authAPI = {
    login:  d  => api.post('/auth/login', d),
    me:     ()  => api.get('/auth/me'),
    chgPwd: d  => api.put('/auth/change-password', d),
    logout: ()  => api.post('/auth/logout'),
};

// ── Formulaires ──────────────────────────────────────────────────
export const formulairesAPI = {
    lister:         p            => api.get('/formulaires', { params: p }),
    getUn:          id           => api.get(`/formulaires/${id}`),
    creer:          d            => api.post('/formulaires', d),
    modifier:       (id, d)      => api.put(`/formulaires/${id}`, d),
    supprimer:      id           => api.delete(`/formulaires/${id}`),
    restaurer:      id           => api.put(`/formulaires/${id}/restore`),
    typesChamps:    ()           => api.get('/formulaires/meta/types-champs'),
    getChamps:      id           => api.get(`/formulaires/${id}/champs`),
    ajouterChamp:   (id, d)      => api.post(`/formulaires/${id}/champs`, d),
    modifierChamp:  (id, cid, d) => api.put(`/formulaires/${id}/champs/${cid}`, d),
    supprimerChamp: (id, cid)    => api.delete(`/formulaires/${id}/champs/${cid}`),
    restaurerChamp: (id, cid)    => api.put(`/formulaires/${id}/champs/${cid}/restore`),
    reordonner:     (id, d)      => api.put(`/formulaires/${id}/champs/reordonner`, d),
    getSchema:      id           => api.get(`/formulaires/${id}/schema`),
    promptIA:       (id, d)      => api.post(`/formulaires/${id}/prompt-ia`, d),
};

// ── Soumissions ──────────────────────────────────────────────────
export const soumissionsAPI = {
    lister:   p        => api.get('/soumissions', { params: p }),
    getUne:   id       => api.get(`/soumissions/${id}`),
    creer:    d        => api.post('/soumissions', d),
    valider:  (id, d)  => api.patch(`/soumissions/${id}/statut`, d),
    sync:     d        => api.post('/soumissions/sync', d),
    exporter: p        => api.get('/soumissions/export/excel', { params: p, responseType: 'blob' }),
};

// ── Équipements ──────────────────────────────────────────────────
export const equipementsAPI = {
    lister:    p        => api.get('/equipements', { params: p }),
    getUn:     id       => api.get(`/equipements/${id}`),
    creer:     d        => api.post('/equipements', d),
    modifier:  (id, d)  => api.put(`/equipements/${id}`, d),
    updateEtat:(id, d)  => api.patch(`/equipements/${id}/etat`, d),
};

// ── Alertes ──────────────────────────────────────────────────────
export const alertesAPI = {
    lister:         p       => api.get('/alertes', { params: p }),
    countNonLues:   ()      => api.get('/alertes/non-lues/count'),
    marquer:        (id, d) => api.patch(`/alertes/${id}`, d),
    marquerLue:     id      => api.patch(`/alertes/${id}/lue`),
    marquerTraitee: id      => api.patch(`/alertes/${id}/traitee`),
    toutesLues:     ()      => api.patch('/alertes/toutes/lues'),
};

// ── Stock ────────────────────────────────────────────────────────
export const stockAPI = {
    pieces:     p        => api.get('/stock/pieces', { params: p }),
    creerPiece: d        => api.post('/stock/pieces', d),
    modifier:   (id, d)  => api.put(`/stock/pieces/${id}`, d),
    mouvement:  d        => api.post('/stock/pieces/mouvement', d),
    historique: id       => api.get(`/stock/pieces/${id}/mouvements`),
    alertes:    ()       => api.get('/stock/alertes-stock'),
    exporter:   p        => api.get('/stock/export/excel', { params: p, responseType: 'blob' }),
};

// ── Matières premières ───────────────────────────────────────────
export const matieresAPI = {
    lister:     p        => api.get('/matieres', { params: p }),
    stats:      ()       => api.get('/matieres/stats').catch(() => ({ data: {} })),
    categories: ()       => api.get('/matieres/categories').catch(() => ({ data: [] })),
    getUne:     id       => api.get(`/matieres/${id}`),
    creer:      d        => api.post('/matieres', d),
    modifier:   (id, d)  => api.put(`/matieres/${id}`, d),
    supprimer:  id       => api.delete(`/matieres/${id}`),
    mouvements: id       => api.get(`/matieres/${id}/mouvements`),
    mouvement:  d        => api.post('/matieres/mouvement', d),
};

// ── Planning ─────────────────────────────────────────────────────
export const planningAPI = {
    lister:  p        => api.get('/planning', { params: p }),
    statut:  (id, d)  => api.patch(`/planning/${id}/statut`, d),

    creerOuRecupererPlanningSemaine: d  => api.post('/planning/semaine/creer-ou-recuperer', d),
    obtenirPlanningSemaine:          id => api.get(`/planning/semaine/${id}`),
    obtenirPlanningMois:             p  => api.get('/planning/mois', { params: p }),
    listerSemainesPlanifiees:        p  => api.get('/planning/semaines/lister', { params: p }),
    listerHistorique:                p  => api.get('/planning/historique', { params: p }),

    assignerMaintenancierQuart:      d  => api.post('/planning/quart/assigner', d),
    creerOuModifierIntervention:     d  => api.post('/planning/intervention/creer-ou-modifier', d),
    mettreAJourInterventionLigne:    d  => api.put('/planning/intervention-ligne', d),
    mettreAJourLigneQuart:           d  => api.put('/planning/ligne-quart', d),
    supprimerPlanningQuart:          id => api.delete(`/planning/quart/${id}`),
    supprimerIntervention:           id => api.delete(`/planning/intervention/${id}`),

    dashboardSynthese:            p => api.get('/planning/synthese',   { params: p }).catch(() => ({ data: { kpis:{}, par_maintenancier:[] } })),
    dashboardGraphiques:          p => api.get('/planning/graphiques', { params: p }).catch(() => ({ data: { evolution:[], dispo_par_ligne:[], repartition:[], par_semaine:[] } })),
    suiviEquipementsParLigne:     p => api.get('/planning/suivi-equipements', { params: p }).catch(() => ({ data: [] })),
    enregistrerSuiviAction:       d => api.post('/planning/suivi-action', d),
    graphiqueEvolutionMaintenance: p => api.get('/planning/graphique/evolution', { params: p }),

    listerLignes:         p => api.get('/planning/lignes', { params: p }).catch(() => ({ data: [] })),
    listerQuarts:         () => api.get('/planning/quarts/lister'),
    listerMaintenanciers: () => api.get('/planning/maintenanciers/lister'),
};

// ── Lignes ───────────────────────────────────────────────────────
export const lignesAPI = {
    lister:    ()       => api.get('/lignes'),
    creer:     d        => api.post('/lignes', d),
    modifier:  (id, d)  => api.put(`/lignes/${id}`, d),
    supprimer: id       => api.delete(`/lignes/${id}`),
};

// ── Utilisateurs ─────────────────────────────────────────────────
export const utilisateursAPI = {
    lister:       p        => api.get('/utilisateurs', { params: p }),
    roles:        ()       => api.get('/utilisateurs/roles'),
    getUn:        id       => api.get(`/utilisateurs/${id}`),
    creer:        d        => api.post('/utilisateurs', d),
    modifier:     (id, d)  => api.put(`/utilisateurs/${id}`, d),
    toggleActif:  id       => api.patch(`/utilisateurs/${id}/actif`),
    modifierRole: (id, d)  => api.patch(`/utilisateurs/${id}/role`, d),
    signataires:  ()       => api.get('/utilisateurs/liste-signataires'),
};

export const signatairesAPI = { liste: () => api.get('/utilisateurs/liste-signataires') };

// ── Dashboard ────────────────────────────────────────────────────
export const dashboardAPI = {
    stats:       () => api.get('/dashboard/stats').catch(()    => ({ data: {} })),
    activite:    () => api.get('/dashboard/activite').catch(() => ({ data: [] })),
    retard:      () => api.get('/dashboard/retard').catch(()   => ({ data: [] })),
    kpi:         () => api.get('/dashboard/kpi').catch(()      => ({ data: [] })),
    historique:  p  => api.get('/dashboard/historique', { params: p }),
    predictions: p  => api.get('/dashboard/ia/predictions', { params: p })
                         .catch(() => ({ data: { disponible: false, predictions: [] } })),
};

// ── Helpers ──────────────────────────────────────────────────────
export const downloadExcel = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
};

export default api;
