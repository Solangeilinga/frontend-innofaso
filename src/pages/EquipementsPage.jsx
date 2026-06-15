import { useState, useEffect, useCallback } from 'react';
import { equipementsAPI, dashboardAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import { Search, Plus, Wrench, MapPin, X, BrainCircuit, ChevronDown, ChevronUp } from 'lucide-react';

// ── Couleurs et labels ────────────────────────────────────────────
const ETAT_COLOR  = { OPERATIONNEL:'badge-green', EN_PANNE:'badge-red', EN_MAINTENANCE:'badge-yellow' };
const RISQUE_CFG  = {
  'ÉLEVÉ':  { badge:'bg-red-100 text-red-700',    dot:'bg-red-500',    bar:'bg-red-500' },
  'MODÉRÉ': { badge:'bg-orange-100 text-orange-700', dot:'bg-orange-400', bar:'bg-orange-400' },
  'FAIBLE': { badge:'bg-green-100 text-green-700', dot:'bg-green-500',  bar:'bg-green-500' },
};

// ── Widget IA pour un équipement ──────────────────────────────────
function WidgetIA({ equipementNom }) {
  const [pred, setPred]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]     = useState(false);

  const fetchPred = useCallback(() => {
    if (pred || loading) return; // ne recharger qu'une fois
    setLoading(true);
    const now = new Date();
    dashboardAPI.predictions({ mois: now.getMonth() + 1, annee: now.getFullYear() })
      .then(r => {
        const all  = r.data?.predictions || [];
        // Chercher l'équipement par nom (correspondance partielle)
        const match = all.find(p =>
          p.equipement?.toLowerCase().includes(equipementNom?.toLowerCase().split(' ')[0]) ||
          equipementNom?.toLowerCase().includes(p.equipement?.toLowerCase().split(' ')[0])
        );
        setPred(match || null);
      })
      .catch(() => setPred(null))
      .finally(() => setLoading(false));
  }, [equipementNom, pred, loading]);

  const toggle = () => {
    if (!open) fetchPred();
    setOpen(o => !o);
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <BrainCircuit size={14} className="text-primary" />
          Prédiction IA — panne ce mois
        </span>
        {open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
      </button>

      {open && (
        <div className="mt-2">
          {loading && (
            <div className="flex items-center gap-2 py-2">
              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0"/>
              <span className="text-xs text-muted-foreground">Calcul en cours…</span>
            </div>
          )}

          {!loading && !pred && (
            <p className="text-xs text-muted-foreground italic">
              Équipement non reconnu par le modèle IA.
            </p>
          )}

          {!loading && pred && (() => {
            const cfg = RISQUE_CFG[pred.risque] || RISQUE_CFG['FAIBLE'];
            return (
              <div className="space-y-2">
                {/* Barre de probabilité */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cfg.bar}`}
                      style={{ width: `${pred.probabilite_pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-foreground w-10 text-right">
                    {pred.probabilite_pct}%
                  </span>
                </div>
                {/* Badge risque */}
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>
                    Risque {pred.risque}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {pred.risque === 'ÉLEVÉ'
                      ? '⚠️ Planifier une maintenance'
                      : pred.risque === 'MODÉRÉ'
                      ? '👁 Surveiller de près'
                      : '✅ Aucune action requise'}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── Modal création équipement ─────────────────────────────────────
function Modal({ onClose, onCreated }) {
  const [f, setF] = useState({ code_ref:'', nom:'', type_equipement:'', localisation:'', ligne_production:'' });
  const [l, setL] = useState(false);
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));

  const sub = async e => {
    e.preventDefault();
    if (!f.code_ref || !f.nom) return toast.error('Code et nom requis');
    setL(true);
    try { await equipementsAPI.creer(f); toast.success('Équipement créé !'); onCreated(); }
    catch(err) { toast.error(err.response?.data?.error || 'Erreur'); }
    finally { setL(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Nouvel équipement</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X size={18} className="text-muted-foreground"/>
          </button>
        </div>
        <form onSubmit={sub} className="space-y-3">
          {[
            ['code_ref',        'Code référence *',    'ex: BROYEUR-01'],
            ['nom',             'Nom *',               "Nom de l'équipement"],
            ['type_equipement', 'Type',                'Broyeur, Pompe…'],
            ['localisation',    'Localisation',        'Salle de production'],
            ['ligne_production','Ligne de production', 'Ligne 1'],
          ].map(([k, lbl, ph]) => (
            <div key={k}>
              <label className="label">{lbl}</label>
              <input
                value={f[k]}
                onChange={e => s(k, e.target.value)}
                placeholder={ph}
                className="input"
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={l} className="btn-primary flex-1">
              {l ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────
export default function EquipementsPage() {
  const { peutGerer } = useAuth();
  const [items,   setItems]   = useState([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);

  const load = () => {
    setLoading(true);
    equipementsAPI.lister({ search: search || undefined })
      .then(r => setItems(r.data?.data || (Array.isArray(r.data) ? r.data : [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  // Grouper par ligne
  const groupes = items.reduce((acc, e) => {
    const ligne = e.ligne_production || e.ligne_code || 'Sans ligne';
    if (!acc[ligne]) acc[ligne] = [];
    acc[ligne].push(e);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {modal && (
        <Modal
          onClose={() => setModal(false)}
          onCreated={() => { setModal(false); load(); }}
        />
      )}

      {/* Barre recherche + bouton ajouter */}
      <div className="card flex gap-3 p-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input
            placeholder="Rechercher un équipement…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        {peutGerer?.() && (
          <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16}/> Ajouter
          </button>
        )}
      </div>

      {/* Légende IA */}
      <div className="flex items-center gap-2 px-1">
        <BrainCircuit size={14} className="text-primary flex-shrink-0"/>
        <p className="text-xs text-muted-foreground">
          Cliquez sur <strong>Prédiction IA</strong> sur chaque carte pour voir le risque de panne ce mois-ci.
        </p>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-16 text-muted-foreground">
          <Wrench size={40} className="mx-auto mb-3 opacity-30"/>
          <p className="font-medium">Aucun équipement trouvé</p>
        </div>
      ) : (
        Object.entries(groupes).map(([ligne, groupe]) => (
          <div key={ligne} className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <span className="rounded-lg bg-primary/10 px-2.5 py-0.5 text-sm text-primary">{ligne}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {groupe.length} équipement{groupe.length > 1 ? 's' : ''}
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {groupe.map(e => (
                <div key={e.id} className="card hover:shadow-lg transition-shadow">
                  {/* En-tête carte */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Wrench size={18} className="text-primary"/>
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-primary">{e.code_ref}</p>
                      <p className="font-semibold text-sm text-foreground leading-tight">{e.nom}</p>
                    </div>
                  </div>

                  {/* Infos */}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {e.type_equipement && (
                      <p>Type : <span className="text-foreground">{e.type_equipement}</span></p>
                    )}
                    {e.localisation && (
                      <p className="flex items-center gap-1">
                        <MapPin size={11}/>{e.localisation}
                      </p>
                    )}
                    {e.ligne_production && (
                      <p>Ligne : <span className="text-foreground">{e.ligne_production}</span></p>
                    )}
                  </div>

                  {/* Badge état */}
                  <span className={`mt-3 inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${ETAT_COLOR[e.etat] || 'badge-gray'}`}>
                    {e.etat?.replace(/_/g, ' ')}
                  </span>

                  {/* Widget IA — dépliable */}
                  <WidgetIA equipementNom={e.nom} />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}