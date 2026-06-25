import { useState, useEffect, useCallback } from 'react';
import { equipementsAPI, dashboardAPI, planningAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import {
  Search, Plus, Wrench, MapPin, X, BrainCircuit, Trash2,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const ETAT_COLOR = {
  OPERATIONNEL:   'badge-green',
  EN_PANNE:       'badge-red',
  EN_MAINTENANCE: 'badge-yellow',
};

const ETAT_OPTIONS = ['OPERATIONNEL', 'EN_PANNE', 'EN_MAINTENANCE'];

const RISQUE = {
  'ÉLEVÉ':  { color:'#ef4444', bg:'#fef2f2', text:'#991b1b', reco:'⚠️ Planifier une maintenance', track:'#fecaca' },
  'MODÉRÉ': { color:'#f97316', bg:'#fff7ed', text:'#9a3412', reco:'👁 Surveiller de près',          track:'#fed7aa' },
  'FAIBLE': { color:'#22c55e', bg:'#f0fdf4', text:'#166534', reco:'✅ Aucune action requise',       track:'#bbf7d0' },
};

function Gauge({ pct, risque }) {
  const cfg = RISQUE[risque] || RISQUE['FAIBLE'];
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      <div style={{ position:'relative', width:96, height:56 }}>
        <svg width="96" height="56" viewBox="0 0 96 56" style={{ overflow:'visible' }}>
          <path d="M 10 50 A 38 38 0 0 1 86 50" fill="none" stroke={cfg.track} strokeWidth="8" strokeLinecap="round" />
          <path d="M 10 50 A 38 38 0 0 1 86 50" fill="none" stroke={cfg.color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={`${(pct/100)*120} 120`}
            style={{ transition:'stroke-dasharray .8s ease' }} />
          <text x="48" y="46" textAnchor="middle" fontSize="15" fontWeight="800" fill={cfg.color}>{pct}%</text>
        </svg>
      </div>
      <span style={{ padding:'2px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:cfg.bg, color:cfg.text }}>{risque}</span>
      <span style={{ fontSize:11, color:'#64748b', textAlign:'center' }}>{cfg.reco}</span>
    </div>
  );
}

let _predsCache = null;
let _predsPromise = null;

function usePredictions() {
  const [preds, setPreds] = useState(_predsCache);
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
  return preds.find(p => p.equipement?.toLowerCase().trim() === n) ||
    preds.find(p => n.includes(p.equipement?.toLowerCase().trim())) || null;
}

function MiniDashboardCorrectives() {
  const [type, setType] = useState('mois');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    planningAPI.courbeCorrectivesEquipements({ type, date })
      .then(r => setData(Array.isArray(r.data) ? r.data : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [type, date]);

  const isAnnee = type === 'annee';

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-foreground">Courbe des heures correctives par équipement</h2>
          <p className="text-xs text-muted-foreground">Évolution des arrêts correctifs — filtre jour / mois / année</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {['jour', 'mois', 'annee'].map(t => (
              <button key={t} type="button"
                className={`px-3 py-1 text-xs font-medium ${type === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                onClick={() => setType(t)}
              >{t === 'jour' ? 'Jour' : t === 'mois' ? 'Mois' : 'Année'}</button>
            ))}
          </div>
          {!isAnnee ? (
            <input type="month" value={date.slice(0, 7)}
              onChange={e => setDate(e.target.value + '-01')}
              className="input max-w-[140px] text-xs" />
          ) : (
            <input type="number" value={date.slice(0, 4)}
              onChange={e => setDate(e.target.value + '-01-01')}
              className="input max-w-[80px] text-xs" min="2020" max="2030" />
          )}
        </div>
      </div>
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          Aucune donnée corrective pour cette période.
        </div>
      ) : (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="equipement" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => [`${Number(v).toFixed(1)} h`, 'Correctif']} />
              <Legend />
              <Line type="monotone" dataKey="heures" name="Heures correctives" stroke="#dc2626" strokeWidth={2} dot={{ r: 4, fill: '#dc2626' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function EquipementDetailModal({ equipement, onClose, onUpdated }) {
  const [type, setType] = useState('mois');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [etat, setEtat] = useState(equipement.etat || '');

  useEffect(() => {
    if (!equipement?.id) return;
    setLoading(true);
    planningAPI.detailEquipementMaintenance(equipement.id, { type, date })
      .then(r => setData(r.data || {}))
      .catch(() => setData({ detail: [], observations_frequentes: [], temps_max: null }))
      .finally(() => setLoading(false));
  }, [equipement?.id, type, date]);

  const isAnnee = type === 'annee';

  const totalPrev = data?.detail?.reduce((s, r) => s + Number(r.heures_prev || 0), 0) || 0;
  const totalCorr = data?.detail?.reduce((s, r) => s + Number(r.heures_corr || 0), 0) || 0;
  const totalAll = totalPrev + totalCorr;

  const handleEtatChange = async (newEtat) => {
    try {
      await equipementsAPI.updateEtat(equipement.id, { etat: newEtat });
      setEtat(newEtat);
      toast.success('État mis à jour');
      if (onUpdated) onUpdated();
    } catch { toast.error('Erreur mise à jour état'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">{equipement.nom}</h2>
            <p className="text-sm text-muted-foreground">{equipement.code_ref} · {equipement.ligne_production || equipement.localisation || ''}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-muted"><X size={20} /></button>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {['jour', 'mois', 'annee'].map(t => (
              <button key={t} type="button"
                className={`px-4 py-1.5 text-sm font-medium ${type === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                onClick={() => setType(t)}
              >{t === 'jour' ? 'Jour' : t === 'mois' ? 'Mois' : 'Année'}</button>
            ))}
          </div>
          {!isAnnee ? (
            <input type="month" value={date.slice(0, 7)} onChange={e => setDate(e.target.value + '-01')} className="input max-w-[160px] text-sm" />
          ) : (
            <input type="number" value={date.slice(0, 4)} onChange={e => setDate(e.target.value + '-01-01')} className="input max-w-[100px] text-sm" min="2020" max="2030" />
          )}
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Préventif</p>
                <p className="text-2xl font-bold text-primary mt-1">{totalPrev.toFixed(1)}<span className="text-sm font-normal text-muted-foreground">h</span></p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Correctif</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{totalCorr.toFixed(1)}<span className="text-sm font-normal text-muted-foreground">h</span></p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Total</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalAll.toFixed(1)}<span className="text-sm font-normal text-muted-foreground">h</span></p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Observations fréquentes</h3>
                {data?.observations_frequentes?.length > 0 ? (
                  <ul className="space-y-1.5">
                    {data.observations_frequentes.map((obs, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <span>{obs.texte} <span className="text-muted-foreground">({obs.nb}x)</span></span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">Aucune observation</p>}
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Temps le plus élevé</h3>
                {data?.temps_max ? (
                  <div className="text-sm">
                    <span className="font-bold text-lg">{Number(data.temps_max.duree_max).toFixed(1)}h</span>
                    <span className="ml-2 text-muted-foreground">({data.temps_max.type})</span>
                  </div>
                ) : <p className="text-sm text-muted-foreground">—</p>}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Changer l'état</h3>
              <div className="flex gap-2">
                {ETAT_OPTIONS.map(opt => (
                  <button key={opt} type="button"
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${etat === opt ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
                    onClick={() => handleEtatChange(opt)}
                  >{opt.replace(/_/g, ' ')}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CarteEquipement({ e, onViewDetail, onDelete, onEtatChange }) {
  const { preds, loading } = usePredictions();
  const pred = trouver(preds, e.nom);
  const peut = useAuth().peutGerer?.();

  return (
    <div className="card hover:shadow-lg transition-shadow" style={{ display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:12 }}>
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Wrench size={18} className="text-primary"/>
        </div>
        <div style={{ minWidth:0, flex:1 }}>
          <p style={{ fontFamily:'monospace', fontSize:11, color:'var(--primary)', margin:0 }}>{e.code_ref}</p>
          <p style={{ fontWeight:600, fontSize:14, margin:0, lineHeight:1.3 }}>{e.nom}</p>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => onViewDetail(e)}
            className="shrink-0 rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
          >Détails</button>
          {peut && (
            <button type="button" onClick={() => onDelete(e)}
              className="shrink-0 rounded-lg p-1.5 text-red-500 hover:bg-red-50"
              title="Supprimer"
            ><Trash2 size={14} /></button>
          )}
        </div>
      </div>

      <div style={{ fontSize:12, color:'var(--muted-foreground)', marginBottom:10, display:'flex', flexDirection:'column', gap:3 }}>
        {e.type_equipement && <span>Type : <b style={{color:'var(--foreground)'}}>{e.type_equipement}</b></span>}
        {e.localisation && <span style={{display:'flex',alignItems:'center',gap:3}}><MapPin size={11}/>{e.localisation}</span>}
      </div>

      <div className="flex items-center gap-2 flex-wrap" style={{ alignSelf:'flex-start', marginBottom:8 }}>
        <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${ETAT_COLOR[e.etat] || 'badge-gray'}`}>
          {e.etat?.replace(/_/g,' ')}
        </span>
        {peut && (
          <div className="flex gap-1">
            {ETAT_OPTIONS.filter(o => o !== e.etat).slice(0, 2).map(opt => (
              <button key={opt} type="button" onClick={() => onEtatChange(e.id, opt)}
                className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-muted text-muted-foreground"
              >{opt === 'EN_PANNE' ? 'Panne' : opt === 'OPERATIONNEL' ? 'Op.' : 'Maint.'}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginTop:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
          <BrainCircuit size={13} style={{ color:'var(--primary)' }}/>
          <span style={{ fontSize:11, fontWeight:600, color:'var(--muted-foreground)', textTransform:'uppercase', letterSpacing:'.06em' }}>
            Prédiction IA
          </span>
        </div>
        {loading && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0' }}>
            <div style={{ width:14, height:14, border:'2px solid var(--primary)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
            <span style={{ fontSize:12, color:'var(--muted-foreground)' }}>Calcul en cours…</span>
          </div>
        )}
        {!loading && !pred && (
          <p style={{ fontSize:11, color:'#94a3b8', fontStyle:'italic', margin:0 }}>Non couvert par le modèle IA</p>
        )}
        {!loading && pred && <Gauge pct={pred.probabilite_pct} risque={pred.risque} />}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

  return (
    <div className="card hover:shadow-lg transition-shadow" style={{ display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:12 }}>
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Wrench size={18} className="text-primary"/>
        </div>
        <div style={{ minWidth:0, flex:1 }}>
          <p style={{ fontFamily:'monospace', fontSize:11, color:'var(--primary)', margin:0 }}>{e.code_ref}</p>
          <p style={{ fontWeight:600, fontSize:14, margin:0, lineHeight:1.3 }}>{e.nom}</p>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => onViewDetail(e)}
            className="shrink-0 rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
          >Détails</button>
          {peut && (
            <>
              <button type="button" onClick={() => onDelete(e)}
                className="shrink-0 rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                title="Supprimer"
              ><Trash2 size={14} /></button>
            </>
          )}
        </div>
      </div>

      <div style={{ fontSize:12, color:'var(--muted-foreground)', marginBottom:10, display:'flex', flexDirection:'column', gap:3 }}>
        {e.type_equipement && <span>Type : <b style={{color:'var(--foreground)'}}>{e.type_equipement}</b></span>}
        {e.localisation && <span style={{display:'flex',alignItems:'center',gap:3}}><MapPin size={11}/>{e.localisation}</span>}
      </div>

      <div className="flex items-center gap-2 flex-wrap" style={{ alignSelf:'flex-start', marginBottom:8 }}>
        <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${ETAT_COLOR[e.etat] || 'badge-gray'}`}>
          {e.etat?.replace(/_/g,' ')}
        </span>
        {peut && (
          <div className="flex gap-1">
            {ETAT_OPTIONS.filter(o => o !== e.etat).slice(0, 2).map(opt => (
              <button key={opt} type="button" onClick={() => onEtatChange(e.id, opt)}
                className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-muted text-muted-foreground"
              >{opt === 'EN_PANNE' ? 'Panne' : opt === 'OPERATIONNEL' ? 'Op.' : 'Maint.'}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginTop:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
          <BrainCircuit size={13} style={{ color:'var(--primary)' }}/>
          <span style={{ fontSize:11, fontWeight:600, color:'var(--muted-foreground)', textTransform:'uppercase', letterSpacing:'.06em' }}>
            Prédiction IA — Juillet
          </span>
        </div>
        {loading && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0' }}>
            <div style={{ width:14, height:14, border:'2px solid var(--primary)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
            <span style={{ fontSize:12, color:'var(--muted-foreground)' }}>Calcul en cours…</span>
          </div>
        )}
        {!loading && !pred && (
          <p style={{ fontSize:11, color:'#94a3b8', fontStyle:'italic', margin:0 }}>Non couvert par le modèle IA</p>
        )}
        {!loading && pred && <Gauge pct={pred.probabilite_pct} risque={pred.risque} />}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Modal({ onClose, onCreated }) {
  const [f, setF] = useState({ code_ref:'', nom:'', type_equipement:'', localisation:'', ligne_production:'' });
  const [l, setL] = useState(false);
  const sub = async e => {
    e.preventDefault();
    if (!f.code_ref || !f.nom) return toast.error('Code et nom requis');
    setL(true);
    try { await equipementsAPI.creer(f); toast.success('Équipement créé !'); onCreated(); }
    catch(err) { toast.error(err.response?.data?.message || err.response?.data?.error || 'Erreur'); }
    finally { setL(false); }
  };
  return (
    <div className="modal-overlay">
      <div className="modal max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Nouvel équipement</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X size={18} className="text-muted-foreground"/></button>
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

export default function EquipementsPage() {
  const { peutGerer } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [detailEq, setDetailEq] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    equipementsAPI.lister({ search: search || undefined })
      .then(r => setItems(r.data?.data || (Array.isArray(r.data) ? r.data : [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (e) => {
    if (!window.confirm(`Supprimer ${e.nom} (${e.code_ref}) ?`)) return;
    try {
      await equipementsAPI.supprimer(e.id);
      toast.success('Équipement supprimé');
      load();
    } catch { toast.error('Erreur suppression'); }
  };

  const handleEtatChange = async (id, etat) => {
    try {
      await equipementsAPI.updateEtat(id, { etat });
      toast.success('État mis à jour');
      load();
    } catch { toast.error('Erreur mise à jour état'); }
  };

  const groupes = items.reduce((acc, e) => {
    const ligne = e.ligne_production || 'Sans ligne';
    if (!acc[ligne]) acc[ligne] = [];
    acc[ligne].push(e);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {modal && <Modal onClose={()=>setModal(false)} onCreated={()=>{setModal(false);load();}}/>}
      {detailEq && <EquipementDetailModal equipement={detailEq} onClose={() => setDetailEq(null)} onUpdated={load} />}

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
              {groupe.map(e => <CarteEquipement key={e.id} e={e} onViewDetail={setDetailEq} onDelete={handleDelete} onEtatChange={handleEtatChange} />)}
            </div>
          </div>
        ))
      )}

      <MiniDashboardCorrectives />
    </div>
  );
}