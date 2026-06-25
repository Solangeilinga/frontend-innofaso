import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { soumissionsAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, XCircle, Pencil, Save, X, AlertTriangle, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const typeLabel = {
  TEXTE:'Texte', NOMBRE:'Nombre', DATE:'Date', HEURE:'Heure',
  BOOLEEN:'Oui/Non', LISTE:'Liste', SIGNATURE:'Signature', PHOTO:'Photo', CALCULE:'Calculé'
};

const STATUT_STYLE = {
  SOUMIS:   'badge-blue',
  VALIDE:   'badge-green',
  REJETE:   'badge-red',
  BROUILLON:'badge-gray',
};

function renderVal(v) {
  if (v.valeur_booleen !== null && v.valeur_booleen !== undefined)
    return <span className={v.valeur_booleen ? 'badge-green' : 'badge-red'}>{v.valeur_booleen ? 'Oui' : 'Non'}</span>;
  if (v.valeur_nombre !== null && v.valeur_nombre !== undefined)
    return <span className="font-mono font-semibold">{v.valeur_nombre} {v.unite||''}</span>;
  if (v.valeur_date)
    return <span>{format(new Date(v.valeur_date),'dd MMM yyyy',{locale:fr})}</span>;
  if (v.valeur_texte) return <span>{v.valeur_texte}</span>;
  return <span className="text-muted-foreground">—</span>;
}

function ModalRejet({ onConfirm, onCancel, loading }) {
  const [raison, setRaison] = useState('');
  return (
    <div className="modal-overlay">
      <div className="modal max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <XCircle size={20} className="text-red-600"/>
          </div>
          <div>
            <h3 className="font-bold text-base">Rejeter la soumission</h3>
            <p className="text-sm text-muted-foreground">La raison sera visible par l'auteur</p>
          </div>
        </div>
        <textarea
          value={raison}
          onChange={e => setRaison(e.target.value)}
          placeholder="Expliquez la raison du rejet (optionnel mais recommandé)…"
          rows={4}
          className="input w-full resize-none mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Annuler</button>
          <button
            onClick={() => onConfirm(raison)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <XCircle size={16}/> {loading ? 'Rejet…' : 'Confirmer le rejet'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EnteteEditor({ entete, onSave, onCancel }) {
  const [f, setF] = useState(entete || {});
  const [saving, setSaving] = useState(false);
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));

  const fields = [
    ['emetteur',     'Émetteur'],
    ['verificateur', 'Vérificateur'],
    ['approbateur',  'Approbateur'],
  ];

  const save = async () => {
    setSaving(true);
    await onSave(f);
    setSaving(false);
  };

  return (
    <div className="card border-2 border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-base">Modifier l'entête</h3>
        <button onClick={onCancel} className="p-1 rounded hover:bg-muted"><X size={16}/></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {fields.map(([key, label]) => (
          <div key={key} className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
            <input value={f[`${key}_nom`]||''} onChange={e=>s(`${key}_nom`,e.target.value)}
              placeholder="Nom" className="input text-sm"/>
            <input value={f[`${key}_fonction`]||''} onChange={e=>s(`${key}_fonction`,e.target.value)}
              placeholder="Fonction" className="input text-sm"/>
            <input type="date" value={f[`${key}_date`]?.slice(0,10)||''}
              onChange={e=>s(`${key}_date`,e.target.value)} className="input text-sm"/>
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-4">
        <button onClick={onCancel} className="btn-secondary">Annuler</button>
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save size={15}/> {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

export default function SoumissionDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user, isAdmin } = useAuth();
  const [s, setS]    = useState(null);
  const [loading, setLoading]     = useState(true);
  const [validating, setValidating] = useState(false);
  const [showRejet, setShowRejet]   = useState(false);
  const [editEntete, setEditEntete] = useState(false);
  const [exporting, setExporting]   = useState('');

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const res = type === 'pdf'
        ? await soumissionsAPI.exporterPDF(id)
        : await soumissionsAPI.exporterExcel(id);
      const ext  = type === 'pdf' ? 'pdf' : 'xlsx';
      const code = s?.formulaire_code?.replace(/[^a-zA-Z0-9-]/g, '_') || 'soumission';
      const date = s?.date_soumission?.toString().slice(0,10) || new Date().toISOString().slice(0,10);
      const url  = URL.createObjectURL(new Blob([res.data]));
      const a    = document.createElement('a');
      a.href = url; a.download = `${code}_${date}.${ext}`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Téléchargement démarré !');
    } catch { toast.error("Erreur lors de l'export"); }
    finally { setExporting(''); }
  };

  const load = () => {
    setLoading(true);
    soumissionsAPI.getUne(id)
      .then(r => setS(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);

  const canValider = s && (
    isAdmin() ||
    (s.module === 'MAINTENANCE' && user?.role === 'RESP_MAINT') ||
    (s.module === 'PRODUCTION'  && user?.role === 'RESP_PROD')
  );

  const handleValider = async () => {
    const champsSignature = s.valeurs?.filter(v => v.type_champ === 'SIGNATURE') || [];
    const signaturesManquantes = champsSignature.filter(v => !v.valeur_texte && !v.valeur_json);
    if (signaturesManquantes.length > 0) {
      toast.error(
        `${signaturesManquantes.length} signature(s) manquante(s) : ${signaturesManquantes.map(v => v.nom_champ).join(', ')}`,
        { duration: 5000 }
      );
      return;
    }
    setValidating(true);
    try {
      await soumissionsAPI.valider(id, { statut: 'VALIDE' });
      toast.success('Soumission validée !');
      load();
    } catch (err) { toast.error(err.response?.data?.message || err.response?.data?.error || 'Erreur'); }
    finally { setValidating(false); }
  };

  const handleRejeter = async (commentaire) => {
    setValidating(true);
    try {
      await soumissionsAPI.valider(id, { statut: 'REJETE', commentaire });
      toast.success('Soumission rejetée');
      setShowRejet(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || err.response?.data?.error || 'Erreur'); }
    finally { setValidating(false); }
  };

  const handleSaveEntete = async (enteteData) => {
    try {
      await soumissionsAPI.updateEntete(id, enteteData);
      toast.success('Entête mise à jour !');
      setEditEntete(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || err.response?.data?.error || 'Erreur'); }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
    </div>
  );
  if (!s) return <div className="text-center py-16 text-muted-foreground">Soumission non trouvée</div>;

  const sections = s.valeurs?.reduce((acc, v) => {
    const sec = v.section || 'Général';
    if (!acc[sec]) acc[sec] = [];
    acc[sec].push(v);
    return acc;
  }, {}) || {};

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {showRejet && (
        <ModalRejet
          onConfirm={handleRejeter}
          onCancel={() => setShowRejet(false)}
          loading={validating}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-muted-foreground"/>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-bold text-lg">{s.form_code}</h1>
            <span className={STATUT_STYLE[s.statut] || 'badge-gray'}>{s.statut}</span>
            <span className={s.source === 'HORS_LIGNE' ? 'badge-orange' : 'badge-gray'}>
              {s.source === 'HORS_LIGNE' ? 'Hors-ligne' : 'En ligne'}
            </span>
          </div>
          <p className="text-muted-foreground text-sm truncate mt-0.5">{s.form_titre}</p>
        </div>
        {/* Boutons export */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => handleExport('pdf')}
            disabled={!!exporting}
            title="Télécharger en PDF"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <FileText size={13}/>
            {exporting === 'pdf' ? '…' : 'PDF'}
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={!!exporting}
            title="Télécharger en Excel"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet size={13}/>
            {exporting === 'excel' ? '…' : 'Excel'}
          </button>
        </div>
      </div>

      {/* Bandeau rejet */}
      {s.statut === 'REJETE' && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5"/>
          <div>
            <p className="font-semibold text-red-800 text-sm">Soumission rejetée</p>
            <p className="text-red-700 text-sm mt-0.5">
              {s.commentaire_rejet
                ? <><strong>Raison :</strong> {s.commentaire_rejet}</>
                : 'Aucune raison précisée.'}
            </p>
            {s.valideur_nom && (
              <p className="text-xs text-red-500 mt-1">
                Par {s.valideur_prenom} {s.valideur_nom}
                {s.valide_le ? ` · ${format(new Date(s.valide_le),'dd MMM yyyy',{locale:fr})}` : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Bandeau validation */}
      {s.statut === 'VALIDE' && s.valideur_nom && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle size={18} className="text-green-600 flex-shrink-0"/>
          <p className="text-green-800 text-sm">
            Validé par <strong>{s.valideur_prenom} {s.valideur_nom}</strong>
            {s.valide_le ? ` le ${format(new Date(s.valide_le),'dd MMM yyyy',{locale:fr})}` : ''}
          </p>
        </div>
      )}

      {/* Meta */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          ['Auteur',    `${s.auteur_prenom||''} ${s.auteur_nom||''}`.trim()],
          ['Rôle',      s.auteur_role],
          ['Date',      format(new Date(s.date_soumission),'dd MMM yyyy HH:mm',{locale:fr})],
          ['Équipement',s.equipement_nom||'—'],
          ['Module',    s.module],
          ['Fréquence', s.form_frequence||'—'],
        ].map(([k,v]) => (
          <div key={k} className="card p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{k}</p>
            <p className="font-medium text-sm mt-0.5">{v}</p>
          </div>
        ))}
      </div>

      {/* Entête */}
      {editEntete ? (
        <EnteteEditor entete={s.entete || s.formulaire_entete} onSave={handleSaveEntete} onCancel={() => setEditEntete(false)}/>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-base">Entête officielle</h3>
            <button onClick={() => setEditEntete(true)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline">
              <Pencil size={13}/> Modifier
            </button>
          </div>
          {(s.entete || s.formulaire_entete) ? (() => {
            const e = s.entete || s.formulaire_entete;
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  {[
                    ['Émetteur',     e.emetteur_nom,     e.emetteur_fonction,     e.emetteur_date],
                    ['Vérificateur', e.verificateur_nom, e.verificateur_fonction, e.verificateur_date],
                    ['Approbateur',  e.approbateur_nom,  e.approbateur_fonction,  e.approbateur_date],
                  ].map(([role, nom, fn, date]) => (
                    <div key={role} className="bg-muted/40 rounded-xl p-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{role}</p>
                      <p className="font-medium">{nom || '—'}</p>
                      {fn   && <p className="text-xs text-muted-foreground">{fn}</p>}
                      {date && <p className="text-xs text-muted-foreground">{format(new Date(date),'dd/MM/yyyy',{locale:fr})}</p>}
                    </div>
                  ))}
                </div>
                {e.destinataires && (
                  <div className="bg-muted/40 rounded-xl p-3 text-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Destinataires</p>
                    <p>{e.destinataires}</p>
                  </div>
                )}
              </div>
            );
          })() : (
            <p className="text-sm text-muted-foreground italic">
              Aucune entête renseignée.{' '}
              <button onClick={() => setEditEntete(true)} className="text-primary underline">Ajouter</button>
            </p>
          )}
        </div>
      )}

      {/* Valeurs par section */}
      {Object.entries(sections).map(([section, valeurs]) => (
        <div key={section} className="card">
          <h3 className="font-semibold mb-3">{section}</h3>
          <div className="divide-y divide-border">
            {valeurs.map(v => (
              <div key={v.id} className="flex items-start justify-between py-3 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{v.nom_champ}</p>
                  <p className="text-xs text-muted-foreground">{typeLabel[v.type_champ]||v.type_champ}</p>
                </div>
                <div className="text-right flex-shrink-0 text-sm">{renderVal(v)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Actions validation */}
      {canValider && s.statut === 'SOUMIS' && (
        <div className="card border-2 border-primary/10">
          <h3 className="font-semibold mb-3">Décision de validation</h3>
          <div className="flex gap-3">
            <button
              onClick={handleValider}
              disabled={validating}
              className="btn-primary flex items-center gap-2 flex-1 justify-center"
            >
              <CheckCircle size={16}/> Valider
            </button>
            <button
              onClick={() => setShowRejet(true)}
              disabled={validating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <XCircle size={16}/> Rejeter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}