import { useState, useEffect, useCallback, useRef } from 'react';
import { equipementsAPI, dashboardAPI, planningAPI, iaAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
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
    <div className="flex flex-col items-center gap-1.5">
      <svg width="96" height="56" viewBox="0 0 96 56" style={{ overflow:'visible' }}>
        <path d="M 10 50 A 38 38 0 0 1 86 50" fill="none" stroke={cfg.track} strokeWidth="8" strokeLinecap="round" />
        <path d="M 10 50 A 38 38 0 0 1 86 50" fill="none" stroke={cfg.color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={`${(pct/100)*120} 120`}
          className="transition-all duration-700 ease-out" />
        <text x="48" y="46" textAnchor="middle" fontSize="15" fontWeight="800" fill={cfg.color}>{pct}%</text>
      </svg>
      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background:cfg.bg, color:cfg.text }}>{risque}</span>
      <span className="text-[11px] text-muted-foreground text-center">{cfg.reco}</span>
    </div>
  );
}

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-xl">
      <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function EqKpi({ label, value, sub, icon }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground/80">{sub}</p>}
        </div>
        {icon && <i className={`fi fi-rr-${icon} text-lg text-muted-foreground`} />}
      </div>
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

// Normalise : retire accents, apostrophes, tirets, espaces doubles
function normalise(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trouver(preds, nom, equipementId) {
  if (!preds?.length) return null;
  // 1. Match par equipement_id (le plus fiable - ajouté par le backend)
  if (equipementId) {
    const byId = preds.find(p => p.equipement_id === equipementId);
    if (byId) return byId;
  }
  // 2. Match par nom_bdd (nom exact depuis la BDD)
  if (nom) {
    const byNomBdd = preds.find(p => p.equipement_nom_bdd === nom);
    if (byNomBdd) return byNomBdd;
  }
  if (!nom) return null;
  // 3. Fallback : matching normalisé
  const n = normalise(nom);
  const exact = preds.find(p => normalise(p.equipement) === n);
  if (exact) return exact;
  const partial1 = preds.find(p => n.includes(normalise(p.equipement)));
  if (partial1) return partial1;
  const partial2 = preds.find(p => normalise(p.equipement).includes(n));
  if (partial2) return partial2;
  const words = n.split(' ').filter(w => w.length > 3);
  return preds.find(p => {
    const pw = normalise(p.equipement).split(' ').filter(w => w.length > 3);
    return words.filter(w => pw.includes(w)).length >= Math.min(2, words.length);
  }) || null;
}

function ClassifyWidget() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useLlm, setUseLlm] = useState(false);

  const handleClassify = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const { data } = await iaAPI.classify(text.trim(), useLlm);
      setResult(data);
    } catch {
      setResult({ categorie: 'Erreur', confiance: 0 });
    } finally {
      setLoading(false);
    }
  };

  const confPct = result ? (result.confiance * 100).toFixed(0) : 0;
  const confColor = result?.confiance > 0.7 ? 'text-emerald-600' : result?.confiance > 0.4 ? 'text-orange-500' : 'text-red-500';

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <i className="fi fi-rr-tags text-base text-primary" />
        <h2 className="font-semibold text-foreground">Classifier une cause de panne</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Décrivez un symptôme ou une cause de panne. L'IA classifie automatiquement la catégorie (Mécanique, Électrique, Hydraulique…).
      </p>
      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Symptôme ou cause</label>
          <input className="input" placeholder="Ex: Fuite d'huile sur le vérin, Bruit anormal moteur, Capteur défectueux..."
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleClassify()} />
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={useLlm} onChange={e => setUseLlm(e.target.checked)} />
            LLM
          </label>
          <button className="btn-primary text-sm" onClick={handleClassify} disabled={loading || !text.trim()}>
            {loading ? '...' : 'Classifier'}
          </button>
        </div>
      </div>
      {result && (
        <div className="mt-3 flex items-center gap-3 text-sm">
          <span className="font-semibold text-foreground">{result.categorie}</span>
          <span className={`font-bold ${confColor}`}>{confPct}%</span>
          <span className="text-[10px] text-muted-foreground">mode: {result.mode}</span>
        </div>
      )}
    </section>
  );
}

