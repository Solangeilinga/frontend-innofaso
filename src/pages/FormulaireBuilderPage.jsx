import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formulairesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, Edit2, GripVertical, Save, ChevronDown, Eye, EyeOff } from 'lucide-react';

const TYPES_CHAMPS = [
  { value:'TEXTE',     label:'Texte',            emoji:'Aa' },
  { value:'NOMBRE',    label:'Nombre',           emoji:'#' },
  { value:'DATE',      label:'Date (auto)',       emoji:'📅' },
  { value:'HEURE',     label:'Heure (auto)',      emoji:'🕐' },
  { value:'BOOLEEN',   label:'Oui / Non',         emoji:'☑️' },
  { value:'LISTE',     label:'Liste déroulante',  emoji:'▼' },
  { value:'SIGNATURE', label:'Signature',         emoji:'✍️' },
  { value:'CALCULE',   label:'Calculé',           emoji:'⚡' },
  { value:'PHOTO',     label:'Photo',             emoji:'📷' },
];

const SECTIONS_DEFAUT = ['Général','Identification','Mesures','Observations','Validation'];

function ChampForm({ champ = {}, onSave, onCancel }) {
  const [f, setF] = useState({
    nom_champ: champ.nom_champ || '',
    type_champ: champ.type_champ || 'TEXTE',
    section: champ.section || 'Général',
    obligatoire: champ.obligatoire || false,
    unite: champ.unite || '',
    placeholder: champ.placeholder || '',
    aide: champ.aide || '',
    options_liste: champ.options_liste
      ? (Array.isArray(champ.options_liste) ? champ.options_liste.map(o => typeof o === 'object' ? o.value : o).join('\n') : champ.options_liste)
      : '',
  });

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!f.nom_champ.trim()) return toast.error('Nom du champ requis');
    const payload = { ...f };
    if (f.type_champ === 'LISTE' && f.options_liste) {
      payload.options_liste = f.options_liste.split('\n').map(o => o.trim()).filter(Boolean);
    } else {
      payload.options_liste = null;
    }
    onSave(payload);
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-req text-sm">Nom du champ</label>
          <input value={f.nom_champ} onChange={e => set('nom_champ', e.target.value)}
            placeholder="ex: Température moteur" className="input"/>
        </div>
        <div>
          <label className="label text-sm">Type</label>
          <div className="relative">
            <select value={f.type_champ} onChange={e => set('type_champ', e.target.value)}
              className="input appearance-none pr-8 cursor-pointer">
              {TYPES_CHAMPS.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
          </div>
        </div>
        <div>
          <label className="label text-sm">Section</label>
          <div className="relative">
            <input list="sections-list" value={f.section} onChange={e => set('section', e.target.value)}
              placeholder="ex: Mesures" className="input"/>
            <datalist id="sections-list">
              {SECTIONS_DEFAUT.map(s => <option key={s} value={s}/>)}
            </datalist>
          </div>
        </div>
        <div>
          <label className="label text-sm">Unité</label>
          <input value={f.unite} onChange={e => set('unite', e.target.value)}
            placeholder="ex: °C, bar, rpm…" className="input"/>
        </div>
        <div>
          <label className="label text-sm">Placeholder</label>
          <input value={f.placeholder} onChange={e => set('placeholder', e.target.value)}
            placeholder="Texte d'aide dans le champ" className="input"/>
        </div>
        <div>
          <label className="label text-sm">Note d'aide</label>
          <input value={f.aide} onChange={e => set('aide', e.target.value)}
            placeholder="Explication affichée sous le champ" className="input"/>
        </div>
      </div>

      {f.type_champ === 'LISTE' && (
        <div>
          <label className="label text-sm">Options (une par ligne)</label>
          <textarea value={f.options_liste} onChange={e => set('options_liste', e.target.value)}
            rows={4} className="input resize-none font-mono text-sm"
            placeholder={"Bon état\nDégradé\nHors service"}/>
        </div>
      )}

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={f.obligatoire} onChange={e => set('obligatoire', e.target.checked)}
          className="w-4 h-4 accent-primary rounded"/>
        <span className="text-sm font-medium text-gray-700">Champ obligatoire</span>
      </label>

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="btn-ghost text-sm px-4 py-2 border border-gray-200 rounded-lg">Annuler</button>
        <button onClick={handleSave} className="btn-primary text-sm flex items-center gap-1 px-4 py-2">
          <Save size={14}/> Enregistrer
        </button>
      </div>
    </div>
  );
}

