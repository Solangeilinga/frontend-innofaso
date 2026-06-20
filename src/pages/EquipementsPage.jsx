import { useState, useEffect, useCallback } from 'react';
import { equipementsAPI, dashboardAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import { Search, Plus, Wrench, MapPin, X, BrainCircuit } from 'lucide-react';

const ETAT_COLOR = {
  OPERATIONNEL:   'badge-green',
  EN_PANNE:       'badge-red',
  EN_MAINTENANCE: 'badge-yellow',
};

const RISQUE = {
  'ÉLEVÉ':  { color:'#ef4444', bg:'#fef2f2', text:'#991b1b', reco:'⚠️ Planifier une maintenance', track:'#fecaca' },
  'MODÉRÉ': { color:'#f97316', bg:'#fff7ed', text:'#9a3412', reco:'👁 Surveiller de près',          track:'#fed7aa' },
  'FAIBLE': { color:'#22c55e', bg:'#f0fdf4', text:'#166534', reco:'✅ Aucune action requise',       track:'#bbf7d0' },
};

// ── Gauge SVG circulaire ──────────────────────────────────────────
function Gauge({ pct, risque }) {
  const cfg    = RISQUE[risque] || RISQUE['FAIBLE'];
  const R      = 36;
  const circ   = 2 * Math.PI * R;
  const half   = circ / 2; // demi-cercle
  const offset = half - (pct / 100) * half;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      <div style={{ position:'relative', width:96, height:56 }}>
        <svg width="96" height="56" viewBox="0 0 96 56" style={{ overflow:'visible' }}>
          {/* Track */}
          <path
            d="M 10 50 A 38 38 0 0 1 86 50"
            fill="none" stroke={cfg.track} strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Arc valeur */}
          <path
            d="M 10 50 A 38 38 0 0 1 86 50"
            fill="none" stroke={cfg.color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(pct/100)*120} 120`}
            style={{ transition:'stroke-dasharray .8s ease' }}
          />
          {/* Valeur centrale */}
          <text x="48" y="46" textAnchor="middle"
            fontSize="15" fontWeight="800" fill={cfg.color}>
            {pct}%
          </text>
        </svg>
      </div>
      {/* Badge risque */}
      <span style={{
        padding:'2px 10px', borderRadius:999,
        fontSize:11, fontWeight:700,
        background:cfg.bg, color:cfg.text,
      }}>
        {risque}
      </span>
      <span style={{ fontSize:11, color:'#64748b', textAlign:'center' }}>{cfg.reco}</span>
    </div>
  );
}

// Cache global — 1 seul appel API pour toute la page
let _predsCache = null;
let _predsPromise = null;

function usePredictions() {
  const [preds, setPreds]     = useState(_predsCache);
  const [loading, setLoading] = useState(!_predsCache);

  useEffect(() => {
    if (_predsCache) { setPreds(_predsCache); setLoading(false); return; }
    if (!_predsPromise) {
      const now = new Date();
      _predsPromise = dashboardAPI.predictions({ mois: now.getMonth()+1, annee: now.getFullYear() })
        .then(r => { _predsCache = r.data?.predictions || []; return _predsCache; })
        .catch(() => { _predsCache = []; return []; });
    }
    _predsPromise.then(d => { setPreds(d); setLoading(false); });
  }, []);

  return { preds: preds || [], loading };
}

function trouver(preds, nom) {
  if (!preds?.length || !nom) return null;
  const n = nom.toLowerCase().trim();
  return (
    preds.find(p => p.equipement?.toLowerCase().trim() === n) ||
    preds.find(p => p.equipement?.toLowerCase().includes(n)) ||
    preds.find(p => n.includes(p.equipement?.toLowerCase().trim())) ||
    preds.find(p => p.equipement?.toLowerCase().startsWith(n.split(' ').slice(0,2).join(' ')))
  ) || null;
}

// ── Carte équipement avec gauge IA intégrée ───────────────────────
function CarteEquipement({ e }) {
  const { preds, loading } = usePredictions();
  const pred = trouver(preds, e.nom);

  return (
    <div className="card hover:shadow-lg transition-shadow" style={{ display:'flex', flexDirection:'column' }}>
      {/* En-tête */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:12 }}>
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Wrench size={18} className="text-primary"/>
        </div>
        <div style={{ minWidth:0 }}>
          <p style={{ fontFamily:'monospace', fontSize:11, color:'var(--primary)', margin:0 }}>{e.code_ref}</p>
          <p style={{ fontWeight:600, fontSize:14, margin:0, lineHeight:1.3 }}>{e.nom}</p>
        </div>
      </div>

      {/* Infos */}
      <div style={{ fontSize:12, color:'var(--muted-foreground)', marginBottom:10, display:'flex', flexDirection:'column', gap:3 }}>
        {e.type_equipement && <span>Type : <b style={{color:'var(--foreground)'}}>{e.type_equipement}</b></span>}
        {e.localisation    && <span style={{display:'flex',alignItems:'center',gap:3}}><MapPin size={11}/>{e.localisation}</span>}
      </div>

      {/* Badge état */}
      <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${ETAT_COLOR[e.etat] || 'badge-gray'}`}
        style={{alignSelf:'flex-start', marginBottom:16}}>
        {e.etat?.replace(/_/g,' ')}
      </span>

      {/* Séparateur */}
      <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginTop:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
          <BrainCircuit size={13} style={{ color:'var(--primary)' }}/>
          <span style={{ fontSize:11, fontWeight:600, color:'var(--muted-foreground)', textTransform:'uppercase', letterSpacing:'.06em' }}>
            Prédiction IA — Juillet
          </span>
        </div>

        {loading && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0' }}>
            <div style={{
              width:14, height:14, border:'2px solid var(--primary)',
              borderTopColor:'transparent', borderRadius:'50%',
              animation:'spin .7s linear infinite',
            }}/>
            <span style={{ fontSize:12, color:'var(--muted-foreground)' }}>Calcul en cours…</span>
          </div>
        )}

        {!loading && !pred && (
          <p style={{ fontSize:11, color:'#94a3b8', fontStyle:'italic', margin:0 }}>
            Non couvert par le modèle IA
          </p>
        )}

        {!loading && pred && (
          <Gauge pct={pred.probabilite_pct} risque={pred.risque} />
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Modal création ─────────────────────────────────────────────────
function Modal({ onClose, onCreated }) {
  const [f, setF] = useState({ code_ref:'', nom:'', type_equipement:'', localisation:'', ligne_production:'' });
  const [l, setL] = useState(false);

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
            ['code_ref','Code référence *','ex: BROYEUR-01'],
            ['nom','Nom *',"Nom de l'équipement"],
            ['type_equipement','Type','Broyeur, Pompe…'],
            ['localisation','Localisation','Salle de production'],
            ['ligne_production','Ligne de production','Ligne 1'],
          ].map(([k,lbl,ph]) => (
            <div key={k}>
              <label className="label">{lbl}</label>
              <input value={f[k]} onChange={e => setF(p=>({...p,[k]:e.target.value}))} placeholder={ph} className="input"/>
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={l} className="btn-primary flex-1">{l?'Création…':'Créer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────
export default function EquipementsPage() {
  const { peutGerer } = useAuth();
  const [items, setItems]     = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    equipementsAPI.lister({ search: search || undefined })
      .then(r => setItems(r.data?.data || (Array.isArray(r.data) ? r.data : [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const groupes = items.reduce((acc, e) => {
    const ligne = e.ligne_production || 'Sans ligne';
    if (!acc[ligne]) acc[ligne] = [];
    acc[ligne].push(e);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {modal && <Modal onClose={()=>setModal(false)} onCreated={()=>{setModal(false);load();}}/>}

      <div className="card flex gap-3 p-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input placeholder="Rechercher un équipement…" value={search}
            onChange={e=>setSearch(e.target.value)} className="input pl-9"/>
        </div>
        {peutGerer?.() && (
          <button onClick={()=>setModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16}/> Ajouter
          </button>
        )}
      </div>

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
            <h3 className="flex items-center gap-2 font-semibold">
              <span className="rounded-lg bg-primary/10 px-2.5 py-0.5 text-sm text-primary">{ligne}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {groupe.length} équipement{groupe.length>1?'s':''}
              </span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {groupe.map(e => <CarteEquipement key={e.id} e={e}/>)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}