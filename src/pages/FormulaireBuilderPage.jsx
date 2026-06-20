import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formulairesAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, Edit2, GripVertical, Save, ChevronDown, Eye, EyeOff, Layers, FolderOpen, FileText, Users } from 'lucide-react';


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

function ChampForm({ champ = {}, onSave, onCancel, sectionsList }) {
  const [f, setF] = useState({
    nom_champ: champ.nom_champ || '',
    type_champ: champ.type_champ || 'TEXTE',
    section: champ.section || '',
    section_id: champ.section_id || '',
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
            <select value={f.section_id} onChange={e => {
              const sec = sectionsList.find(s => s.id === e.target.value);
              set('section_id', e.target.value);
              set('section', sec ? sec.titre : '');
            }} className="input appearance-none pr-8 cursor-pointer">
              <option value="">-- Sans section --</option>
              {sectionsList.map(s => <option key={s.id} value={s.id}>{s.titre}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
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

function ChampCard({ champ, idx, onEdit, onSoftDelete }) {
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

function SectionHeader({ section, onEdit, onDelete, onAddField }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(section.titre);

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Nom requis');
    await onEdit(section.id, { titre: name.trim() });
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 mb-2 px-1 group">
      <FolderOpen size={16} className="text-primary/60"/>
      {editing ? (
        <div className="flex items-center gap-1 flex-1">
          <input value={name} onChange={e => setName(e.target.value)}
            className="input text-sm font-semibold py-1 px-2 flex-1"
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus/>
          <button onClick={handleSave} className="btn-primary text-xs px-2 py-1 rounded-lg">OK</button>
          <button onClick={() => setEditing(false)} className="btn-ghost text-xs px-2 py-1 rounded-lg border border-gray-200">Annuler</button>
        </div>
      ) : (
        <>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex-1">{section.titre}</h3>
          <span className="text-xs text-gray-400">{section.nb_champs || 0} champ(s)</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => { setName(section.titre); setEditing(true); }}
              className="p-1 hover:bg-blue-50 rounded text-blue-500 transition-colors" title="Renommer">
              <Edit2 size={13}/>
            </button>
            <button onClick={() => onAddField(section)}
              className="p-1 hover:bg-green-50 rounded text-green-500 transition-colors" title="Ajouter un champ">
              <Plus size={13}/>
            </button>
            <button onClick={() => onDelete(section.id)}
              className="p-1 hover:bg-red-50 rounded text-red-400 transition-colors" title="Supprimer la section">
              <Trash2 size={13}/>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function FormulaireBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [formulaire, setFormulaire] = useState(null);
  const [sections, setSections] = useState([]);
  const [champs, setChamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFieldSection, setAddFieldSection] = useState(null);
  const [editingChamp, setEditingChamp] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editMeta, setEditMeta] = useState(false);
  const [metaForm, setMetaForm] = useState({});
  const [editingSection, setEditingSection] = useState(null);
  const [activeTab, setActiveTab] = useState('champs'); // 'champs' | 'entete'
  const [entete, setEntete] = useState({
    emetteur_nom: '', emetteur_fonction: '', emetteur_date: '',
    verificateur_nom: '', verificateur_fonction: '', verificateur_date: '',
    approbateur_nom: '', approbateur_fonction: '', approbateur_date: '',
    destinataires: '', date_creation: '',
  });
  const [savingEntete, setSavingEntete] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: f } = await formulairesAPI.getUn(id);
      setFormulaire(f);
      setMetaForm({ titre: f.titre, description: f.description || '', frequence: f.frequence });
      const allChamps = f.champs || [];
      setChamps(allChamps);
      const { data: secs } = await formulairesAPI.getSections(id);
      setSections(secs || []);
      // Charger l'entête du formulaire
      try {
        const { data: ent } = await formulairesAPI.getEntete(id);
        if (ent) setEntete({
          emetteur_nom:          ent.emetteur_nom || '',
          emetteur_fonction:     ent.emetteur_fonction || '',
          emetteur_date:         ent.emetteur_date?.slice(0,10) || '',
          verificateur_nom:      ent.verificateur_nom || '',
          verificateur_fonction: ent.verificateur_fonction || '',
          verificateur_date:     ent.verificateur_date?.slice(0,10) || '',
          approbateur_nom:       ent.approbateur_nom || '',
          approbateur_fonction:  ent.approbateur_fonction || '',
          approbateur_date:      ent.approbateur_date?.slice(0,10) || '',
          destinataires:         ent.destinataires || '',
          date_creation:         ent.date_creation?.slice(0,10) || '',
        });
      } catch (_) {}
    } catch { toast.error('Erreur de chargement'); navigate('/formulaires'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  // Group champs by section
  const champsBySection = {};
  for (const c of champs) {
    const key = c.section_id || 'non_classes';
    if (!champsBySection[key]) champsBySection[key] = [];
    champsBySection[key].push(c);
  }

  const handleAddChamp = async (data) => {
    setSaving(true);
    try {
      await formulairesAPI.ajouterChamp(id, { ...data, ordre: champs.length });
      toast.success('Champ ajouté !');
      setShowAddForm(false);
      setAddFieldSection(null);
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

  const handleSoftDeleteChamp = async (champId) => {
    if (!confirm('Archiver ce champ ?')) return;
    try {
      await formulairesAPI.supprimerChamp(id, champId);
      toast.success('Champ archivé.');
      await load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  // ── Sections ──────────────────────────────────────────────────

  const handleAddSection = async () => {
    const name = prompt('Nom de la nouvelle section :');
    if (!name || !name.trim()) return;
    setSaving(true);
    try {
      await formulairesAPI.ajouterSection(id, { titre: name.trim() });
      toast.success('Section ajoutée !');
      await load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleEditSection = async (sectionId, data) => {
    setSaving(true);
    try {
      await formulairesAPI.modifierSection(id, sectionId, data);
      toast.success('Section modifiée !');
      await load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDeleteSection = async (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    const nbChamps = section ? parseInt(section.nb_champs) : 0;
    const msg = nbChamps > 0
      ? `Supprimer la section "${section.titre}" ? ${nbChamps} champ(s) seront déplacés hors section.`
      : `Supprimer la section "${section.titre}" ?`;
    if (!confirm(msg)) return;
    setSaving(true);
    try {
      await formulairesAPI.supprimerSection(id, sectionId);
      toast.success('Section archivée.');
      await load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleSoftDeleteFormulaire = async () => {
    if (!confirm(`Archiver le formulaire "${formulaire.titre}" ? Il ne sera plus accessible.`)) return;
    try {
      await formulairesAPI.supprimer(id);
      toast.success('Formulaire archivé.');
      navigate('/formulaires');
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleSaveEntete = async () => {
    setSavingEntete(true);
    try {
      await formulairesAPI.saveEntete(id, entete);
      toast.success('Entête sauvegardée !');
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSavingEntete(false); }
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

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
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
        <div><span className="font-bold text-2xl text-gray-600">{sections.length}</span><span className="text-gray-400 ml-1">sections</span></div>
      </div>

      {/* Onglets */}
      <div className="flex border-b border-border gap-1">
        {[
          { key: 'champs', label: 'Champs', icon: <FileText size={15}/> },
          ...(isAdmin() ? [{ key: 'entete', label: 'Entête officielle', icon: <Users size={15}/> }] : []),
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Contenu onglet Entête */}
      {activeTab === 'entete' && isAdmin() && (
        <div className="card space-y-5">
          <div>
            <h3 className="font-semibold mb-1">Entête officielle du formulaire</h3>
            <p className="text-sm text-muted-foreground">
              Ces informations seront affichées automatiquement quand ce formulaire est rempli.
            </p>
          </div>

          {/* Date création + Modification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs">Date de création</label>
              <input type="date" value={entete.date_creation}
                onChange={e => setEntete(p => ({ ...p, date_creation: e.target.value }))}
                className="input text-sm"/>
            </div>
          </div>

          {/* 3 blocs : Émetteur / Vérificateur / Approbateur */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              ['emetteur', 'Émetteur'],
              ['verificateur', 'Vérificateur'],
              ['approbateur', 'Approbateur'],
            ].map(([key, label]) => (
              <div key={key} className="space-y-3 p-4 bg-muted/30 rounded-xl">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                <div>
                  <label className="label text-xs">Nom</label>
                  <input
                    value={entete[`${key}_nom`]}
                    onChange={e => setEntete(p => ({ ...p, [`${key}_nom`]: e.target.value }))}
                    placeholder={`ex: T. COMPAORE`}
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="label text-xs">Fonction</label>
                  <input
                    value={entete[`${key}_fonction`]}
                    onChange={e => setEntete(p => ({ ...p, [`${key}_fonction`]: e.target.value }))}
                    placeholder="ex: RT, RQRD, DG…"
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="label text-xs">Date</label>
                  <input type="date"
                    value={entete[`${key}_date`]}
                    onChange={e => setEntete(p => ({ ...p, [`${key}_date`]: e.target.value }))}
                    className="input text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Destinataires */}
          <div>
            <label className="label text-xs">Destinataires</label>
            <input
              value={entete.destinataires}
              onChange={e => setEntete(p => ({ ...p, destinataires: e.target.value }))}
              placeholder="ex: DG, RQRD, CCQ, CAQM, AAQM, CQCP, RT, CM, AM"
              className="input text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">Séparer par des virgules</p>
          </div>

          <button
            onClick={handleSaveEntete}
            disabled={savingEntete}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={15}/> {savingEntete ? 'Sauvegarde…' : 'Sauvegarder l\'entête'}
          </button>
        </div>
      )}

      {/* Contenu onglet Champs */}
      {activeTab === 'champs' && (<>
      <div className="space-y-6">
        {/* Champs sans section */}
        {champsBySection['non_classes'] && champsBySection['non_classes'].length > 0 && (
          <div className="opacity-60">
            <SectionHeader
              section={{ id: null, titre: 'Non classés', nb_champs: champsBySection['non_classes'].length }}
              onEdit={() => {}}
              onDelete={() => {}}
              onAddField={(sec) => { setAddFieldSection(null); setShowAddForm(true); }}
            />
            <div className="space-y-2">
              {champsBySection['non_classes'].map((champ, idx) => (
                <div key={champ.id}>
                  {editingChamp?.id === champ.id ? (
                    <ChampForm champ={champ} onSave={handleEditChamp} onCancel={() => setEditingChamp(null)} sectionsList={sections}/>
                  ) : (
                    <ChampCard champ={champ} idx={idx}
                      onEdit={c => setEditingChamp(c)}
                      onSoftDelete={handleSoftDeleteChamp}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sections issues de l'API */}
        {sections.map(section => (
          <div key={section.id}>
            <SectionHeader
              section={section}
              onEdit={handleEditSection}
              onDelete={handleDeleteSection}
              onAddField={(sec) => {
                setAddFieldSection(sec);
                setShowAddForm(true);
              }}
            />
            <div className="space-y-2">
              {(champsBySection[section.id] || []).map((champ, idx) => (
                <div key={champ.id}>
                  {editingChamp?.id === champ.id ? (
                    <ChampForm champ={champ} onSave={handleEditChamp} onCancel={() => setEditingChamp(null)} sectionsList={sections}/>
                  ) : (
                    <ChampCard champ={champ} idx={idx}
                      onEdit={c => setEditingChamp(c)}
                      onSoftDelete={handleSoftDeleteChamp}
                    />
                  )}
                </div>
              ))}
              {(!champsBySection[section.id] || champsBySection[section.id].length === 0) && (
                <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl">
                  <p className="text-sm text-gray-400 mb-2">Aucun champ dans cette section</p>
                  <button onClick={() => { setAddFieldSection(section); setShowAddForm(true); }}
                    className="text-xs text-primary hover:underline">+ Ajouter un champ</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Ajouter un champ */}
      {showAddForm && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
            Nouveau champ {addFieldSection ? `dans "${addFieldSection.titre}"` : ''}
          </h3>
          <ChampForm
            champ={addFieldSection ? { section_id: addFieldSection.id, section: addFieldSection.titre } : {}}
            onSave={handleAddChamp}
            onCancel={() => { setShowAddForm(false); setAddFieldSection(null); }}
            sectionsList={sections}
          />
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex gap-3">
        {!showAddForm && (
          <button onClick={() => { setAddFieldSection(null); setShowAddForm(true); }}
            className="flex-1 border-2 border-dashed border-gray-200 hover:border-primary/50 rounded-xl py-4
            flex items-center justify-center gap-2 text-gray-400 hover:text-primary transition-colors">
            <Plus size={18}/> Ajouter un champ
          </button>
        )}
        <button onClick={handleAddSection}
          className="border-2 border-dashed border-gray-200 hover:border-green-400/50 rounded-xl py-4 px-6
          flex items-center justify-center gap-2 text-gray-400 hover:text-green-500 transition-colors">
          <Layers size={18}/> Ajouter une section
        </button>
      </div>
      </>)}
    </div>
  );
}