function ChampCard({ champ, idx, onEdit, onSoftDelete, onMove }) {
  const typeInfo = TYPES_CHAMPS.find(t => t.value === champ.type_champ) || {};
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-primary/30 hover:shadow-sm transition-all group">
      <div className="text-gray-300 cursor-grab group-hover:text-gray-400">
        <GripVertical size={18}/>
      </div>
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
        {typeInfo.emoji || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800 text-sm truncate">{champ.nom_champ}</span>
          {champ.obligatoire && <span className="text-red-500 text-xs">*</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{typeInfo.label || champ.type_champ}</span>
          {champ.section && <span className="text-xs text-gray-300">· {champ.section}</span>}
          {champ.unite && <span className="text-xs text-primary/70">({champ.unite})</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(champ)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors" title="Modifier">
          <Edit2 size={14}/>
        </button>
        <button onClick={() => onSoftDelete(champ.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors" title="Archiver">
          <Trash2 size={14}/>
        </button>
      </div>
    </div>
  );
}

export default function FormulaireBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formulaire, setFormulaire] = useState(null);
  const [champs, setChamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChamp, setEditingChamp] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editMeta, setEditMeta] = useState(false);
  const [metaForm, setMetaForm] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const { data: f } = await formulairesAPI.getUn(id);
      setFormulaire(f);
      setMetaForm({ titre: f.titre, description: f.description || '', frequence: f.frequence });
      // Aplatir les champs depuis les sections
      const allChamps = f.champs || [];
      setChamps(allChamps);
    } catch { toast.error('Erreur de chargement'); navigate('/formulaires'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleAddChamp = async (data) => {
    setSaving(true);
    try {
      await formulairesAPI.ajouterChamp(id, { ...data, ordre: champs.length });
      toast.success('Champ ajouté !');
      setShowAddForm(false);
      await load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleEditChamp = async (data) => {
    setSaving(true);
    try {
      await formulairesAPI.modifierChamp(id, editingChamp.id, data);
      toast.success('Champ modifié !');
      setEditingChamp(null);
      await load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleSoftDelete = async (champId) => {
    if (!confirm('Archiver ce champ ? Il ne sera plus visible dans les formulaires.')) return;
    try {
      await formulairesAPI.supprimerChamp(id, champId);
      toast.success('Champ archivé.');
      setChamps(prev => prev.filter(c => c.id !== champId));
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleSoftDeleteFormulaire = async () => {
    if (!confirm(`Archiver le formulaire "${formulaire.titre}" ? Il ne sera plus accessible.`)) return;
    try {
      await formulairesAPI.supprimer(id);
      toast.success('Formulaire archivé.');
      navigate('/formulaires');
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleSaveMeta = async () => {
    setSaving(true);
    try {
      await formulairesAPI.modifier(id, metaForm);
      toast.success('Formulaire modifié !');
      setEditMeta(false);
      await load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  // Grouper par section
  const sections = {};
  for (const c of champs) {
    const s = c.section || 'Général';
    if (!sections[s]) sections[s] = [];
    sections[s].push(c);
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/formulaires')} className="p-2 hover:bg-gray-100 rounded-xl mt-1">
          <ArrowLeft size={20} className="text-gray-600"/>
        </button>
        <div className="flex-1">
          {editMeta ? (
            <div className="space-y-2">
              <input value={metaForm.titre} onChange={e => setMetaForm(p=>({...p,titre:e.target.value}))}
                className="input font-display text-xl font-bold w-full"/>
              <div className="flex gap-2">
                <div className="relative">
                  <select value={metaForm.frequence} onChange={e => setMetaForm(p=>({...p,frequence:e.target.value}))}
                    className="input text-sm appearance-none pr-7 cursor-pointer">
                    {['JOURNALIER','HEBDO','MENSUEL','TRIMESTRIEL','SEMESTRIEL','ANNUEL','AU_BESOIN'].map(f =>
                      <option key={f} value={f}>{f}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                </div>
                <button onClick={handleSaveMeta} disabled={saving} className="btn-primary text-sm px-4 py-2">
                  {saving ? '…' : 'Sauvegarder'}
                </button>
                <button onClick={() => setEditMeta(false)} className="btn-ghost text-sm px-3 py-2 border border-gray-200 rounded-lg">Annuler</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs bg-primary/5 text-primary px-2 py-1 rounded-lg">{formulaire?.code}</span>
                <span className="badge-gray">{formulaire?.frequence}</span>
                <button onClick={() => setEditMeta(true)} className="p-1 hover:bg-gray-100 rounded-lg" title="Modifier">
                  <Edit2 size={13} className="text-gray-400"/>
                </button>
              </div>
              <h1 className="font-display text-2xl font-bold text-gray-900">{formulaire?.titre}</h1>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/formulaires/${id}/remplir`)}
            className="btn-ghost text-sm flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg">
            <Eye size={14}/> Aperçu
          </button>
          <button onClick={handleSoftDeleteFormulaire}
            className="p-2 hover:bg-red-50 rounded-lg text-red-400 transition-colors" title="Archiver le formulaire">
            <EyeOff size={16}/>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="card p-4 flex gap-6 text-sm">
        <div><span className="font-bold text-2xl text-primary">{champs.length}</span><span className="text-gray-400 ml-1">champs</span></div>
        <div><span className="font-bold text-2xl text-orange-500">{champs.filter(c=>c.obligatoire).length}</span><span className="text-gray-400 ml-1">obligatoires</span></div>
        <div><span className="font-bold text-2xl text-gray-600">{Object.keys(sections).length}</span><span className="text-gray-400 ml-1">sections</span></div>
      </div>

      {/* Champs par section */}
      {Object.entries(sections).map(([section, champsSection]) => (
        <div key={section}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">{section}</h3>
          <div className="space-y-2">
            {champsSection.map((champ, idx) => (
              <div key={champ.id}>
                {editingChamp?.id === champ.id ? (
                  <ChampForm champ={champ} onSave={handleEditChamp} onCancel={() => setEditingChamp(null)}/>
                ) : (
                  <ChampCard champ={champ} idx={idx}
                    onEdit={c => setEditingChamp(c)}
                    onSoftDelete={handleSoftDelete}
                    onMove={() => {}}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Ajouter un champ */}
      {showAddForm ? (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">Nouveau champ</h3>
          <ChampForm onSave={handleAddChamp} onCancel={() => setShowAddForm(false)}/>
        </div>
      ) : (
        <button onClick={() => setShowAddForm(true)}
          className="w-full border-2 border-dashed border-gray-200 hover:border-primary/50 rounded-xl py-4
          flex items-center justify-center gap-2 text-gray-400 hover:text-primary transition-colors">
          <Plus size={18}/> Ajouter un champ
        </button>
      )}
    </div>
  );
}