function ChatBotFloating() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    const msgIdx = messages.length + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    let full = '';
    iaAPI.botChatStream(userMsg, history,
      (token) => {
        full += token;
        setMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, content: full } : m));
      },
      () => {
        setLoading(false);
      },
      (err) => {
        setMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, content: err } : m));
        setLoading(false);
      },
    );
  };

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl hover:opacity-90 transition-all"
        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))' }}>
        <i className="fi fi-rr-comment text-xl" />
      </button>

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card shadow-2xl flex flex-col"
          style={{ maxHeight: 'min(600px, 80vh)', animation: 'slideUp .25s ease-out' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <i className="fi fi-rr-brain-circuit text-primary text-sm" />
              <span className="font-semibold text-sm">Assistant Maintenance</span>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
              <i className="fi fi-rr-cross text-sm text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: 0 }}>
            {messages.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-6">
                Posez une question sur les équipements, pannes, ou prédictions.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-3 py-2 text-sm text-muted-foreground italic">
                  Réflexion...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2 p-3 border-t border-border">
            <input className="input flex-1 text-sm" placeholder="Votre question..."
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()} disabled={loading} />
            <button className="btn-primary px-3" onClick={send} disabled={loading || !input.trim()}>
              <i className="fi fi-rr-paper-plane text-sm" />
            </button>
          </div>
        </div>
      )}
    </>
  );
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

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <i className="fi fi-rr-chart-connected text-base text-red-500" />
            <h2 className="font-semibold text-foreground">Courbe des heures correctives par équipement</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Évolution des arrêts correctifs — filtre jour / mois / année</p>
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
          {type !== 'annee' ? (
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
          <div className="text-center">
            <i className="fi fi-rr-chart-connected text-3xl mb-2 opacity-20 block" />
            Aucune donnée corrective pour cette période.
          </div>
        </div>
      ) : (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gradCorrEq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="equipement" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip formatter={v => `${Number(v).toFixed(1)} h`} />} />
              <Legend />
              <Area type="monotone" dataKey="heures" name="Heures correctives" stroke="#dc2626" strokeWidth={2} fill="url(#gradCorrEq)" dot={{ r: 4, fill: '#dc2626' }} />
            </AreaChart>
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
  const pctPrev = totalAll > 0 ? (totalPrev / totalAll) * 100 : 0;
  const pctCorr = totalAll > 0 ? (totalCorr / totalAll) * 100 : 0;

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
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
        onClick={e => e.stopPropagation()} style={{ animation:'slideUp .35s cubic-bezier(0.16,1,0.3,1)' }}>
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <i className="fi fi-rr-wrench-simple text-xl text-primary" />
              <div>
                <h2 className="text-xl font-bold text-foreground">{equipement.nom}</h2>
                <p className="text-sm text-muted-foreground">{equipement.code_ref} · {equipement.ligne_production || equipement.localisation || ''}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-muted transition-colors">
              <i className="fi fi-rr-cross text-base" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex flex-wrap gap-3">
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
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <EqKpi label="Préventif" value={`${totalPrev.toFixed(1)}h`} sub={`${pctPrev.toFixed(0)}% du total`} icon="check-circle" />
                <EqKpi label="Correctif" value={`${totalCorr.toFixed(1)}h`} sub={`${pctCorr.toFixed(0)}% du total`} icon="triangle-warning" />
                <EqKpi label="Total" value={`${totalAll.toFixed(1)}h`} sub={`${data?.detail?.length || 0} période(s)`} icon="clock" />
              </div>

              {totalAll > 0 && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Répartition</p>
                  <div className="h-3 w-full flex overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width:`${pctPrev}%` }} />
                    <div className="h-full bg-red-500 transition-all" style={{ width:`${pctCorr}%` }} />
                  </div>
                  <div className="flex justify-between mt-1.5 text-[11px]">
                    <span className="text-emerald-600 font-medium">Préventif {pctPrev.toFixed(0)}%</span>
                    <span className="text-red-600 font-medium">Correctif {pctCorr.toFixed(0)}%</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <i className="fi fi-rr-analyse text-sm" /> Observations fréquentes
                  </h3>
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
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <i className="fi fi-rr-clock text-sm" /> Temps le plus élevé
                  </h3>
                  {data?.temps_max ? (
                    <div>
                      <p className="text-lg font-bold">{Number(data.temps_max.duree_max).toFixed(1)}h</p>
                      <p className="text-xs text-muted-foreground">Type: {data.temps_max.type}</p>
                    </div>
                  ) : <p className="text-sm text-muted-foreground">—</p>}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <i className="fi fi-rr-settings text-sm" /> Changer l'état
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {ETAT_OPTIONS.map(opt => (
                    <button key={opt} type="button"
                      className={`px-4 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        etat === opt
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'border-border hover:bg-muted'
                      }`}
                      onClick={() => handleEtatChange(opt)}
                    >{opt.replace(/_/g, ' ')}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CarteEquipement({ e, onViewDetail, onDelete, onEtatChange }) {
  const { preds, loading } = usePredictions();
  const pred = trouver(preds, e.nom, e.id);
  const peut = useAuth().peutGerer?.();
  const [showHistorique, setShowHistorique] = useState(false);
  const [historique, setHistorique]         = useState([]);
  const [loadingHist, setLoadingHist]       = useState(false);

  const openHistorique = async () => {
    setShowHistorique(true);
    if (historique.length > 0) return;
    setLoadingHist(true);
    try {
      const { data } = await equipementsAPI.historique(e.id);
      setHistorique(Array.isArray(data) ? data : []);
    } catch { toast.error('Erreur historique'); }
    finally { setLoadingHist(false); }
  };

  return (
    <>
    {showHistorique && (
      <div className="modal-overlay">
        <div className="modal max-w-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Historique — {e.nom}</h3>
            <button onClick={() => setShowHistorique(false)}><i className="fi fi-rr-cross text-muted-foreground text-lg" /></button>
          </div>
          <p className="text-xs text-muted-foreground font-mono">{e.code_ref}</p>
          {loadingHist ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : historique.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Aucun historique disponible</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {historique.map((h, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl text-sm">
                  <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded ${
                    h.etat === 'EN_PANNE' ? 'bg-red-500/20 text-red-400' :
                    h.etat === 'EN_MAINTENANCE' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>{h.etat?.replace(/_/g,' ') || 'Action'}</span>
                  <div className="flex-1 min-w-0">
                    {h.action && <p className="text-xs font-medium text-foreground">{h.action}</p>}
                    {h.message && <p className="text-xs text-muted-foreground">{h.message}</p>}
                    {(h.utilisateur_nom || h.user_nom) && (
                      <p className="text-xs text-muted-foreground">
                        {h.utilisateur_prenom || h.user_prenom} {h.utilisateur_nom || h.user_nom}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {h.date ? new Date(h.date).toLocaleDateString('fr-FR') :
                     h.timestamp ? new Date(h.timestamp).toLocaleDateString('fr-FR') : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start gap-3 mb-3">
        <i className="fi fi-rr-wrench-simple text-xl text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] text-primary font-medium">{e.code_ref}</p>
          <p className="font-semibold text-sm text-foreground leading-tight">{e.nom}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          <button type="button" onClick={() => onViewDetail(e)}
            className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-muted transition-colors"
          >Détails</button>
          {peut && (
            <button type="button" onClick={() => onDelete(e)}
              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition-colors"
              title="Supprimer"
            ><i className="fi fi-rr-trash text-sm" /></button>
          )}
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-1 mb-3">
        {e.type_equipement && <span>Type : <b className="text-foreground">{e.type_equipement}</b></span>}
        {e.localisation && <span className="flex items-center gap-1"><i className="fi fi-rr-marker text-xs" />{e.localisation}</span>}
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full ${ETAT_COLOR[e.etat] || 'badge-gray'}`}>
          {e.etat?.replace(/_/g,' ')}
        </span>
        {peut && (
          <div className="flex gap-1">
            {ETAT_OPTIONS.filter(o => o !== e.etat).slice(0, 2).map(opt => (
              <button key={opt} type="button" onClick={() => onEtatChange(e.id, opt)}
                className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-muted text-muted-foreground transition-colors"
              >{opt === 'EN_PANNE' ? 'Panne' : opt === 'OPERATIONNEL' ? 'Op.' : 'Maint.'}</button>
            ))}
          </div>
        )}
      </div>

      <button onClick={openHistorique}
        className="text-xs text-primary hover:underline mb-3 flex items-center gap-1 transition-colors"
        style={{ background:'none', border:'none', padding:0, cursor:'pointer' }}
      ><i className="fi fi-rr-clock text-xs" /> Voir l'historique</button>

      <div className="border-t border-border pt-3 mt-auto">
        <div className="flex items-center gap-1.5 mb-2">
          <i className="fi fi-rr-brain-circuit text-xs text-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Prédiction IA — Juillet
          </span>
        </div>
        {loading && (
          <div className="flex items-center gap-2 py-2">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-xs text-muted-foreground">Calcul en cours…</span>
          </div>
        )}
        {!loading && !pred && (
          <p className="text-[11px] text-muted-foreground/60 italic">Non couvert par le modèle IA</p>
        )}
        {!loading && pred && <Gauge pct={pred.probabilite_pct} risque={pred.risque} />}
      </div>
    </div>
    </>
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
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><i className="fi fi-rr-cross text-muted-foreground text-lg" /></button>
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

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <i className="fi fi-rr-wrench-simple text-2xl text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">Équipements</h1>
            <p className="mt-1 text-sm text-muted-foreground">Gestion et suivi des équipements de production</p>
          </div>
        </div>
      </div>

      <div className="card flex gap-3 p-4">
        <div className="relative flex-1">
          <i className="fi fi-rr-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" />
          <input placeholder="Rechercher un équipement…" value={search}
            onChange={e=>setSearch(e.target.value)} className="input pl-9"/>
        </div>
        {peutGerer?.() && (
          <button onClick={()=>setModal(true)} className="btn-primary flex items-center gap-2 shrink-0">
            <i className="fi fi-rr-plus text-sm" /> Ajouter
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-16 text-muted-foreground">
          <i className="fi fi-rr-wrench-simple text-4xl mb-3 opacity-30 block" />
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

      <ClassifyWidget />

      <MiniDashboardCorrectives />

      <ChatBotFloating />
    </div>
  );
}