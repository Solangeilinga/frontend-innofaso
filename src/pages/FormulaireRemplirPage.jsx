import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formulairesAPI, soumissionsAPI, equipementsAPI, signatairesAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import { ArrowLeft, Send, Clock, Calendar, ChevronDown, UserCheck, FileText, Users } from 'lucide-react';

const heureLocale = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};
const dateLocale = () => new Date().toISOString().split('T')[0];

// Noms de champs qui déclenchent la liste déroulante utilisateurs
const CHAMP_SIGNATAIRE_PATTERNS = [
  /visa/i,
  /signat/i,
  /nom.*(fonction|signat)/i,
  /responsable/i,
  /approbat/i,
  /vérificat/i,
];

const isSignataireField = (champ) => {
  if (champ.type_champ === 'SIGNATURE') return true;
  return CHAMP_SIGNATAIRE_PATTERNS.some(p => p.test(champ.nom_champ));
};

function ChampInput({ champ, value, onChange, signataires = [] }) {
  const { nom_champ, type_champ, obligatoire, unite, options_liste, placeholder, aide } = champ;

  const opts = Array.isArray(options_liste)
    ? options_liste
    : (options_liste ? (typeof options_liste === 'string' ? JSON.parse(options_liste) : options_liste) : []);
  const optsNorm = opts.map(o => typeof o === 'object' ? o : { value: o, label: o });

  const labelEl = (
    <label className={obligatoire ? 'label-req' : 'label'}>
      {nom_champ}
      {unite && <span className="text-gray-400 font-normal ml-1 text-xs">({unite})</span>}
    </label>
  );

  // ── SIGNATURE / VISA → liste déroulante utilisateurs ─────────────
  if (isSignataireField(champ)) {
    return (
      <div>
        {labelEl}
        <div className="relative">
          <select
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="input appearance-none pr-10 cursor-pointer"
          >
            <option value="">— Sélectionner un signataire —</option>
            {['ADMIN','RESP_MAINT','RESP_PROD','TECHNICIEN','OPERATEUR'].map(role => {
              const groupe = signataires.filter(s => s.role === role);
              if (groupe.length === 0) return null;
              const labels = {
                ADMIN:'Administrateurs', RESP_MAINT:'Responsables Maintenance',
                RESP_PROD:'Responsables Production', TECHNICIEN:'Techniciens',
                OPERATEUR:'Opérateurs',
              };
              return (
                <optgroup key={role} label={labels[role] || role}>
                  {groupe.map(s => (
                    <option key={s.id} value={s.value}>{s.label}</option>
                  ))}
                </optgroup>
              );
            })}
            <option value="__libre__">✏️ Saisir manuellement…</option>
          </select>
          <UserCheck size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none"/>
        </div>
        {value === '__libre__' && (
          <input
            type="text"
            className="input mt-2"
            placeholder="Nom et fonction"
            onChange={e => onChange(e.target.value)}
            autoFocus
          />
        )}
        {aide && <p className="text-xs text-gray-400 mt-1">{aide}</p>}
      </div>
    );
  }

  // ── DATE ─────────────────────────────────────────────────────────
  if (type_champ === 'DATE') {
    return (
      <div>
        {labelEl}
        <div className="relative">
          <input
            type="date"
            value={value || dateLocale()}
            onChange={e => onChange(e.target.value)}
            className="input pr-10"
          />
        </div>
        {aide && <p className="text-xs text-gray-400 mt-1">{aide}</p>}
      </div>
    );
  }

  // ── HEURE ────────────────────────────────────────────────────────
  if (type_champ === 'HEURE') {
    return (
      <div>
        {labelEl}
        <div className="relative">
          <input
            type="time"
            value={value || heureLocale()}
            onChange={e => onChange(e.target.value)}
            className="input pr-10"
          />
        </div>
        {aide && <p className="text-xs text-gray-400 mt-1">{aide}</p>}
      </div>
    );
  }

  // ── TEXTE ────────────────────────────────────────────────────────
  if (type_champ === 'TEXTE')
    return (
      <div>
        {labelEl}
        <input type="text" value={value || ''} placeholder={placeholder || ''}
          onChange={e => onChange(e.target.value)} className="input"/>
        {aide && <p className="text-xs text-gray-400 mt-1">{aide}</p>}
      </div>
    );

  // ── NOMBRE ───────────────────────────────────────────────────────
  if (type_champ === 'NOMBRE')
    return (
      <div>
        {labelEl}
        <input type="number" step="any" value={value || ''}
          placeholder={placeholder || ''}
          onChange={e => onChange(e.target.value)} className="input"/>
        {aide && <p className="text-xs text-gray-400 mt-1">{aide}</p>}
      </div>
    );

  // ── BOOLEEN ──────────────────────────────────────────────────────
  if (type_champ === 'BOOLEEN')
    return (
      <div>
        {labelEl}
        <div className="flex gap-3">
          {['Oui', 'Non'].map(v => (
            <label key={v} className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer
              transition-all flex-1 justify-center font-medium text-sm
              ${value === v ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
              <input type="radio" className="hidden" value={v}
                checked={value === v} onChange={() => onChange(v)}/>
              {v}
            </label>
          ))}
        </div>
      </div>
    );

  // ── LISTE ────────────────────────────────────────────────────────
  if (type_champ === 'LISTE')
    return (
      <div>
        {labelEl}
        <div className="relative">
          <select value={value || ''} onChange={e => onChange(e.target.value)}
            className="input appearance-none pr-10 cursor-pointer">
            <option value="">— Sélectionner —</option>
            {optsNorm.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
        </div>
        {aide && <p className="text-xs text-gray-400 mt-1">{aide}</p>}
      </div>
    );

  // ── PHOTO ────────────────────────────────────────────────────────
  if (type_champ === 'PHOTO')
    return (
      <div>
        {labelEl}
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
          📷 Fonctionnalité photo disponible sur mobile
        </div>
      </div>
    );

  // fallback
  return (
    <div>
      {labelEl}
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className="input"/>
    </div>
  );
}

export default function FormulaireRemplirPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formulaire, setFormulaire] = useState(null);
  const [equipements, setEquipements] = useState([]);
  const [signataires, setSignataires] = useState([]);
  const [values, setValues] = useState({});
  const [entete, setEntete] = useState({
    equipement_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      formulairesAPI.getUn(id),
      equipementsAPI.lister(),
      signatairesAPI.liste(),
    ])
      .then(([f, e, s]) => {
        setFormulaire(f.data);
        setEquipements(e.data?.data || e.data || []);
        setSignataires(s.data || []);
        
        // ✅ CORRECTION : Pré-remplir les champs DATE et HEURE avec la date/heure actuelle
        const autoVals = {};
        const champs = f.data?.champs || [];
        for (const c of champs) {
          if (c.type_champ === 'DATE')  autoVals[c.id] = dateLocale();
          if (c.type_champ === 'HEURE') autoVals[c.id] = heureLocale();
        }
        setValues(autoVals);
      })
      .catch(() => { toast.error('Erreur de chargement'); navigate('/formulaires'); })
      .finally(() => setLoading(false));
  }, [id]);

  const setVal = (champId, val) => setValues(p => ({ ...p, [champId]: val }));

  const buildValeurs = () =>
    (formulaire?.champs || []).map(c => {
      const raw = values[c.id];
      const entry = { champ_def_id: c.id };
      if (c.type_champ === 'NOMBRE')       entry.valeur_nombre  = raw != null && raw !== '' ? +raw : null;
      else if (c.type_champ === 'DATE')    entry.valeur_date    = raw || dateLocale();
      else if (c.type_champ === 'HEURE')   entry.valeur_texte   = raw || heureLocale();
      else if (c.type_champ === 'BOOLEEN') entry.valeur_booleen = raw === 'Oui' ? true : raw === 'Non' ? false : null;
      else                                 entry.valeur_texte   = raw || null;
      return entry;
    });

  const submit = async (e, statut = 'SOUMIS') => {
    e.preventDefault();
    for (const c of formulaire?.champs || []) {
      if (c.obligatoire && !values[c.id])
        return toast.error(`Champ obligatoire : "${c.nom_champ}"`);
    }
    setSubmitting(true);
    try {
      const payload = {
        formulaire_type_id: id,
        equipement_id: entete.equipement_id || null,
        statut,
        valeurs: buildValeurs(),
      };
      
      await soumissionsAPI.creer(payload);
      toast.success(statut === 'SOUMIS' ? 'Formulaire soumis !' : 'Brouillon enregistré.');
      navigate('/soumissions');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la soumission');
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const champs = formulaire?.champs || [];
  const champsBySection = {};
  for (const c of champs) {
    const s = c.section || 'Général';
    if (!champsBySection[s]) champsBySection[s] = [];
    champsBySection[s].push(c);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors mt-0.5">
          <ArrowLeft size={20} className="text-gray-600"/>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs bg-primary/5 text-primary px-2 py-1 rounded-lg">{formulaire.code}</span>
            <span className={formulaire.module === 'MAINTENANCE' ? 'badge-blue' : 'badge-green'}>{formulaire.module}</span>
            <span className="badge-gray">{formulaire.frequence}</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900">{formulaire.titre}</h1>
        </div>
      </div>

      {/* EN-TÊTE STATIQUE - PUREMENT INFORMATIF (comme sur l'image papier) */}
      <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-gray-800">InnoFaso</h1>
          <h2 className="text-md font-semibold text-gray-700 mt-1">{formulaire.code} - {formulaire.titre}</h2>
        </div>

        <div className="space-y-2 text-sm">
          <p><strong className="text-gray-700">Émetteur :</strong> T. COMPAORE</p>
          <p><strong className="text-gray-700">Date :</strong> 11/09/2023</p>
          <p><strong className="text-gray-700">Fonction :</strong> RT</p>
          
          <div className="border-t border-gray-100 my-2"></div>
          
          <p><strong className="text-gray-700">Vérificateur :</strong> C. DABIRE</p>
          <p><strong className="text-gray-700">Date :</strong> 11/09/2023</p>
          <p><strong className="text-gray-700">Fonction :</strong> RQRD</p>
          
          <div className="border-t border-gray-100 my-2"></div>
          
          <p><strong className="text-gray-700">Approbateur :</strong> O. COULIBALY</p>
          <p><strong className="text-gray-700">Date :</strong> —</p>
          <p><strong className="text-gray-700">Fonction :</strong> DG</p>
          
          <div className="border-t border-gray-100 my-2"></div>
          
          <p><strong className="text-gray-700">Destinataires :</strong> DG, RQRD, CCQ, CAQM, AAQM, CQCP, RT, CM, AM</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Équipement concerné */}
        {equipements.length > 0 && (
          <div className="card">
            <h3 className="section-title">Équipement concerné</h3>
            <div className="relative">
              <select
                value={entete.equipement_id}
                onChange={e => setEntete(p => ({ ...p, equipement_id: e.target.value }))}
                className="input appearance-none pr-10 cursor-pointer"
              >
                <option value="">— Aucun équipement spécifique —</option>
                {equipements.map(eq => (
                  <option key={eq.id} value={eq.id}>[{eq.code_ref}] {eq.nom}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
            </div>
          </div>
        )}

        {/* Champs par section */}
        {Object.keys(champsBySection).length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            <p>Aucun champ défini pour ce formulaire.</p>
          </div>
        ) : Object.entries(champsBySection).map(([section, chps]) => (
          <div key={section} className="card space-y-5">
            <h3 className="section-title">{section}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {chps.map(champ => (
                <ChampInput
                  key={champ.id}
                  champ={champ}
                  value={values[champ.id]}
                  onChange={val => setVal(champ.id, val)}
                  signataires={signataires}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="btn-secondary flex items-center gap-2">
            <ArrowLeft size={16}/> Annuler
          </button>
          <div className="flex gap-3">
            <button type="button" disabled={submitting}
              onClick={e => submit(e, 'BROUILLON')}
              className="btn-ghost border border-gray-200 flex items-center gap-2 px-5">
              Enregistrer brouillon
            </button>
            <button type="submit" disabled={submitting}
              className="btn-primary flex items-center gap-2 px-8">
              {submitting
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/><span>Envoi…</span></>
                : <><Send size={16}/><span>Soumettre</span></>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}